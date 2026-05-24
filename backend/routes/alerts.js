import express from 'express';
import { readData } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAnalyst } from '../middleware/auth.js';
import { filterByTenant } from '../utils/tenantFilter.js';

const router = express.Router();

router.get('/', authenticateToken, requireAnalyst, async (req, res, next) => {
  try {
    const alerts = await readData('alerts.json');
    res.json({ alerts: filterByTenant(alerts, req.user) });
  } catch (error) {
    next(error);
  }
});

export default router;
