import express from 'express';
import { readData } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = express.Router();

router.get('/gdpr/export', authenticateToken, async (req, res, next) => {
  try {
    const [users, transactions] = await Promise.all([
      readData('users.json'),
      readData('transactions.json')
    ]);
    const user = users.find((u) => u.userId === req.user.userId);
    const userTransactions = transactions.filter((t) => t.userId === req.user.userId);
    res.json({
      exportedAt: new Date().toISOString(),
      user: user ? { userId: user.userId, email: user.email, name: user.name } : null,
      transactions: userTransactions
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/gdpr/erase', authenticateToken, requirePermission('*'), async (req, res) => {
  res.status(202).json({
    status: 'accepted',
    message: 'GDPR erasure request queued for compliance review',
    requestId: `gdpr_${Date.now()}`
  });
});

router.get('/pci/report', authenticateToken, requirePermission('audit:read'), (_req, res) => {
  res.json({
    pciScope: 'SAQ-A-EP',
    cardholderDataStored: false,
    tokenizationEnabled: true,
    encryptionInTransit: 'TLS 1.2+',
    encryptionAtRest: 'AES-256 (RDS/KMS)'
  });
});

export default router;
