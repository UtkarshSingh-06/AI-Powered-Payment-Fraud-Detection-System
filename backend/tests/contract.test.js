import { describe, it, expect } from 'vitest';
import {
  validateScoringRequest,
  validateFraudDecisionEvent
} from '@fraudshield/contracts';

describe('contract validators', () => {
  it('validates scoring request shape', () => {
    const result = validateScoringRequest({
      transactionId: 'tx-1',
      userId: 'u-1',
      amount: 50,
      merchantCategory: 'Food',
      timestamp: new Date().toISOString(),
      deviceId: 'd-1'
    });
    expect(result.valid).toBe(true);
  });

  it('rejects invalid fraud decision event', () => {
    const result = validateFraudDecisionEvent({
      eventId: 'e1',
      eventType: 'fraud.decision.made',
      timestamp: new Date().toISOString(),
      transactionId: 'tx-1',
      decision: 'invalid',
      riskScore: 10
    });
    expect(result.valid).toBe(false);
  });
});
