import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import { readData, writeData } from '../config/database.js';

const userPayload = {
  email: 'minor.project.user@example.com',
  password: 'password123',
  name: 'Minor Project User'
};

const adminPayload = {
  email: 'minor.project.admin@example.com',
  password: 'password123',
  name: 'Minor Project Admin',
  role: 'admin'
};

async function registerAndLogin(payload) {
  await request(app).post('/api/auth/register').send(payload);
  const loginRes = await request(app).post('/api/auth/login').send({
    email: payload.email,
    password: payload.password
  });
  return loginRes.body.token;
}

describe('FraudShield API smoke tests', () => {
  const backup = {
    users: [],
    transactions: [],
    fraudLogs: [],
    labels: []
  };

  beforeAll(async () => {
    backup.users = await readData('users.json');
    backup.transactions = await readData('transactions.json');
    backup.fraudLogs = await readData('fraudLogs.json');
    backup.labels = await readData('labels.json');
  });

  beforeEach(async () => {
    await writeData('users.json', []);
    await writeData('transactions.json', []);
    await writeData('fraudLogs.json', []);
    await writeData('labels.json', []);
  });

  afterAll(async () => {
    await writeData('users.json', backup.users);
    await writeData('transactions.json', backup.transactions);
    await writeData('fraudLogs.json', backup.fraudLogs);
    await writeData('labels.json', backup.labels);
  });

  it('registers and logs in user', async () => {
    const registerRes = await request(app).post('/api/auth/register').send(userPayload);
    expect(registerRes.status).toBe(201);
    expect(registerRes.body.user.email).toBe(userPayload.email);

    const loginRes = await request(app).post('/api/auth/login').send({
      email: userPayload.email,
      password: userPayload.password
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeTruthy();
  });

  it('creates transaction and filters by status/classification', async () => {
    const token = await registerAndLogin(userPayload);

    const createRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 1800,
        merchantName: 'Casino Royale',
        merchantCategory: 'Gambling',
        paymentMethod: 'Wire Transfer',
        location: 'Mumbai',
        country: 'India'
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.transactionId).toBeTruthy();

    const statusFiltered = await request(app)
      .get('/api/transactions?status=approved')
      .set('Authorization', `Bearer ${token}`);
    expect(statusFiltered.status).toBe(200);
    expect(Array.isArray(statusFiltered.body.transactions)).toBe(true);

    const classificationFiltered = await request(app)
      .get('/api/transactions?classification=safe')
      .set('Authorization', `Bearer ${token}`);
    expect(classificationFiltered.status).toBe(200);
    expect(Array.isArray(classificationFiltered.body.transactions)).toBe(true);
  });

  it('rejects invalid transaction payload with validation error', async () => {
    const token = await registerAndLogin(userPayload);

    const invalidRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: -20,
        merchantName: 'x',
        merchantCategory: 'Y'
      });
    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.message).toContain('Amount must be a valid number');
  });

  it('allows admin to label transaction and fetch labels', async () => {
    const userToken = await registerAndLogin(userPayload);
    const adminToken = await registerAndLogin(adminPayload);

    const createRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        amount: 300,
        merchantName: 'Merchant 999',
        merchantCategory: 'Retail',
        paymentMethod: 'Credit Card',
        location: 'Delhi',
        country: 'India'
      });
    const txId = createRes.body.transactionId;

    const labelRes = await request(app)
      .post(`/api/admin/transactions/${txId}/label`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ label: 'fraud', notes: 'Manual review confirmed fraud.' });
    expect(labelRes.status).toBe(201);
    expect(labelRes.body.label).toBe('fraud');

    const listRes = await request(app)
      .get('/api/admin/labels')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.count).toBeGreaterThan(0);
  });
});
