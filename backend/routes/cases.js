import express from 'express';
import { readData } from '../config/database.js';
import { authenticateToken, requireAnalyst } from '../middleware/auth.js';
import { filterByTenant } from '../utils/tenantFilter.js';

const router = express.Router();

router.get('/', authenticateToken, requireAnalyst, async (req, res, next) => {
  try {
    const cases = await readData('cases.json');
    res.json({ cases: filterByTenant(cases, req.user) });
  } catch (error) {
    next(error);
  }
});

router.patch('/:caseId', authenticateToken, requireAnalyst, async (req, res, next) => {
  try {
    const cases = await readData('cases.json');
    const tenantId = req.user.tenantId || 'default';
    const index = cases.findIndex(
      (c) => (c.caseId || c.case_id) === req.params.caseId && (c.tenantId || c.payload?.tenantId) === tenantId
    );
    if (index === -1) return res.status(404).json({ message: 'Case not found' });

    if (req.body.status) cases[index].status = req.body.status;
    if (req.body.note) {
      cases[index].payload = cases[index].payload || {};
      cases[index].payload.notes = cases[index].payload.notes || [];
      cases[index].payload.notes.push({ at: new Date().toISOString(), text: req.body.note });
    }

    const { writeData } = await import('../config/database.js');
    await writeData('cases.json', cases);
    res.json(cases[index]);
  } catch (error) {
    next(error);
  }
});

export default router;
