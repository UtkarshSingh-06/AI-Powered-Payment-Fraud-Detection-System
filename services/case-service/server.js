import express from 'express';
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { createServiceAuthMiddleware } from '@fraudshield/platform-auth';

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 5004;
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;
const memoryCases = [];
const requireAuth = createServiceAuthMiddleware();

app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'case-service', storage: pool ? 'postgres' : 'memory' }));

app.get('/', requireAuth, async (req, res) => {
  const tenantId = req.user?.tenantId || 'default';
  if (!pool) {
    const cases = memoryCases.filter((c) => (c.payload?.tenantId || 'default') === tenantId);
    return res.json({ cases });
  }
  const { rows } = await pool.query(
    'SELECT case_id, status, priority, payload, created_at, updated_at FROM fraud_cases WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100',
    [tenantId]
  );
  res.json({ cases: rows });
});

app.post('/', requireAuth, async (req, res) => {
  const caseId = uuidv4();
  const tenantId = req.user?.tenantId || req.body.tenantId || 'default';
  const payload = {
    caseId,
    transactionId: req.body.transactionId,
    tenantId,
    title: req.body.title || 'Fraud investigation',
    notes: req.body.notes || [],
    assigneeId: req.body.assigneeId || req.user?.userId,
    timeline: [{ at: new Date().toISOString(), event: 'case_opened', by: req.user?.userId }]
  };
  if (!pool) {
    memoryCases.unshift({ case_id: caseId, status: 'open', priority: req.body.priority || 'medium', payload });
    return res.status(201).json(payload);
  }
  await pool.query(
    `INSERT INTO fraud_cases (case_id, tenant_id, transaction_id, status, priority, assignee_id, payload)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [caseId, tenantId, payload.transactionId, 'open', req.body.priority || 'medium', payload.assigneeId, payload]
  );
  res.status(201).json(payload);
});

app.patch('/:caseId', requireAuth, async (req, res) => {
  const tenantId = req.user?.tenantId || 'default';
  if (!pool) {
    const found = memoryCases.find((c) => c.case_id === req.params.caseId && c.payload?.tenantId === tenantId);
    if (!found) return res.status(404).json({ message: 'Case not found' });
    found.status = req.body.status || found.status;
    if (req.body.note) found.payload.notes.push({ at: new Date().toISOString(), text: req.body.note });
    return res.json(found);
  }
  const { rows } = await pool.query(
    `UPDATE fraud_cases SET status = COALESCE($3, status), assignee_id = COALESCE($4, assignee_id), updated_at = now(),
     payload = payload || $5::jsonb WHERE case_id = $1 AND tenant_id = $2 RETURNING *`,
    [
      req.params.caseId,
      tenantId,
      req.body.status,
      req.body.assigneeId,
      JSON.stringify({ lastNote: req.body.note, timelineEntry: { at: new Date().toISOString(), event: req.body.status || 'updated' } })
    ]
  );
  if (!rows.length) return res.status(404).json({ message: 'Case not found' });
  res.json(rows[0]);
});

app.listen(PORT, () => console.log(`Case service on :${PORT}`));
