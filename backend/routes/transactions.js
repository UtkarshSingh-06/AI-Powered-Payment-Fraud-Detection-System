import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readData, writeData, appendData } from '../config/database.js';
import { publishEvent } from '../config/rabbitmq.js';
import { authenticateToken } from '../middleware/auth.js';
import { analyzeFraudRisk } from '../services/fraudDetection.js';
import { broadcastTransaction, broadcastFraudAlert } from '../services/websocket.js';
import { buildFeatureVector } from '../services/featureStore.js';
import { scoreTransaction } from '../services/inferenceClient.js';
import { applyRiskRules } from '../services/riskEngine.js';
import { writeAuditLog } from '../services/auditLog.js';

const router = express.Router();

/**
 * Get all transactions for the authenticated user
 * GET /api/transactions
 */
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const transactions = await readData('transactions.json');
    let userTransactions = transactions.filter(t => t.userId === req.user.userId);
    
    // If admin, return all transactions
    if (req.user.role === 'admin') {
      userTransactions = transactions;
    }
    
    // Sort by timestamp (newest first)
    userTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Apply filters
    const { status, classification, startDate, endDate, limit = 100 } = req.query;
    
    if (status) {
      userTransactions = userTransactions.filter((t) =>
        (t.status || '').toLowerCase() === status.toLowerCase()
      );
    }

    if (classification) {
      userTransactions = userTransactions.filter((t) =>
        (t.fraudStatus?.classification || '').toLowerCase() === classification.toLowerCase()
      );
    }
    
    if (startDate) {
      userTransactions = userTransactions.filter(t => 
        new Date(t.timestamp) >= new Date(startDate)
      );
    }
    
    if (endDate) {
      userTransactions = userTransactions.filter(t => 
        new Date(t.timestamp) <= new Date(endDate)
      );
    }
    
    userTransactions = userTransactions.slice(0, parseInt(limit));
    
    res.json({
      transactions: userTransactions,
      count: userTransactions.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get a specific transaction
 * GET /api/transactions/:id
 */
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const transactions = await readData('transactions.json');
    const transaction = transactions.find(t => t.transactionId === req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    // Check authorization
    if (req.user.role !== 'admin' && transaction.userId !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(transaction);
  } catch (error) {
    next(error);
  }
});

/**
 * Explain transaction risk output for investigators
 * GET /api/transactions/:id/explain
 */
router.get('/:id/explain', authenticateToken, async (req, res, next) => {
  try {
    const transactions = await readData('transactions.json');
    const transaction = transactions.find((t) => t.transactionId === req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    if (req.user.role !== 'admin' && transaction.userId !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      transactionId: transaction.transactionId,
      riskScore: transaction.fraudStatus?.score ?? 0,
      decision: transaction.riskDecision || 'allow',
      modelVersion: transaction.fraudStatus?.modelVersion || 'legacy-rules',
      explanations: transaction.fraudStatus?.explanations || [],
      ruleHits: transaction.fraudStatus?.ruleHits || []
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create a new transaction
 * POST /api/transactions
 */
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const {
      amount,
      currency = 'USD',
      merchantName,
      merchantCategory,
      paymentMethod,
      location,
      country,
      deviceId,
      timestamp
    } = req.body;

    const numericAmount = Number(amount);
    const allowedPaymentMethods = new Set([
      'Credit Card',
      'Debit Card',
      'Digital Wallet',
      'Bank Transfer',
      'Cryptocurrency',
      'Wire Transfer'
    ]);

    if (!amount || !merchantName || !merchantCategory) {
      return res.status(400).json({ 
        message: 'Amount, merchant name, and merchant category are required' 
      });
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 1000000) {
      return res.status(400).json({
        message: 'Amount must be a valid number between 0.01 and 1,000,000'
      });
    }

    if (merchantName.length < 2 || merchantName.length > 80) {
      return res.status(400).json({
        message: 'Merchant name must be between 2 and 80 characters'
      });
    }

    if (merchantCategory.length < 2 || merchantCategory.length > 60) {
      return res.status(400).json({
        message: 'Merchant category must be between 2 and 60 characters'
      });
    }

    if (paymentMethod && !allowedPaymentMethods.has(paymentMethod)) {
      return res.status(400).json({
        message: 'Invalid payment method'
      });
    }
    
    const transactions = await readData('transactions.json');
    
    // Get user's transaction history for fraud detection
    const userHistory = transactions.filter(t => t.userId === req.user.userId);
    
    // Create transaction object
    const transaction = {
      transactionId: uuidv4(),
      userId: req.user.userId,
      amount: numericAmount,
      currency,
      merchantName,
      merchantCategory,
      paymentMethod: paymentMethod || 'Credit Card',
      location: location || country || 'Unknown',
      country: country || 'Unknown',
      deviceId: deviceId || `device_${req.user.userId}`,
      timestamp: timestamp || new Date().toISOString(),
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    const featureVector = await buildFeatureVector(transaction, userHistory);
    const scoringPayload = { ...transaction, featureVector };
    const inferenceResult = await scoreTransaction(scoringPayload);
    const fallbackResult = analyzeFraudRisk(transaction, userHistory);
    const effectiveScore = inferenceResult?.riskScore ?? fallbackResult.score;
    const baseClassification = inferenceResult?.classification ?? fallbackResult.classification;
    const baseDecision = inferenceResult?.decision || (baseClassification === 'Fraudulent'
      ? 'block'
      : baseClassification === 'Suspicious'
        ? 'challenge_otp'
        : 'allow');
    const ruleDecision = applyRiskRules(transaction, { riskScore: effectiveScore, decision: baseDecision }, featureVector);

    const fraudAnalysis = {
      score: effectiveScore,
      classification: baseClassification,
      reasons: fallbackResult.reasons,
      modelVersion: inferenceResult?.modelVersion || 'legacy-rules',
      models: inferenceResult?.models || [],
      explanations: inferenceResult?.explanations || [],
      ruleHits: ruleDecision.hits
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
    
    // Save transaction
    transactions.push(transaction);
    await writeData('transactions.json', transactions);
    
    // Log fraud decision
    await appendData('fraudLogs.json', {
      logId: uuidv4(),
      transactionId: transaction.transactionId,
      userId: transaction.userId,
      riskScore: fraudAnalysis.score,
      classification: fraudAnalysis.classification,
      reasons: fraudAnalysis.reasons,
      timestamp: new Date().toISOString(),
      action: transaction.status
    });
    
    await publishEvent('transaction.ingested', {
      eventId: uuidv4(),
      eventType: 'transaction.ingested',
      timestamp: new Date().toISOString(),
      transaction
    });
    await publishEvent('fraud.decision.made', {
      eventId: uuidv4(),
      eventType: 'fraud.decision.made',
      timestamp: new Date().toISOString(),
      transactionId: transaction.transactionId,
      decision: transaction.riskDecision,
      riskScore: fraudAnalysis.score,
      modelVersion: fraudAnalysis.modelVersion,
      ruleHits: fraudAnalysis.ruleHits
    });
    await writeAuditLog('transaction_scored', req.user.userId, {
      transactionId: transaction.transactionId,
      status: transaction.status,
      riskDecision: transaction.riskDecision,
      riskScore: fraudAnalysis.score
    });

    // Broadcast real-time updates
    broadcastTransaction(transaction);
    if (transaction.status === 'blocked' || transaction.status === 'flagged') {
      broadcastFraudAlert(transaction);
    }
    
    res.status(201).json(transaction);
  } catch (error) {
    next(error);
  }
});

/**
 * Update transaction status (for admin)
 * PATCH /api/transactions/:id/status
 */
router.patch('/:id/status', authenticateToken, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const { status, adminNotes } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }
    
    const transactions = await readData('transactions.json');
    const transactionIndex = transactions.findIndex(t => t.transactionId === req.params.id);
    
    if (transactionIndex === -1) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    transactions[transactionIndex].status = status;
    transactions[transactionIndex].adminNotes = adminNotes;
    transactions[transactionIndex].updatedAt = new Date().toISOString();
    transactions[transactionIndex].updatedBy = req.user.userId;
    
    await writeData('transactions.json', transactions);
    
    // Broadcast update
    broadcastTransaction(transactions[transactionIndex]);
    
    res.json(transactions[transactionIndex]);
  } catch (error) {
    next(error);
  }
});

export default router;
