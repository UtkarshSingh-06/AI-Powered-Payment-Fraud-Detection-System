/**
 * AI-Powered Fraud Detection Service
 * 
 * This service analyzes payment transactions and assigns fraud risk scores
 * using a combination of rule-based logic and statistical analysis.
 */

// Risk factors and their weights
const RISK_FACTORS = {
  AMOUNT_ANOMALY: 0.25,        // Unusual transaction amount
  VELOCITY: 0.20,              // Too many transactions in short time
  LOCATION_MISMATCH: 0.15,     // Transaction from unusual location
  TIME_ANOMALY: 0.15,          // Transaction at unusual time
  DEVICE_CHANGE: 0.10,         // Different device than usual
  MERCHANT_RISK: 0.10,         // High-risk merchant category
  PATTERN_DEVIATION: 0.05      // Deviation from user's normal patterns
};

/**
 * Calculate fraud risk score (0-100)
 * @param {Object} transaction - Transaction object
 * @param {Array} userHistory - User's transaction history
 * @returns {Object} - { score, reasons, classification }
 */
export function analyzeFraudRisk(transaction, userHistory = []) {
  let riskScore = 0;
  const reasons = [];
  
  // Get user's historical data for comparison
  const userStats = calculateUserStatistics(userHistory);
  
  // 1. Amount Anomaly Detection
  const amountRisk = checkAmountAnomaly(transaction.amount, userStats);
  if (amountRisk > 0) {
    riskScore += amountRisk * RISK_FACTORS.AMOUNT_ANOMALY * 100;
    reasons.push(`Unusual transaction amount (${amountRisk > 0.7 ? 'high' : 'moderate'} deviation)`);
  }
  
  // 2. Velocity Check (rapid transactions)
  const velocityRisk = checkVelocity(transaction, userHistory);
  if (velocityRisk > 0) {
    riskScore += velocityRisk * RISK_FACTORS.VELOCITY * 100;
    reasons.push(`High transaction velocity detected`);
  }
  
  // 3. Location Mismatch
  const locationRisk = checkLocationMismatch(transaction, userHistory);
  if (locationRisk > 0) {
    riskScore += locationRisk * RISK_FACTORS.LOCATION_MISMATCH * 100;
    reasons.push(`Transaction from unusual location`);
  }
  
  // 4. Time Anomaly
  const timeRisk = checkTimeAnomaly(transaction, userHistory);
  if (timeRisk > 0) {
    riskScore += timeRisk * RISK_FACTORS.TIME_ANOMALY * 100;
    reasons.push(`Transaction at unusual time`);
  }
  
  // 5. Device Change
  const deviceRisk = checkDeviceChange(transaction, userHistory);
  if (deviceRisk > 0) {
    riskScore += deviceRisk * RISK_FACTORS.DEVICE_CHANGE * 100;
    reasons.push(`Transaction from different device`);
  }
  
  // 6. Merchant Risk
  const merchantRisk = checkMerchantRisk(transaction.merchantCategory);
  if (merchantRisk > 0) {
    riskScore += merchantRisk * RISK_FACTORS.MERCHANT_RISK * 100;
    reasons.push(`High-risk merchant category`);
  }
  
  // 7. Pattern Deviation
  const patternRisk = checkPatternDeviation(transaction, userHistory);
  if (patternRisk > 0) {
    riskScore += patternRisk * RISK_FACTORS.PATTERN_DEVIATION * 100;
    reasons.push(`Unusual transaction pattern`);
  }
  
  // Ensure score is between 0 and 100
  riskScore = Math.min(100, Math.max(0, riskScore));
  
  // Classify transaction
  let classification = 'Safe';
  if (riskScore >= 70) {
    classification = 'Fraudulent';
  } else if (riskScore >= 40) {
    classification = 'Suspicious';
  }
  
  return {
    score: Math.round(riskScore * 100) / 100,
    reasons: reasons.length > 0 ? reasons : ['No suspicious patterns detected'],
    classification,
    timestamp: new Date().toISOString()
  };
}

/**
 * Calculate user statistics from transaction history
 */
