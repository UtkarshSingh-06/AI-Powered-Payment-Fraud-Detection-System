import express from 'express';
import { readData, writeData } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { requireAnalyst } from '../middleware/auth.js';
import { scoreAndPersistTransaction } from '../services/transactionScoring.js';
import { broadcastTransaction } from '../services/websocket.js';
import { filterByTenant, canAccessTenant } from '../utils/tenantFilter.js';

const router = express.Router();

/**
 * Get all transactions for the authenticated user
 * GET /api/transactions
 */
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const transactions = await readData('transactions.json');
    let userTransactions = filterByTenant(transactions, req.user);
    
    // Sort by timestamp (newest first)
    userTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Apply filters
    const { status, classification, startDate, endDate, limit = 100 } = req.query;
    
    if (status) {
      userTransactions = userTransactions.filter((t) =>
        (t.status || '').toLowerCase() === status.toLowerCase()
      );
    }

    if (classification) {
      userTransactions = userTransactions.filter((t) =>
        (t.fraudStatus?.classification || '').toLowerCase() === classification.toLowerCase()
      );
    }
    
    if (startDate) {
      userTransactions = userTransactions.filter(t => 
        new Date(t.timestamp) >= new Date(startDate)
      );
    }
    
    if (endDate) {
      userTransactions = userTransactions.filter(t => 
        new Date(t.timestamp) <= new Date(endDate)
      );
    }
    
    userTransactions = userTransactions.slice(0, parseInt(limit));
    
    res.json({
      transactions: userTransactions,
      count: userTransactions.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get a specific transaction
 * GET /api/transactions/:id
 */
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const transactions = await readData('transactions.json');
    const transaction = transactions.find(t => t.transactionId === req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    if (!canAccessTenant(req.user, transaction.tenantId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (req.user.role !== 'admin' && req.user.role !== 'analyst' && req.user.role !== 'super_admin' && transaction.userId !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(transaction);
  } catch (error) {
    next(error);
  }
});

/**
 * Explain transaction risk output for investigators
 * GET /api/transactions/:id/explain
 */
router.get('/:id/explain', authenticateToken, async (req, res, next) => {
  try {
    const transactions = await readData('transactions.json');
    const transaction = transactions.find((t) => t.transactionId === req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    if (!canAccessTenant(req.user, transaction.tenantId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (req.user.role !== 'admin' && req.user.role !== 'analyst' && req.user.role !== 'super_admin' && transaction.userId !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const inferenceUrl = process.env.INFERENCE_URL || 'http://localhost:8000';
    let liveExplain = null;
    try {
      const response = await fetch(`${inferenceUrl}/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction)
      });
      if (response.ok) liveExplain = await response.json();
    } catch {
      liveExplain = null;
    }

    res.json({
      transactionId: transaction.transactionId,
      riskScore: transaction.fraudStatus?.score ?? 0,
      decision: transaction.riskDecision || 'allow',
      modelVersion: transaction.fraudStatus?.modelVersion || 'legacy-rules',
      explanations: liveExplain?.explanations || transaction.fraudStatus?.explanations || [],
      shap: liveExplain?.shap || [],
      lime: liveExplain?.lime || [],
      ruleHits: transaction.fraudStatus?.ruleHits || [],
      graphRisk: liveExplain?.graphRisk || null
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create a new transaction
 * POST /api/transactions
 */
router.post('/', authenticateToken, requirePermission('transactions:write'), async (req, res, next) => {
  try {
    const {
      amount,
      merchantName,
      merchantCategory,
      paymentMethod,
      location,
      country,
      deviceId,
      timestamp,
      clientFingerprint,
      ipAddress
    } = req.body;

    const numericAmount = Number(amount);
    const allowedPaymentMethods = new Set([
      'Credit Card',
      'Debit Card',
      'Digital Wallet',
      'Bank Transfer',
      'Cryptocurrency',
      'Wire Transfer'
    ]);

    if (!amount || !merchantName || !merchantCategory) {
      return res.status(400).json({ 
        message: 'Amount, merchant name, and merchant category are required' 
      });
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 1000000) {
      return res.status(400).json({
        message: 'Amount must be a valid number between 0.01 and 1,000,000'
      });
    }

    if (merchantName.length < 2 || merchantName.length > 80) {
      return res.status(400).json({
        message: 'Merchant name must be between 2 and 80 characters'
      });
    }

    if (merchantCategory.length < 2 || merchantCategory.length > 60) {
      return res.status(400).json({
        message: 'Merchant category must be between 2 and 60 characters'
      });
    }
    
    if (paymentMethod && !allowedPaymentMethods.has(paymentMethod)) {
      return res.status(400).json({
        message: 'Invalid payment method'
      });
    }

    const result = await scoreAndPersistTransaction({
      userId: req.user.userId,
      tenantId: req.user.tenantId || req.headers['x-tenant-id'] || 'default',
      body: req.body,
      userAgent: req.headers['user-agent'],
      clientIp: req.ip,
      actorUserId: req.user.userId,
      source: 'api'
    });

    if (result.duplicate) {
      return res.status(200).json(result.transaction);
    }

    res.status(201).json(result.transaction);
  } catch (error) {
    next(error);
  }
});

/**
 * Update transaction status (for admin)
 * PATCH /api/transactions/:id/status
 */
router.patch('/:id/status', authenticateToken, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const { status, adminNotes } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }
    
    const transactions = await readData('transactions.json');
    const transactionIndex = transactions.findIndex(t => t.transactionId === req.params.id);
    
    if (transactionIndex === -1) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    transactions[transactionIndex].status = status;
    transactions[transactionIndex].adminNotes = adminNotes;
    transactions[transactionIndex].updatedAt = new Date().toISOString();
    transactions[transactionIndex].updatedBy = req.user.userId;
    
    await writeData('transactions.json', transactions);
    
    // Broadcast update
    broadcastTransaction(transactions[transactionIndex]);
    
    res.json(transactions[transactionIndex]);
  } catch (error) {
    next(error);
  }
});

export default router;
