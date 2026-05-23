import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = express.Router();

const PLANS = {
  starter: { priceId: 'price_starter', monthlyTxnLimit: 10000 },
  pro: { priceId: 'price_pro', monthlyTxnLimit: 100000 },
  enterprise: { priceId: 'price_enterprise', monthlyTxnLimit: 10000000 }
};

router.get('/plans', authenticateToken, (_req, res) => {
  res.json({ plans: PLANS });
});

router.post('/subscribe', authenticateToken, requirePermission('*'), (req, res) => {
  const { plan = 'starter' } = req.body;
  if (!PLANS[plan]) {
    return res.status(400).json({ message: 'Invalid plan' });
  }
  res.json({
    status: 'checkout_created',
    plan,
    stripeCheckoutUrl: process.env.STRIPE_CHECKOUT_URL || null,
    message: 'Configure STRIPE_SECRET_KEY for live billing'
  });
});

export default router;
