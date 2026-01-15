/**
 * Seed script to populate the database with sample data
 * Run with: npm run seed
 */

import bcrypt from 'bcryptjs';
import { readData, writeData } from '../config/database.js';
import { initializeDatabase } from '../config/database.js';
import { analyzeFraudRisk } from '../services/fraudDetection.js';

async function createSampleUsers() {
  return [
    {
      userId: 'user_admin_001',
      email: 'admin@frauddetection.com',
      password: await bcrypt.hash('admin123', 10),
      name: 'Admin User',
      role: 'admin',
      createdAt: new Date().toISOString()
    },
    {
      userId: 'user_001',
      email: 'john.doe@example.com',
      password: await bcrypt.hash('password123', 10),
      name: 'John Doe',
      role: 'user',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      userId: 'user_002',
      email: 'jane.smith@example.com',
      password: await bcrypt.hash('password123', 10),
      name: 'Jane Smith',
      role: 'user',
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      userId: 'user_003',
      email: 'bob.wilson@example.com',
      password: await bcrypt.hash('password123', 10),
      name: 'Bob Wilson',
      role: 'user',
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
}

// Sample transactions
const merchantCategories = [
  'Retail', 'Restaurant', 'Gas Station', 'Online Shopping',
  'Travel', 'Entertainment', 'Gambling', 'Cryptocurrency',
  'Peer-to-Peer', 'Grocery', 'Healthcare', 'Education'
];

const paymentMethods = [
  'Credit Card', 'Debit Card', 'Digital Wallet', 'Bank Transfer',
  'Cryptocurrency', 'Wire Transfer'
];

const locations = [
  { country: 'USA', location: 'New York' },
  { country: 'USA', location: 'Los Angeles' },
  { country: 'USA', location: 'Chicago' },
  { country: 'USA', location: 'Miami' },
  { country: 'UK', location: 'London' },
  { country: 'Canada', location: 'Toronto' },
  { country: 'Germany', location: 'Berlin' },
  { country: 'France', location: 'Paris' }
];

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomAmount(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function randomDate(daysAgo) {
  const now = Date.now();
  const randomTime = now - Math.random() * daysAgo * 24 * 60 * 60 * 1000;
  return new Date(randomTime).toISOString();
}

async function generateSampleTransactions() {
  const transactions = [];
  const users = ['user_001', 'user_002', 'user_003'];
  
  users.forEach(userId => {
    // Generate 20-30 transactions per user
    const transactionCount = 20 + Math.floor(Math.random() * 11);
    
    for (let i = 0; i < transactionCount; i++) {
      const location = randomItem(locations);
      const timestamp = randomDate(30); // Last 30 days
      
      const transaction = {
        transactionId: `txn_${userId}_${Date.now()}_${i}`,
        userId,
        amount: randomAmount(10, 2000),
        currency: 'USD',
        merchantName: `Merchant ${Math.floor(Math.random() * 1000)}`,
        merchantCategory: randomItem(merchantCategories),
        paymentMethod: randomItem(paymentMethods),
        location: location.location,
        country: location.country,
        deviceId: `device_${userId}_${Math.floor(Math.random() * 3) + 1}`,
        timestamp,
        status: 'pending',
        createdAt: timestamp
      };
      
      // Get user's previous transactions for fraud analysis
      const userHistory = transactions.filter(t => t.userId === userId);
      
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
      
      transactions.push(transaction);
    }
  });
  
  // Add some high-risk transactions
  const highRiskTransactions = [
    {
      transactionId: 'txn_highrisk_001',
      userId: 'user_001',
      amount: 5000,
      currency: 'USD',
      merchantName: 'Suspicious Merchant',
      merchantCategory: 'Gambling',
      paymentMethod: 'Cryptocurrency',
      location: 'Unknown Location',
      country: 'Unknown',
      deviceId: 'device_unknown',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'blocked',
      createdAt: new Date().toISOString(),
      fraudStatus: {
        score: 85,
        classification: 'Fraudulent',
        reasons: ['Unusual transaction amount', 'High-risk merchant category', 'Transaction from unusual location'],
        timestamp: new Date().toISOString()
      }
    },
    {
      transactionId: 'txn_highrisk_002',
      userId: 'user_002',
      amount: 1500,
      currency: 'USD',
      merchantName: 'Online Casino',
      merchantCategory: 'Gambling',
      paymentMethod: 'Wire Transfer',
      location: 'Las Vegas',
      country: 'USA',
      deviceId: 'device_new_device',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'flagged',
      createdAt: new Date().toISOString(),
      fraudStatus: {
        score: 65,
        classification: 'Suspicious',
        reasons: ['High-risk merchant category', 'High transaction velocity detected'],
        timestamp: new Date().toISOString()
      }
    }
  ];
  
  transactions.push(...highRiskTransactions);
  
  return transactions;
}

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seed...');
    
    // Initialize database
    await initializeDatabase();
    
    // Seed users
    console.log('👥 Seeding users...');
    const sampleUsers = await createSampleUsers();
    await writeData('users.json', sampleUsers);
    console.log(`✅ Seeded ${sampleUsers.length} users`);
    
    // Seed transactions
    console.log('💳 Generating sample transactions...');
    const transactions = await generateSampleTransactions();
    await writeData('transactions.json', transactions);
    console.log(`✅ Seeded ${transactions.length} transactions`);
    
    // Generate fraud logs
    console.log('📋 Generating fraud logs...');
    const fraudLogs = transactions
      .filter(t => t.fraudStatus)
      .map(t => ({
        logId: `log_${t.transactionId}`,
        transactionId: t.transactionId,
        userId: t.userId,
        riskScore: t.fraudStatus.score,
        classification: t.fraudStatus.classification,
        reasons: t.fraudStatus.reasons,
        timestamp: t.timestamp,
        action: t.status
      }));
    await writeData('fraudLogs.json', fraudLogs);
    console.log(`✅ Seeded ${fraudLogs.length} fraud logs`);
    
    console.log('✨ Database seeding completed!');
    console.log('\n📝 Default Login Credentials:');
    console.log('Admin: admin@frauddetection.com / admin123');
    console.log('User 1: john.doe@example.com / password123');
    console.log('User 2: jane.smith@example.com / password123');
    console.log('User 3: bob.wilson@example.com / password123');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
