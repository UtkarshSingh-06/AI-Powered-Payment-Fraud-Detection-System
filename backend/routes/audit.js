import express from 'express';
import { readData } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { exportAuditChain } from '../services/auditLog.js';

const router = express.Router();

router.get('/export', authenticateToken, requirePermission('audit:read'), async (req, res, next) => {
  try {
    const logs = await readData('auditLogs.json');
    const chain = exportAuditChain(logs);
    res.json({
      exportedAt: new Date().toISOString(),
      format: 'hash-chained-audit-v1',
      count: chain.length,
      entries: chain
    });
  } catch (error) {
    next(error);
  }
});

router.get('/siem', authenticateToken, requirePermission('audit:read'), async (req, res, next) => {
  try {
    const logs = await readData('auditLogs.json');
    const since = req.query.since ? new Date(req.query.since).getTime() : 0;
    const filtered = logs.filter((entry) => new Date(entry.timestamp).getTime() >= since);
    res.setHeader('Content-Type', 'application/x-ndjson');
    for (const entry of filtered) {
      res.write(`${JSON.stringify({ ...entry, siemExport: true })}\n`);
    }
    res.end();
  } catch (error) {
    next(error);
  }
});

export default router;
