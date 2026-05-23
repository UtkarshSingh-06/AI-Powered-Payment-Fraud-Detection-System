import express from 'express';
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 5004;
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;
const memoryCases = [];

app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'case-service', storage: pool ? 'postgres' : 'memory' }));

app.get('/', async (_req, res) => {
  if (!pool) return res.json({ cases: memoryCases });
  const { rows } = await pool.query(
    'SELECT case_id, status, priority, payload, created_at, updated_at FROM fraud_cases ORDER BY created_at DESC LIMIT 100'
  );
  res.json({ cases: rows });
});

app.post('/', async (req, res) => {
  const caseId = uuidv4();
  const payload = {
    caseId,
    transactionId: req.body.transactionId,
    tenantId: req.body.tenantId || 'default',
    title: req.body.title || 'Fraud investigation',
    notes: req.body.notes || [],
    timeline: [{ at: new Date().toISOString(), event: 'case_opened' }]
  };
  if (!pool) {
    memoryCases.unshift({ case_id: caseId, status: 'open', priority: req.body.priority || 'medium', payload });
    return res.status(201).json(payload);
  }
  await pool.query(
    `INSERT INTO fraud_cases (case_id, tenant_id, transaction_id, status, priority, payload)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [caseId, payload.tenantId, payload.transactionId, 'open', req.body.priority || 'medium', payload]
  );
  res.status(201).json(payload);
});

app.patch('/:caseId', async (req, res) => {
  if (!pool) {
    const found = memoryCases.find((c) => c.case_id === req.params.caseId);
    if (!found) return res.status(404).json({ message: 'Case not found' });
    found.status = req.body.status || found.status;
    return res.json(found);
  }
  const { rows } = await pool.query(
    `UPDATE fraud_cases SET status = COALESCE($2, status), updated_at = now(),
     payload = payload || $3::jsonb WHERE case_id = $1 RETURNING *`,
    [req.params.caseId, req.body.status, JSON.stringify({ lastNote: req.body.note })]
  );
  if (!rows.length) return res.status(404).json({ message: 'Case not found' });
  res.json(rows[0]);
});

app.listen(PORT, () => console.log(`Case service on :${PORT}`));
