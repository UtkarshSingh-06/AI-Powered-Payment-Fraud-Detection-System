import express from 'express';
import { readData, writeData, appendData } from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

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

export default router;
