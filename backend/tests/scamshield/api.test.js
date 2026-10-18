import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../../server.js';
import { readData, writeData } from '../../config/database.js';
import { resetMemoryStore } from '../../services/scamshield/store.js';

const analystPayload = {
  email: 'scamshield.analyst@example.com',
  password: 'Password12345',
  name: 'ScamShield Analyst'
};

const userPayload = {
  email: 'scamshield.user@example.com',
  password: 'Password12345',
  name: 'ScamShield User'
};

async function loginAs(payload, role = 'user') {
  await request(app).post('/api/auth/register').send(payload);
  if (role !== 'user') {
    const users = await readData('users.json');
    const user = users.find((u) => u.email === payload.email);
    if (user) {
      user.role = role;
      if (role === 'admin' || role === 'analyst') {
        user.mfaSecret = 'test-mfa-secret';
        user.mfaEnabled = true;
      }
      await writeData('users.json', users);
    }
  }
  const loginBody = {
    email: payload.email,
    password: payload.password,
    ...(role !== 'user' ? { totpCode: '000000' } : {})
  };
  const loginRes = await request(app).post('/api/auth/login').send(loginBody);
  if (loginRes.status !== 200 || !loginRes.body.token) {
    throw new Error(`Login failed (${loginRes.status}): ${JSON.stringify(loginRes.body)}`);
  }
  return loginRes.body.token;
}

describe('ScamShield API', () => {
  const backup = { users: [] };

  beforeAll(async () => {
    backup.users = await readData('users.json');
  });

  beforeEach(async () => {
    await writeData('users.json', []);
    resetMemoryStore();
  });

  afterAll(async () => {
    await writeData('users.json', backup.users);
  });

  it('rejects unauthenticated and unauthorized access', async () => {
    const unauth = await request(app).get('/api/scamshield/indicators');
    expect(unauth.status).toBe(401);

    const userToken = await loginAs(userPayload, 'user');
    const forbidden = await request(app)
      .get('/api/scamshield/indicators')
      .set('Authorization', `Bearer ${userToken}`);
    expect(forbidden.status).toBe(403);
  });

  it('allows analyst search, manual ingest, detail, pagination, investigations', async () => {
    const token = await loginAs(analystPayload, 'analyst');

    const manual = await request(app)
      .post('/api/scamshield/indicators')
      .set('Authorization', `Bearer ${token}`)
      .send({ value: 'https://scamshield-api-test.example/phish', tags: ['test'] });
    expect(manual.status).toBe(201);
    expect(manual.body.note).toMatch(/without fetching/i);

    const bad = await request(app)
      .post('/api/scamshield/indicators')
      .set('Authorization', `Bearer ${token}`)
      .send({ value: 'http://169.254.169.254/latest/meta-data/' });
    expect(bad.status).toBe(400);

    const list = await request(app)
      .get('/api/scamshield/indicators?q=scamshield-api-test&limit=10&offset=0')
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.indicators.length).toBeGreaterThan(0);
    expect(list.body.pagination).toBeTruthy();
    expect(list.body.disclaimer).toMatch(/investigation only/i);

    const id = list.body.indicators[0].indicatorId;
    const detail = await request(app)
      .get(`/api/scamshield/indicators/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(detail.status).toBe(200);
    expect(detail.body.observations.length).toBeGreaterThan(0);
    expect(detail.body.confidence.explanation.action).toBe('investigate_only');

    const inv = await request(app)
      .post('/api/scamshield/investigations')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test campaign' });
    expect(inv.status).toBe(201);

    const link = await request(app)
      .post(`/api/scamshield/investigations/${inv.body.investigation.investigationId}/indicators`)
      .set('Authorization', `Bearer ${token}`)
      .send({ indicatorId: id });
    expect(link.status).toBe(201);
  });

  it('ingests mocked URLhaus CSV via API', async () => {
    const token = await loginAs(
      { ...analystPayload, email: 'scamshield.ingest@example.com' },
      'admin'
    );

    const csv = `id,dateadded,url,url_status,last_online,threat,tags,urlhaus_link,reporter
999,"2024-06-01 10:00:00","https://api-ingest-test.example/m",online,,"malware_download","testrule","https://urlhaus.abuse.ch/url/999/","lab"
`;
    const res = await request(app)
      .post('/api/scamshield/ingest/urlhaus')
      .set('Authorization', `Bearer ${token}`)
      .send({ csvText: csv });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.run.recordsUpserted).toBeGreaterThan(0);
  });

  it('surfaces feed failures cleanly', async () => {
    const token = await loginAs(
      { ...analystPayload, email: 'scamshield.feedfail@example.com' },
      'admin'
    );
    const prev = process.env.URLHAUS_AUTH_KEY;
    delete process.env.URLHAUS_AUTH_KEY;
    const res = await request(app)
      .post('/api/scamshield/ingest/urlhaus')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect([200, 502]).toContain(res.status);
    expect(['failed', 'skipped']).toContain(res.body.status);
    if (prev) process.env.URLHAUS_AUTH_KEY = prev;
  });
});
