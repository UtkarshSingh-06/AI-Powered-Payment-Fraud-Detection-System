import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../server.js';

describe('Contact API', () => {
  it('rejects incomplete payloads', async () => {
    const res = await request(app).post('/api/contact').send({ name: 'A', email: 'bad' });
    expect(res.status).toBe(400);
  });

  it('accepts a valid contact message', async () => {
    const res = await request(app).post('/api/contact').send({
      name: 'Test User',
      email: 'tester@example.com',
      subject: 'Hello',
      message: 'I would like to learn more about FraudShield.'
    });
    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/received/i);
  });
});
