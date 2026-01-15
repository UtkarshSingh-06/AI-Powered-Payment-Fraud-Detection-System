/**
 * AI-Powered Payment Recommendations Service
 * 
 * Generates personalized recommendations for users based on their
 * transaction history and fraud risk profile.
 */

import { readData } from '../config/database.js';

/**
 * Generate personalized recommendations for a user
 * @param {string} userId - User ID
 * @returns {Array} - Array of recommendation objects
 */
export async function generateRecommendations(userId) {
  const transactions = await readData('transactions.json');
  const userTransactions = transactions.filter(t => t.userId === userId);
  
  if (userTransactions.length === 0) {
    return getDefaultRecommendations();
  }
  
  const recommendations = [];
  
  // Analyze user's transaction patterns
  const analysis = analyzeUserBehavior(userTransactions);
  
  // 1. Payment method recommendations
  const paymentMethodRec = analyzePaymentMethods(userTransactions, analysis);
  if (paymentMethodRec) recommendations.push(paymentMethodRec);
  
  // 2. Time-based recommendations
  const timeRec = analyzeOptimalTimes(userTransactions, analysis);
  if (timeRec) recommendations.push(timeRec);
  
  // 3. Risk-based warnings
  const riskWarnings = generateRiskWarnings(analysis);
  recommendations.push(...riskWarnings);
  
  // 4. Amount recommendations
  const amountRec = analyzeAmountPatterns(userTransactions, analysis);
  if (amountRec) recommendations.push(amountRec);
  
  // 5. Location recommendations
  const locationRec = analyzeLocationPatterns(userTransactions, analysis);
  if (locationRec) recommendations.push(locationRec);
  
  return recommendations.length > 0 ? recommendations : getDefaultRecommendations();
}

/**
 * Analyze user's transaction behavior
 */
function analyzeUserBehavior(transactions) {
  const fraudCount = transactions.filter(t => 
    t.fraudStatus?.classification === 'Fraudulent' || 
    t.fraudStatus?.classification === 'Suspicious'
  ).length;
  
  const avgRiskScore = transactions
    .filter(t => t.fraudStatus?.score)
    .reduce((sum, t) => sum + (t.fraudStatus.score || 0), 0) / transactions.length || 0;
  
  const highRiskTransactions = transactions.filter(t => (t.fraudStatus?.score || 0) > 50).length;
  
  const hours = transactions.map(t => {
    const date = new Date(t.timestamp);
    return date.getHours();
  });
  
  const commonHour = getMostCommon(hours);
  
  const locations = transactions.map(t => t.location || t.country);
  const commonLocation = getMostCommon(locations);
  
  return {
    totalTransactions: transactions.length,
    fraudCount,
    fraudRate: (fraudCount / transactions.length) * 100,
    avgRiskScore,
    highRiskCount: highRiskTransactions,
    commonHour,
    commonLocation,
    recentTransactions: transactions.slice(-10)
  };
}

/**
 * Analyze payment methods and recommend safer options
 */
function analyzePaymentMethods(transactions, analysis) {
  const methodCounts = {};
  transactions.forEach(t => {
    const method = t.paymentMethod || 'Unknown';
    methodCounts[method] = (methodCounts[method] || 0) + 1;
  });
  
  // Check for high-risk payment methods
  const highRiskMethods = ['Wire Transfer', 'Cryptocurrency'];
  const usedHighRisk = highRiskMethods.some(method => methodCounts[method] > 0);
  
  if (usedHighRisk || analysis.fraudRate > 20) {
    return {
      type: 'payment_method',
      priority: 'high',
      title: 'Use Safer Payment Methods',
      description: 'Consider using credit cards or digital wallets (PayPal, Apple Pay) for better fraud protection and easier dispute resolution.',
      explanation: 'Credit cards and digital wallets offer better fraud protection and automatic refunds for unauthorized transactions.',
      action: 'Switch to credit card or digital wallet for transactions above $100'
    };
  }
  
  return null;
}

/**
 * Analyze optimal transaction times
 */
