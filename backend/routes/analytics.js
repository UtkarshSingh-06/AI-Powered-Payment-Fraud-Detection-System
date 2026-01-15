import express from 'express';
import { readData } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { getFraudSummary } from '../services/fraudDetection.js';

const router = express.Router();

/**
 * Get analytics dashboard data
 * GET /api/analytics/dashboard
 */
router.get('/dashboard', authenticateToken, async (req, res, next) => {
  try {
    const transactions = await readData('transactions.json');
    let userTransactions = transactions;
    
    // Filter by user if not admin
    if (req.user.role !== 'admin') {
      userTransactions = transactions.filter(t => t.userId === req.user.userId);
    }
    
    // Get date range filters
    const { startDate, endDate } = req.query;
    let filteredTransactions = userTransactions;
    
    if (startDate || endDate) {
      filteredTransactions = userTransactions.filter(t => {
        const tDate = new Date(t.timestamp);
        if (startDate && tDate < new Date(startDate)) return false;
        if (endDate && tDate > new Date(endDate)) return false;
        return true;
      });
    }
    
    // Fraud summary
    const summary = getFraudSummary(filteredTransactions);
    
    // Time series data (fraud rate over time)
    const timeSeriesData = getTimeSeriesData(filteredTransactions);
    
    // High-risk regions
    const highRiskRegions = getHighRiskRegions(filteredTransactions);
    
    // High-risk users (admin only)
    let highRiskUsers = [];
    if (req.user.role === 'admin') {
      highRiskUsers = getHighRiskUsers(transactions);
    }
    
    // Transaction volume over time
    const volumeData = getVolumeData(filteredTransactions);
    
    // Payment methods distribution
    const paymentMethods = getPaymentMethodDistribution(filteredTransactions);
    
    res.json({
      summary,
      timeSeries: timeSeriesData,
      highRiskRegions,
      highRiskUsers,
      volumeData,
      paymentMethods,
      period: {
        startDate: startDate || null,
        endDate: endDate || null
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get fraud rate over time
 */
function getTimeSeriesData(transactions) {
  // Group by date
  const dateGroups = {};
  
  transactions.forEach(t => {
    const date = new Date(t.timestamp).toISOString().split('T')[0];
    if (!dateGroups[date]) {
      dateGroups[date] = { total: 0, fraudulent: 0, suspicious: 0 };
    }
    dateGroups[date].total++;
    if (t.fraudStatus?.classification === 'Fraudulent') {
      dateGroups[date].fraudulent++;
    } else if (t.fraudStatus?.classification === 'Suspicious') {
      dateGroups[date].suspicious++;
    }
  });
  
  return Object.entries(dateGroups)
    .map(([date, data]) => ({
      date,
      total: data.total,
      fraudulent: data.fraudulent,
      suspicious: data.suspicious,
      fraudRate: data.total > 0 ? ((data.fraudulent / data.total) * 100).toFixed(2) : 0
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get high-risk regions
 */
function getHighRiskRegions(transactions) {
  const regionData = {};
  
  transactions.forEach(t => {
    const location = t.location || t.country || 'Unknown';
    if (!regionData[location]) {
      regionData[location] = { total: 0, fraudulent: 0, suspicious: 0 };
    }
    regionData[location].total++;
    if (t.fraudStatus?.classification === 'Fraudulent') {
      regionData[location].fraudulent++;
    } else if (t.fraudStatus?.classification === 'Suspicious') {
      regionData[location].suspicious++;
    }
  });
  
  return Object.entries(regionData)
    .map(([location, data]) => ({
      location,
      total: data.total,
      fraudulent: data.fraudulent,
      suspicious: data.suspicious,
      fraudRate: data.total > 0 ? ((data.fraudulent / data.total) * 100).toFixed(2) : 0,
      riskScore: data.total > 0 ? 
        ((data.fraudulent * 2 + data.suspicious) / data.total * 100).toFixed(2) : 0
    }))
    .sort((a, b) => parseFloat(b.riskScore) - parseFloat(a.riskScore))
    .slice(0, 10);
}

/**
 * Get high-risk users (admin only)
 */
function getHighRiskUsers(transactions) {
  const userData = {};
  
  transactions.forEach(t => {
    if (!userData[t.userId]) {
      userData[t.userId] = { total: 0, fraudulent: 0, suspicious: 0 };
    }
    userData[t.userId].total++;
    if (t.fraudStatus?.classification === 'Fraudulent') {
      userData[t.userId].fraudulent++;
    } else if (t.fraudStatus?.classification === 'Suspicious') {
      userData[t.userId].suspicious++;
    }
  });
  
  return Object.entries(userData)
    .filter(([_, data]) => data.fraudulent > 0 || data.suspicious > 0)
    .map(([userId, data]) => ({
      userId,
      total: data.total,
      fraudulent: data.fraudulent,
      suspicious: data.suspicious,
      fraudRate: data.total > 0 ? ((data.fraudulent / data.total) * 100).toFixed(2) : 0
    }))
    .sort((a, b) => parseFloat(b.fraudRate) - parseFloat(a.fraudRate))
    .slice(0, 10);
}

/**
 * Get transaction volume over time
 */
function getVolumeData(transactions) {
  const dateGroups = {};
  
  transactions.forEach(t => {
    const date = new Date(t.timestamp).toISOString().split('T')[0];
    if (!dateGroups[date]) {
      dateGroups[date] = { count: 0, totalAmount: 0 };
    }
    dateGroups[date].count++;
    dateGroups[date].totalAmount += t.amount;
  });
  
  return Object.entries(dateGroups)
    .map(([date, data]) => ({
      date,
      count: data.count,
      totalAmount: parseFloat(data.totalAmount.toFixed(2))
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get payment method distribution
 */
function getPaymentMethodDistribution(transactions) {
  const methods = {};
  
  transactions.forEach(t => {
    const method = t.paymentMethod || 'Unknown';
    if (!methods[method]) {
      methods[method] = { count: 0, totalAmount: 0 };
    }
    methods[method].count++;
    methods[method].totalAmount += t.amount;
  });
  
  return Object.entries(methods)
    .map(([method, data]) => ({
      method,
      count: data.count,
      totalAmount: parseFloat(data.totalAmount.toFixed(2)),
      percentage: transactions.length > 0 ? 
        ((data.count / transactions.length) * 100).toFixed(2) : 0
    }))
    .sort((a, b) => b.count - a.count);
}

export default router;
