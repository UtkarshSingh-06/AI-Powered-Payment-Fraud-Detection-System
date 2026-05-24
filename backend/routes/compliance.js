import express from 'express';
import { readData, writeData } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { writeAuditLog } from '../services/auditLog.js';
import { encryptField } from '../services/encryption.js';

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
      user: user ? { userId: user.userId, email: user.email, name: user.name, tenantId: user.tenantId } : null,
      transactions: userTransactions
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/gdpr/erase', authenticateToken, async (req, res, next) => {
  try {
    const targetUserId = req.user.role === 'admin' || req.user.role === 'super_admin'
      ? req.body.userId || req.user.userId
      : req.user.userId;

    const [users, transactions, logs, recommendations] = await Promise.all([
      readData('users.json'),
      readData('transactions.json'),
      readData('fraudLogs.json'),
      readData('recommendations.json')
    ]);

    const anonymizedEmail = encryptField(`erased_${targetUserId}@anonymized.local`);
    const updatedUsers = users.map((u) =>
      u.userId === targetUserId
        ? { ...u, email: anonymizedEmail, name: 'Erased User', password: 'ERASED', erasedAt: new Date().toISOString() }
        : u
    );

    const updatedTransactions = transactions.filter((t) => t.userId !== targetUserId);
    const updatedLogs = logs.filter((l) => l.userId !== targetUserId);
    const updatedRecs = recommendations.filter((r) => r.userId !== targetUserId);

    await Promise.all([
      writeData('users.json', updatedUsers),
      writeData('transactions.json', updatedTransactions),
      writeData('fraudLogs.json', updatedLogs),
      writeData('recommendations.json', updatedRecs)
    ]);

    await writeAuditLog('gdpr_erasure', req.user.userId, { targetUserId, requestId: `gdpr_${Date.now()}` });

    res.json({
      status: 'completed',
      message: 'Personal data erased or anonymized per GDPR request',
      targetUserId,
      requestId: `gdpr_${Date.now()}`
    });
  } catch (error) {
    next(error);
  }
});

router.get('/pci/report', authenticateToken, (_req, res) => {
  res.json({
    pciScope: 'SAQ-A-EP',
    cardholderDataStored: false,
    tokenizationEnabled: Boolean(process.env.PAYMENT_TOKEN_PROVIDER),
    encryptionInTransit: process.env.NODE_ENV === 'production' ? 'TLS 1.2+' : 'TLS recommended in production',
    encryptionAtRest: process.env.FIELD_ENCRYPTION_KEY ? 'AES-256-GCM field encryption enabled' : 'Configure FIELD_ENCRYPTION_KEY',
    note: 'No raw PAN/CVV is stored in this application'
  });
});

export default router;