function analyzeOptimalTimes(transactions, analysis) {
  if (analysis.commonHour !== null) {
    const hour = analysis.commonHour;
    
    // Recommend avoiding unusual hours (2 AM - 5 AM)
    if (hour >= 2 && hour <= 5) {
      return {
        type: 'timing',
        priority: 'medium',
        title: 'Avoid Late Night Transactions',
        description: 'Your transactions during late night hours (2 AM - 5 AM) have higher fraud risk.',
        explanation: 'Fraudulent activity is more common during late night hours when account owners are less likely to notice.',
        action: 'Try to schedule transactions during business hours (9 AM - 6 PM) when possible'
      };
    }
  }
  
  // Recommend best times based on low fraud activity
  return {
    type: 'timing',
    priority: 'low',
    title: 'Optimal Transaction Times',
    description: 'Transactions during business hours (9 AM - 6 PM) typically have lower fraud rates.',
    explanation: 'Most legitimate transactions occur during business hours when banks and merchants are active.',
    action: 'Schedule important transactions during business hours for better security'
  };
}

/**
 * Generate risk-based warnings
 */
function generateRiskWarnings(analysis) {
  const warnings = [];
  
  if (analysis.fraudRate > 30) {
    warnings.push({
      type: 'risk_warning',
      priority: 'high',
      title: 'High Fraud Risk Detected',
      description: `Your account has a ${analysis.fraudRate.toFixed(1)}% fraud rate. Please review your transaction patterns.`,
      explanation: 'A high fraud rate indicates that your transaction patterns are being flagged as suspicious. Review your recent transactions and update your security settings.',
      action: 'Contact support if you believe these are false positives'
    });
  } else if (analysis.avgRiskScore > 50) {
    warnings.push({
      type: 'risk_warning',
      priority: 'medium',
      title: 'Elevated Risk Profile',
      description: 'Your transactions have an elevated risk score. Consider reviewing your payment habits.',
      explanation: 'Certain patterns in your transactions are triggering fraud detection. This could be due to unusual amounts, locations, or timing.',
      action: 'Review recent transactions and verify they are all legitimate'
    });
  }
  
  if (analysis.highRiskCount > 5) {
    warnings.push({
      type: 'behavior_warning',
      priority: 'medium',
      title: 'Multiple High-Risk Transactions',
      description: `You have ${analysis.highRiskCount} transactions with high risk scores.`,
      explanation: 'Multiple high-risk transactions may indicate patterns that are being flagged by our fraud detection system.',
      action: 'Verify all transactions are legitimate and consider using two-factor authentication'
    });
  }
  
  return warnings;
}

/**
 * Analyze amount patterns
 */
function analyzeAmountPatterns(transactions, analysis) {
  const amounts = transactions.map(t => t.amount);
  const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const maxAmount = Math.max(...amounts);
  
  if (maxAmount > avgAmount * 5) {
    return {
      type: 'amount',
      priority: 'medium',
      title: 'Large Transaction Alert',
      description: 'You have transactions significantly larger than your average transaction size.',
      explanation: 'Large deviations from your normal transaction amounts can trigger fraud alerts. Consider splitting large transactions or notifying your bank in advance.',
      action: 'For transactions over 3x your average, consider contacting your bank beforehand'
    };
  }
  
  return null;
}

/**
 * Analyze location patterns
 */
function analyzeLocationPatterns(transactions, analysis) {
  const uniqueLocations = [...new Set(transactions.map(t => t.location || t.country))];
  
  if (uniqueLocations.length > 5 && transactions.length < 20) {
    return {
      type: 'location',
      priority: 'low',
      title: 'Multiple Location Activity',
      description: 'You have transactions from multiple different locations.',
      explanation: 'Transactions from many different locations can sometimes trigger fraud alerts, especially if they occur in quick succession.',
      action: 'If traveling, notify your bank in advance to prevent false fraud alerts'
    };
  }
  
  return null;
}

/**
 * Get default recommendations for new users
 */
function getDefaultRecommendations() {
  return [
    {
      type: 'general',
      priority: 'low',
      title: 'Enable Two-Factor Authentication',
      description: 'Add an extra layer of security to your account.',
      explanation: 'Two-factor authentication significantly reduces the risk of unauthorized access to your account.',
      action: 'Go to account settings and enable 2FA'
    },
    {
      type: 'general',
      priority: 'low',
      title: 'Review Transactions Regularly',
      description: 'Regularly check your transaction history for any unauthorized activity.',
      explanation: 'Early detection of fraudulent transactions helps prevent further damage and makes recovery easier.',
      action: 'Set up transaction alerts for amounts above your threshold'
    }
  ];
}

/**
 * Get most common value in array
 */
function getMostCommon(arr) {
  if (arr.length === 0) return null;
  
  const counts = {};
  arr.forEach(item => {
    counts[item] = (counts[item] || 0) + 1;
  });
  
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])[0][0];
}
