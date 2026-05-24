import express from 'express';
import { mapStripeEvent, verifyStripeSignature } from '../services/stripeEventMapper.js';
import { scoreAndPersistTransaction } from '../services/transactionScoring.js';
import { createFraudCase } from '../services/caseClient.js';
import { writeAuditLog } from '../services/auditLog.js';

const router = express.Router();

router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers['stripe-signature'];

  if (secret) {
    const rawBody = req.body?.toString?.('utf8') || '';
    if (!verifyStripeSignature(rawBody, signature, secret)) {
      return res.status(400).json({ message: 'Invalid Stripe signature' });
    }
  } else if (process.env.NODE_ENV === 'production') {
    return res.status(503).json({ message: 'STRIPE_WEBHOOK_SECRET not configured' });
  }

  let event;
  try {
    const raw = req.body?.toString?.('utf8') || '{}';
    event = JSON.parse(raw);
  } catch {
    return res.status(400).json({ message: 'Invalid JSON payload' });
  }

  const mapped = mapStripeEvent(event);
  if (!mapped) {
    return res.json({ received: true, handled: false, type: event.type });
  }

  if (mapped.type === 'dispute') {
    await createFraudCase({
      tenantId: mapped.tenantId,
      transactionId: mapped.transactionId,
      userId: 'system',
      title: `Stripe dispute: ${mapped.reason || 'unknown'}`,
      priority: 'critical'
    });
    await writeAuditLog('stripe_dispute', 'system', mapped);
    return res.json({ received: true, handled: true, type: event.type, action: 'case_opened' });
  }

  try {
    const result = await scoreAndPersistTransaction({
      userId: mapped.userId,
      tenantId: mapped.tenantId,
      body: { ...mapped.body, correlationId: mapped.correlationId },
      actorUserId: mapped.userId,
      source: mapped.source
    });

    await writeAuditLog('stripe_payment_scored', mapped.userId, {
      eventId: event.id,
      eventType: mapped.eventType,
      transactionId: result.transaction?.transactionId,
      duplicate: result.duplicate
    });

    return res.json({
      received: true,
      handled: true,
      type: event.type,
      transactionId: result.transaction?.transactionId,
      duplicate: result.duplicate
    });
  } catch (error) {
    console.error('Stripe webhook scoring failed:', error.message);
    return res.status(500).json({ message: 'Scoring failed', error: error.message });
  }
});

export default router;
