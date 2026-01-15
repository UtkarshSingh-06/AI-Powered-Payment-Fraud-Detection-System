import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { generateRecommendations } from '../services/recommendations.js';

const router = express.Router();

/**
 * Get personalized recommendations for the authenticated user
 * GET /api/recommendations
 */
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const recommendations = await generateRecommendations(req.user.userId);
    
    res.json({
      recommendations,
      count: recommendations.length,
      userId: req.user.userId
    });
  } catch (error) {
    next(error);
  }
});

export default router;
