import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readData, writeData, appendData } from '../config/database.js';
import { authenticateToken, requireAdminOrOwner } from '../middleware/auth.js';
import { analyzeFraudRisk } from '../services/fraudDetection.js';
import { broadcastTransaction, broadcastFraudAlert } from '../services/websocket.js';

const router = express.Router();

/**
 * Get all transactions for the authenticated user
 * GET /api/transactions
 */
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const transactions = await readData('transactions.json');
    let userTransactions = transactions.filter(t => t.userId === req.user.userId);
    
    // If admin, return all transactions
    if (req.user.role === 'admin') {
      userTransactions = transactions;
    }
    
    // Sort by timestamp (newest first)
    userTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Apply filters
    const { status, startDate, endDate, limit = 100 } = req.query;
    
    if (status) {
      userTransactions = userTransactions.filter(t => 
        t.fraudStatus?.classification?.toLowerCase() === status.toLowerCase()
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
    
    // Check authorization
    if (req.user.role !== 'admin' && transaction.userId !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(transaction);
  } catch (error) {
    next(error);
  }
});

/**
 * Create a new transaction
 * POST /api/transactions
 */
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const {
      amount,
      currency = 'USD',
      merchantName,
      merchantCategory,
      paymentMethod,
      location,
      country,
      deviceId,
      timestamp
    } = req.body;
    
    if (!amount || !merchantName || !merchantCategory) {
      return res.status(400).json({ 
        message: 'Amount, merchant name, and merchant category are required' 
      });
    }
    
    const transactions = await readData('transactions.json');
    
    // Get user's transaction history for fraud detection
    const userHistory = transactions.filter(t => t.userId === req.user.userId);
    
    // Create transaction object
    const transaction = {
      transactionId: uuidv4(),
      userId: req.user.userId,
      amount: parseFloat(amount),
      currency,
      merchantName,
      merchantCategory,
      paymentMethod: paymentMethod || 'Credit Card',
      location: location || country || 'Unknown',
      country: country || 'Unknown',
      deviceId: deviceId || `device_${req.user.userId}`,
      timestamp: timestamp || new Date().toISOString(),
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    // Analyze fraud risk
    const fraudAnalysis = analyzeFraudRisk(transaction, userHistory);
    transaction.fraudStatus = fraudAnalysis;
    
    // Set status based on fraud classification
    if (fraudAnalysis.classification === 'Fraudulent') {
      transaction.status = 'blocked';
    } else if (fraudAnalysis.classification === 'Suspicious') {
      transaction.status = 'flagged';
    } else {
      transaction.status = 'approved';
    }
    
    // Save transaction
    transactions.push(transaction);
    await writeData('transactions.json', transactions);
    
    // Log fraud decision
    await appendData('fraudLogs.json', {
      logId: uuidv4(),
      transactionId: transaction.transactionId,
      userId: transaction.userId,
      riskScore: fraudAnalysis.score,
      classification: fraudAnalysis.classification,
      reasons: fraudAnalysis.reasons,
      timestamp: new Date().toISOString(),
      action: transaction.status
    });
    
    // Broadcast real-time updates
    broadcastTransaction(transaction);
    if (transaction.status === 'blocked' || transaction.status === 'flagged') {
      broadcastFraudAlert(transaction);
    }
    
    res.status(201).json(transaction);
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
