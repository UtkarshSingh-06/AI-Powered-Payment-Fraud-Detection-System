import { v4 as uuidv4 } from 'uuid';
import { readData, writeData, appendData } from '../config/database.js';
import { publishPlatformEvent } from './eventBus.js';
import { validateScoringRequest } from '@fraudshield/contracts';
import { buildDeviceFingerprint } from './deviceFingerprint.js';
import { enrichGeoIntelligence } from './geoIntelligence.js';
import { analyzeFraudRisk } from './fraudDetection.js';
import { broadcastTransaction, broadcastFraudAlert } from './websocket.js';
import { buildFeatureVector } from './featureStore.js';
import { scoreTransaction } from './inferenceClient.js';
import { applyRiskRules } from './riskEngine.js';
import { writeAuditLog } from './auditLog.js';
import { screenTransactionAml } from './amlClient.js';
import { createFraudCase } from './caseClient.js';
import { encryptField } from './encryption.js';

/**
 * Core transaction scoring pipeline — used by REST API and Kafka consumer.
 */
export async function scoreAndPersistTransaction({
  userId,
  tenantId = 'default',
  body,
  userAgent,
  clientIp,
  actorUserId,
  source = 'api'
}) {
  const {
    amount,
    currency = 'USD',
    merchantName,
    merchantCategory,
    paymentMethod,
    location,
    country,
    deviceId,
    timestamp,
    clientFingerprint,
    ipAddress,
    correlationId: incomingCorrelationId,
    transactionId: existingTransactionId
  } = body;

  const numericAmount = Number(amount);
  if (!amount || !merchantName || !merchantCategory) {
    const error = new Error('Amount, merchant name, and merchant category are required');
    error.status = 400;
    throw error;
  }

  if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 1000000) {
    const error = new Error('Amount must be a valid number between 0.01 and 1,000,000');
    error.status = 400;
    throw error;
  }

  const transactions = await readData('transactions.json');
  const userHistory = transactions.filter((t) => t.userId === userId);

  const correlationId = incomingCorrelationId || uuidv4();
  if (incomingCorrelationId) {
    const duplicate = transactions.find((t) => t.correlationId === correlationId);
    if (duplicate) {
      return { transaction: duplicate, duplicate: true };
    }
  }

  const deviceFingerprint = buildDeviceFingerprint({
    userAgent,
    deviceId,
    clientFingerprint,
    ipAddress: ipAddress || clientIp
  });
  const geoIntel = enrichGeoIntelligence({
    ipAddress: ipAddress || clientIp,
    country,
    location
  });

  const transaction = {
    transactionId: existingTransactionId || uuidv4(),
    correlationId,
    tenantId,
    userId,
    amount: numericAmount,
    currency,
    merchantName,
    merchantCategory,
    paymentMethod: paymentMethod || 'Credit Card',
    location: geoIntel.location || location || country || 'Unknown',
    country: geoIntel.country || country || 'Unknown',
    deviceId: deviceId || deviceFingerprint.deviceId,
    deviceFingerprint,
    geoIntelligence: geoIntel,
    ipAddress: ipAddress || clientIp,
    timestamp: timestamp || new Date().toISOString(),
    status: 'pending',
    ingestSource: source,
    createdAt: new Date().toISOString()
  };

  if (process.env.FIELD_ENCRYPTION_KEY && clientFingerprint) {
    transaction.encryptedFingerprint = encryptField(String(clientFingerprint));
  }

  const scoringValidation = validateScoringRequest({
    transactionId: transaction.transactionId,
    userId: transaction.userId,
    amount: transaction.amount,
    merchantCategory: transaction.merchantCategory,
    merchantName: transaction.merchantName,
    timestamp: transaction.timestamp,
    deviceId: transaction.deviceId,
    featureVector: {}
  });
  if (!scoringValidation.valid) {
    const error = new Error(scoringValidation.errors.join('; '));
    error.status = 400;
    throw error;
  }

  const amlResult = await screenTransactionAml({
    merchantName,
    userId,
    tenantId
  });
  transaction.amlScreening = amlResult;

  const featureVector = await buildFeatureVector(transaction, userHistory);
  const scoringPayload = { ...transaction, featureVector };
  const inferenceResult = await scoreTransaction(scoringPayload);
  const fallbackResult = analyzeFraudRisk(transaction, userHistory);
  let effectiveScore = inferenceResult?.riskScore ?? fallbackResult.score;
  let baseClassification = inferenceResult?.classification ?? fallbackResult.classification;
  let baseDecision =
    inferenceResult?.decision ||
    (baseClassification === 'Fraudulent'
      ? 'block'
      : baseClassification === 'Suspicious'
        ? 'challenge_otp'
        : 'allow');

  if (amlResult.status === 'match') {
    effectiveScore = Math.max(effectiveScore, 85);
    baseClassification = 'Fraudulent';
    baseDecision = 'block';
  }

  const ruleDecision = applyRiskRules(
    transaction,
    { riskScore: effectiveScore, decision: baseDecision },
    featureVector
  );

  const fraudAnalysis = {
    score: effectiveScore,
    classification: baseClassification,
    reasons: [...(fallbackResult.reasons || []), ...(amlResult.hits?.length ? ['AML sanctions match'] : [])],
    modelVersion: inferenceResult?.modelVersion || 'legacy-rules',
    models: inferenceResult?.models || [],
    explanations: inferenceResult?.explanations || [],
    ruleHits: ruleDecision.hits,
    amlHits: amlResult.hits || []
  };
  transaction.fraudStatus = fraudAnalysis;
  transaction.riskDecision = ruleDecision.decision;

  if (ruleDecision.decision === 'block') {
    transaction.status = 'blocked';
  } else if (ruleDecision.decision === 'challenge_otp') {
    transaction.status = 'flagged';
  } else {
    transaction.status = 'approved';
  }

  transactions.push(transaction);
  await writeData('transactions.json', transactions);

  await appendData('fraudLogs.json', {
    logId: uuidv4(),
    transactionId: transaction.transactionId,
    userId: transaction.userId,
    tenantId,
    riskScore: fraudAnalysis.score,
    classification: fraudAnalysis.classification,
    reasons: fraudAnalysis.reasons,
    timestamp: new Date().toISOString(),
    action: transaction.status
  });

  await publishPlatformEvent('transaction.ingested', {
    eventId: uuidv4(),
    eventType: 'transaction.ingested',
    timestamp: new Date().toISOString(),
    transaction
  });
  await publishPlatformEvent('fraud.decision.made', {
    eventId: uuidv4(),
    eventType: 'fraud.decision.made',
    timestamp: new Date().toISOString(),
    transactionId: transaction.transactionId,
    tenantId,
    decision: transaction.riskDecision,
    riskScore: fraudAnalysis.score,
    modelVersion: fraudAnalysis.modelVersion,
    ruleHits: fraudAnalysis.ruleHits || []
  });

  if (actorUserId) {
    await writeAuditLog('transaction_scored', actorUserId, {
      transactionId: transaction.transactionId,
      status: transaction.status,
      riskDecision: transaction.riskDecision,
      riskScore: fraudAnalysis.score,
      source
    });
  }

  if (fraudAnalysis.score >= 40) {
    await appendData('alerts.json', {
      alertId: uuidv4(),
      tenantId,
      transactionId: transaction.transactionId,
      userId: transaction.userId,
      riskScore: fraudAnalysis.score,
      classification: fraudAnalysis.classification,
      status: 'open',
      message: `Risk alert: ${transaction.merchantName} scored ${fraudAnalysis.score}`,
      createdAt: new Date().toISOString()
    });
  }

  if (fraudAnalysis.score >= 70 || transaction.status === 'flagged' || transaction.status === 'blocked') {
    await createFraudCase({
      tenantId,
      transactionId: transaction.transactionId,
      userId: actorUserId || transaction.userId,
      title: `Investigation: ${transaction.merchantName} (${fraudAnalysis.score})`,
      priority: fraudAnalysis.score >= 85 ? 'critical' : 'high'
    });
  }

  broadcastTransaction(transaction);
  if (transaction.status === 'blocked' || transaction.status === 'flagged') {
    broadcastFraudAlert(transaction);
  }

  return { transaction, duplicate: false };
}
