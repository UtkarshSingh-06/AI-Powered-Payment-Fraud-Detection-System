import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = express.Router();

const PLANS = {
  starter: { priceId: process.env.STRIPE_PRICE_STARTER || 'price_starter', monthlyTxnLimit: 10000, amount: 9900 },
  pro: { priceId: process.env.STRIPE_PRICE_PRO || 'price_pro', monthlyTxnLimit: 100000, amount: 49900 },
  enterprise: {
    priceId: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise',
    monthlyTxnLimit: 10000000,
    amount: null
  }
};

router.get('/plans', authenticateToken, (_req, res) => {
  res.json({ plans: PLANS, currency: 'usd' });
});

router.post('/subscribe', authenticateToken, requirePermission('billing:write'), async (req, res, next) => {
  try {
    const { plan = 'starter' } = req.body;
    if (!PLANS[plan]) {
      return res.status(400).json({ message: 'Invalid plan' });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return res.json({
        status: 'demo_mode',
        plan,
        message: 'Set STRIPE_SECRET_KEY for live checkout',
        stripeCheckoutUrl: process.env.STRIPE_CHECKOUT_URL || null
      });
    }

    const params = new URLSearchParams({
      mode: 'subscription',
      'line_items[0][price]': PLANS[plan].priceId,
      'line_items[0][quantity]': '1',
      success_url: process.env.STRIPE_SUCCESS_URL || 'http://localhost:3002/app/dashboard?billing=success',
      cancel_url: process.env.STRIPE_CANCEL_URL || 'http://localhost:3002/app/dashboard?billing=cancel',
      'metadata[tenantId]': req.user.tenantId || 'default',
      'metadata[userId]': req.user.userId
    });

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    const session = await response.json();
    if (!response.ok) {
      return res.status(502).json({ message: session.error?.message || 'Stripe checkout failed' });
    }

    res.json({ status: 'checkout_created', plan, stripeCheckoutUrl: session.url, sessionId: session.id });
  } catch (error) {
    next(error);
  }
});

export default router;
