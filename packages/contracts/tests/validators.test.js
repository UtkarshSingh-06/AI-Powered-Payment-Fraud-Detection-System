import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateScoringRequest,
  validateTransactionIngestedEvent,
  validateFraudDecisionEvent
} from '../index.js';

test('validateScoringRequest accepts valid payload', () => {
  const result = validateScoringRequest({
    transactionId: 'tx-1',
    userId: 'user-1',
    amount: 100,
    merchantCategory: 'Retail',
    timestamp: '2026-01-01T00:00:00.000Z',
    deviceId: 'device-1'
  });
  assert.equal(result.valid, true);
});

test('validateTransactionIngestedEvent rejects missing fields', () => {
  const result = validateTransactionIngestedEvent({
    eventType: 'transaction.ingested'
  });
  assert.equal(result.valid, false);
});

test('validateFraudDecisionEvent accepts valid event', () => {
  const result = validateFraudDecisionEvent({
    eventId: 'evt-1',
    eventType: 'fraud.decision.made',
    timestamp: '2026-01-01T00:00:00.000Z',
    transactionId: 'tx-1',
    decision: 'allow',
    riskScore: 12,
    modelVersion: 'v1'
  });
  assert.equal(result.valid, true);
});