function calculateUserStatistics(history) {
  if (history.length === 0) {
    return {
      avgAmount: 0,
      maxAmount: 0,
      commonLocations: [],
      commonMerchants: [],
      commonDevices: [],
      transactionHours: []
    };
  }
  
  const amounts = history.map(t => t.amount);
  const locations = history.map(t => t.location || t.country);
  const merchants = history.map(t => t.merchantCategory);
  const devices = history.map(t => t.deviceId);
  const hours = history.map(t => {
    const date = new Date(t.timestamp);
    return date.getHours();
  });
  
  // Get most common values
  const getMostCommon = (arr, limit = 3) => {
    const counts = {};
    arr.forEach(item => {
      counts[item] = (counts[item] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([value]) => value);
  };
  
  return {
    avgAmount: amounts.reduce((a, b) => a + b, 0) / amounts.length,
    maxAmount: Math.max(...amounts),
    commonLocations: getMostCommon(locations),
    commonMerchants: getMostCommon(merchants),
    commonDevices: getMostCommon(devices),
    transactionHours: hours
  };
}

/**
 * Check for amount anomaly
 */
function checkAmountAnomaly(amount, stats) {
  if (stats.avgAmount === 0) return 0; // No history
  
  // Check if amount is significantly higher than average
  const ratio = amount / stats.avgAmount;
  if (ratio > 5) return 1.0; // 500%+ of average
  if (ratio > 3) return 0.7; // 300%+ of average
  if (ratio > 2) return 0.4; // 200%+ of average
  
  // Check if amount is unusually low (could be testing)
  if (ratio < 0.1) return 0.3;
  
  return 0;
}

/**
 * Check transaction velocity (too many transactions in short time)
 */
function checkVelocity(transaction, history) {
  const transactionTime = new Date(transaction.timestamp);
  const oneHourAgo = new Date(transactionTime.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(transactionTime.getTime() - 24 * 60 * 60 * 1000);
  
  const recentTransactions = history.filter(t => {
    const tTime = new Date(t.timestamp);
    return tTime >= oneHourAgo && tTime < transactionTime;
  });
  
  const dailyTransactions = history.filter(t => {
    const tTime = new Date(t.timestamp);
    return tTime >= oneDayAgo && tTime < transactionTime;
  });
  
  // Risk if more than 10 transactions per hour or 50 per day
  if (recentTransactions.length > 10) return 1.0;
  if (recentTransactions.length > 5) return 0.6;
  if (dailyTransactions.length > 50) return 0.8;
  if (dailyTransactions.length > 30) return 0.5;
  
  return 0;
}

/**
 * Check location mismatch
 */
function checkLocationMismatch(transaction, history) {
  if (history.length === 0) return 0;
  
  const transactionLocation = transaction.location || transaction.country;
  const stats = calculateUserStatistics(history);
  
  // If location is not in common locations
  if (!stats.commonLocations.includes(transactionLocation)) {
    // Check if there was a transaction from a different location recently
    const recentTransactions = history.slice(-10);
    const hasRecentLocation = recentTransactions.some(t => {
      const tLocation = t.location || t.country;
      return tLocation === transactionLocation;
    });
    
    if (!hasRecentLocation) {
      return 0.8; // High risk - completely new location
    }
    return 0.4; // Moderate risk
  }
  
  return 0;
}

/**
 * Check time anomaly
 */
function checkTimeAnomaly(transaction, history) {
  if (history.length === 0) return 0;
  
  const transactionTime = new Date(transaction.timestamp);
  const hour = transactionTime.getHours();
  const stats = calculateUserStatistics(history);
  
  // Check if transaction is at unusual hours (2 AM - 5 AM)
  if (hour >= 2 && hour <= 5) {
    const hasHistoryAtTime = stats.transactionHours.some(h => h >= 2 && h <= 5);
    if (!hasHistoryAtTime) {
      return 0.6; // Unusual time
    }
  }
  
  return 0;
}

/**
 * Check device change
 */
function checkDeviceChange(transaction, history) {
  if (history.length === 0 || !transaction.deviceId) return 0;
  
  const stats = calculateUserStatistics(history);
  
  if (!stats.commonDevices.includes(transaction.deviceId)) {
    return 0.5; // Different device
  }
  
  return 0;
}

/**
 * Check merchant risk
 */
function checkMerchantRisk(merchantCategory) {
  const highRiskCategories = [
    'Gambling',
    'Cryptocurrency',
    'Adult Content',
    'Peer-to-Peer'
  ];
  
  if (highRiskCategories.includes(merchantCategory)) {
    return 0.7;
  }
  
  return 0;
}

/**
 * Check pattern deviation
 */
function checkPatternDeviation(transaction, history) {
  // Simple pattern check - could be enhanced with ML models
  if (history.length < 5) return 0;
  
  // Check if transaction breaks multiple patterns at once
  const stats = calculateUserStatistics(history);
  let deviations = 0;
  
  if (!stats.commonMerchants.includes(transaction.merchantCategory)) deviations++;
  if (transaction.amount > stats.maxAmount * 2) deviations++;
  
  return deviations > 1 ? 0.3 : 0;
}

/**
 * Generate fraud detection summary for analytics
 */
export function getFraudSummary(transactions) {
  const total = transactions.length;
  const fraudulent = transactions.filter(t => t.fraudStatus?.classification === 'Fraudulent').length;
  const suspicious = transactions.filter(t => t.fraudStatus?.classification === 'Suspicious').length;
  const safe = transactions.filter(t => t.fraudStatus?.classification === 'Safe').length;
  
  return {
    total,
    fraudulent,
    suspicious,
    safe,
    fraudRate: total > 0 ? ((fraudulent / total) * 100).toFixed(2) : 0
  };
}
