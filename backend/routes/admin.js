import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readData, writeData, appendData } from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { publishEvent } from '../config/rabbitmq.js';
import { writeAuditLog } from '../services/auditLog.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * Get all transactions (admin view)
 * GET /api/admin/transactions
 */
router.get('/transactions', async (req, res, next) => {
  try {
    const transactions = await readData('transactions.json');
    const { status, userId, limit = 100 } = req.query;
    
    let filteredTransactions = transactions;
    
    if (status) {
      filteredTransactions = filteredTransactions.filter(t => 
        t.status?.toLowerCase() === status.toLowerCase()
      );
    }
    
    if (userId) {
      filteredTransactions = filteredTransactions.filter(t => 
        t.userId === userId
      );
    }
    
    filteredTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    filteredTransactions = filteredTransactions.slice(0, parseInt(limit));
    
    res.json({
      transactions: filteredTransactions,
      count: filteredTransactions.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get flagged/fraudulent transactions
 * GET /api/admin/fraud-cases
 */
router.get('/fraud-cases', async (req, res, next) => {
  try {
    const transactions = await readData('transactions.json');
    const fraudCases = transactions.filter(t => 
      t.fraudStatus?.classification === 'Fraudulent' || 
      t.fraudStatus?.classification === 'Suspicious' ||
      t.status === 'blocked' ||
      t.status === 'flagged'
    );
    
    fraudCases.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({
      fraudCases,
      count: fraudCases.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Approve a transaction (override fraud detection)
 * POST /api/admin/transactions/:id/approve
 */
router.post('/transactions/:id/approve', async (req, res, next) => {
  try {
    const { adminNotes } = req.body;
    const transactions = await readData('transactions.json');
    const transactionIndex = transactions.findIndex(t => t.transactionId === req.params.id);
    
    if (transactionIndex === -1) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    transactions[transactionIndex].status = 'approved';
    transactions[transactionIndex].adminNotes = adminNotes;
    transactions[transactionIndex].adminOverride = true;
    transactions[transactionIndex].updatedAt = new Date().toISOString();
    transactions[transactionIndex].updatedBy = req.user.userId;
    
    await writeData('transactions.json', transactions);
    
    // Log admin action
    await appendData('fraudLogs.json', {
      logId: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      transactionId: transactions[transactionIndex].transactionId,
      userId: transactions[transactionIndex].userId,
      action: 'admin_approve',
      adminId: req.user.userId,
      notes: adminNotes,
      timestamp: new Date().toISOString()
    });
    
    res.json(transactions[transactionIndex]);
  } catch (error) {
    next(error);
  }
});

/**
 * Block a transaction (override fraud detection)
 * POST /api/admin/transactions/:id/block
 */
router.post('/transactions/:id/block', async (req, res, next) => {
  try {
    const { adminNotes } = req.body;
    const transactions = await readData('transactions.json');
    const transactionIndex = transactions.findIndex(t => t.transactionId === req.params.id);
    
    if (transactionIndex === -1) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    transactions[transactionIndex].status = 'blocked';
    transactions[transactionIndex].adminNotes = adminNotes;
    transactions[transactionIndex].adminOverride = true;
    transactions[transactionIndex].updatedAt = new Date().toISOString();
    transactions[transactionIndex].updatedBy = req.user.userId;
    
    await writeData('transactions.json', transactions);
    
    // Log admin action
    await appendData('fraudLogs.json', {
      logId: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      transactionId: transactions[transactionIndex].transactionId,
      userId: transactions[transactionIndex].userId,
      action: 'admin_block',
      adminId: req.user.userId,
      notes: adminNotes,
      timestamp: new Date().toISOString()
    });
    
    res.json(transactions[transactionIndex]);
  } catch (error) {
    next(error);
  }
});

/**
 * Get fraud logs/audit trail
 * GET /api/admin/fraud-logs
 */
router.get('/fraud-logs', async (req, res, next) => {
  try {
    const logs = await readData('fraudLogs.json');
    const { transactionId, userId, limit = 100 } = req.query;
    
    let filteredLogs = logs;
    
    if (transactionId) {
      filteredLogs = filteredLogs.filter(l => l.transactionId === transactionId);
    }
    
    if (userId) {
      filteredLogs = filteredLogs.filter(l => l.userId === userId);
    }
    
    filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    filteredLogs = filteredLogs.slice(0, parseInt(limit));
    
    res.json({
      logs: filteredLogs,
      count: filteredLogs.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get all users (admin view)
 * GET /api/admin/users
 */
router.get('/users', async (req, res, next) => {
  try {
    const users = await readData('users.json');
    const usersWithoutPasswords = users.map(({ password, ...user }) => user);
    
    res.json({
      users: usersWithoutPasswords,
      count: usersWithoutPasswords.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Label transaction outcome for feedback/retraining loop
 * POST /api/admin/transactions/:id/label
 */
router.post('/transactions/:id/label', async (req, res, next) => {
  try {
    const { label, notes } = req.body;
    if (!['fraud', 'legit', 'needs_review'].includes(label)) {
      return res.status(400).json({ message: 'Invalid label value' });
    }

    const transactions = await readData('transactions.json');
    const tx = transactions.find((item) => item.transactionId === req.params.id);
    if (!tx) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const labelRecord = {
      labelId: uuidv4(),
      transactionId: tx.transactionId,
      userId: tx.userId,
      label,
      notes: notes || null,
      labeledBy: req.user.userId,
      timestamp: new Date().toISOString()
    };
    await appendData('labels.json', labelRecord);
    await writeAuditLog('transaction_labeled', req.user.userId, labelRecord);
    await publishEvent('fraud.label.updated', {
      eventId: uuidv4(),
      eventType: 'fraud.label.updated',
      timestamp: new Date().toISOString(),
      label: labelRecord
    });

    res.status(201).json(labelRecord);
  } catch (error) {
    next(error);
  }
});

router.get('/labels', async (_req, res, next) => {
  try {
    const labels = await readData('labels.json');
    res.json({ labels, count: labels.length });
  } catch (error) {
    next(error);
  }
});

router.get('/model-versions', async (_req, res, next) => {
  try {
    const models = await readData('modelVersions.json');
    res.json({ models, count: models.length });
  } catch (error) {
    next(error);
  }
});

router.post('/model-versions', async (req, res, next) => {
  try {
    const { modelVersion, metrics = {}, status = 'candidate' } = req.body;
    if (!modelVersion) {
      return res.status(400).json({ message: 'modelVersion is required' });
    }
    const record = {
      modelVersionId: uuidv4(),
      modelVersion,
      metrics,
      status,
      createdBy: req.user.userId,
      createdAt: new Date().toISOString()
    };
    await appendData('modelVersions.json', record);
    await writeAuditLog('model_version_created', req.user.userId, record);
    res.status(201).json(record);
  } catch (error) {
    next(error);
  }
});

router.post('/model-versions/:id/promote', async (req, res, next) => {
  try {
    const { id } = req.params;
    const versions = await readData('modelVersions.json');
    const index = versions.findIndex((item) => item.modelVersionId === id);
    if (index === -1) {
      return res.status(404).json({ message: 'Model version not found' });
    }

    versions.forEach((item) => {
      if (item.status === 'production') {
        item.status = 'archived';
      }
    });
    versions[index].status = 'production';
    versions[index].promotedBy = req.user.userId;
    versions[index].promotedAt = new Date().toISOString();
    await writeData('modelVersions.json', versions);
    await writeAuditLog('model_version_promoted', req.user.userId, versions[index]);
    res.json(versions[index]);
  } catch (error) {
    next(error);
  }
});

export default router;
