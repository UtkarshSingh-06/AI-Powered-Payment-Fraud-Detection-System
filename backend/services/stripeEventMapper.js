/**
 * Maps Stripe webhook events to FraudShield scoring payloads.
 */
import crypto from 'crypto';

export function mapStripeEvent(event) {
  const type = event.type;
  const obj = event.data?.object || {};

  if (type === 'payment_intent.succeeded' || type === 'payment_intent.payment_failed') {
    const metadata = obj.metadata || {};
    const tenantId = metadata.tenantId || process.env.DEFAULT_TENANT_ID || 'default';
    const userId = metadata.userId || metadata.customerId || `stripe_${obj.customer || 'unknown'}`;

    return {
      correlationId: event.id,
      tenantId,
      userId,
      body: {
        amount: (obj.amount || 0) / 100,
        currency: (obj.currency || 'usd').toUpperCase(),
        merchantName: metadata.merchantName || 'Stripe Payment',
        merchantCategory: metadata.merchantCategory || 'Online Shopping',
        paymentMethod: mapPaymentMethod(obj.payment_method_types),
        location: metadata.location || 'Unknown',
        country: metadata.country || 'US',
        deviceId: metadata.deviceId,
        clientFingerprint: metadata.clientFingerprint,
        ipAddress: metadata.ipAddress,
        transactionId: metadata.transactionId || obj.id,
        stripePaymentIntentId: obj.id,
        stripeCustomerId: obj.customer || null
      },
      source: 'stripe_webhook',
      eventType: type
    };
  }

  if (type === 'charge.dispute.created') {
    return {
      type: 'dispute',
      disputeId: obj.id,
      chargeId: obj.charge,
      amount: (obj.amount || 0) / 100,
      reason: obj.reason,
      tenantId: obj.metadata?.tenantId || process.env.DEFAULT_TENANT_ID || 'default',
      transactionId: obj.metadata?.transactionId || obj.charge
    };
  }

  return null;
}

function mapPaymentMethod(types = []) {
  if (types.includes('card')) return 'Credit Card';
  if (types.includes('us_bank_account')) return 'Bank Transfer';
  return 'Digital Wallet';
}

export function verifyStripeSignature(rawBody, signatureHeader, secret) {
  if (!secret || !signatureHeader || !rawBody) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((part) => {
      const [key, value] = part.split('=');
      return [key, value];
    })
  );

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const tolerance = Number(process.env.STRIPE_WEBHOOK_TOLERANCE_SEC || 300);
  const age = Math.floor(Date.now() / 1000) - Number(timestamp);
  if (Math.abs(age) > tolerance) return false;

  const payload = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return expected === signature;
  }
}
