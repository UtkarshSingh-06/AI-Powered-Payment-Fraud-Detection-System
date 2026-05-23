import express from 'express';
import { readData } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = express.Router();

router.get('/', authenticateToken, requirePermission('audit:read'), async (req, res, next) => {
  try {
    const logs = await readData('auditLogs.json');
    const { limit = 100, eventType } = req.query;
    let filtered = logs;
    if (req.user.role !== 'admin') {
      filtered = logs.filter((log) => log.actorId === req.user.userId);
    }
    if (eventType) {
      filtered = filtered.filter((log) => log.eventType === eventType);
    }
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json({ logs: filtered.slice(0, Number(limit)), count: filtered.length });
  } catch (error) {
    next(error);
  }
});

export default router;
