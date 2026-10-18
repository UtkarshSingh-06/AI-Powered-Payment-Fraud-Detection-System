import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken, requireAnalyst } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import * as store from '../services/scamshield/store.js';
import {
  ingestFromFeed,
  ingestManualIndicator,
  runCorrelation
} from '../services/scamshield/ingest.js';
import { NormalizationError } from '../services/scamshield/normalize.js';

const router = Router();

const ingestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.SCAMSHIELD_INGEST_RATE_PER_MINUTE || 5),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'ScamShield ingest rate limit exceeded' }
});

router.use(authenticateToken);
router.use(requireAnalyst);

/**
 * GET /api/scamshield/indicators
 * Search & paginate indicators.
 */
router.get(
  '/indicators',
  requirePermission('scamshield:read'),
  async (req, res) => {
    try {
      const result = await store.searchIndicators({
        q: req.query.q || '',
        type: req.query.type || null,
        sourceId: req.query.source || null,
        minConfidence: req.query.minConfidence != null ? Number(req.query.minConfidence) : null,
        limit: req.query.limit,
        offset: req.query.offset
      });
      res.json({
        indicators: result.items,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset
        },
        disclaimer:
          'Indicators are unverified intelligence for investigation only. Do not auto-block.'
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to search indicators' });
    }
  }
);

/**
 * GET /api/scamshield/indicators/:id
 */
router.get(
  '/indicators/:id',
  requirePermission('scamshield:read'),
  async (req, res) => {
    try {
      const indicator = await store.getIndicatorById(req.params.id);
      if (!indicator) return res.status(404).json({ message: 'Indicator not found' });

      const [observations, relationships] = await Promise.all([
        store.getObservationsForIndicator(indicator.indicatorId),
        store.getRelationshipsForIndicator(indicator.indicatorId)
      ]);

      // Timeline: observations sorted ascending
      const timeline = [...observations].sort(
        (a, b) => new Date(a.observedAt) - new Date(b.observedAt)
      );

      res.json({
        indicator,
        observations: timeline,
        relationships,
        confidence: {
          value: indicator.confidence,
          explanation: indicator.confidenceExplanation
        },
        disclaimer:
          'Source evidence is preserved append-only. Confidence is explainable and not an automatic block decision.'
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to load indicator' });
    }
  }
);

/**
 * POST /api/scamshield/indicators
 * Manual submit — never fetches the URL.
 */
router.post(
  '/indicators',
  requirePermission('scamshield:write'),
  async (req, res) => {
    try {
      const { value, type, tags } = req.body || {};
      if (!value || typeof value !== 'string') {
        return res.status(400).json({ message: 'value is required' });
      }
      if (value.length > 2048) {
        return res.status(400).json({ message: 'value too long' });
      }
      const result = await ingestManualIndicator({
        value,
        type: type || null,
        tags: Array.isArray(tags) ? tags.slice(0, 20).map(String) : [],
        createdBy: req.user?.userId || req.user?.email || null
      });
      res.status(201).json({
        ...result,
        note: 'Indicator recorded without fetching the URL (SSRF prevention).'
      });
    } catch (error) {
      if (error instanceof NormalizationError) {
        return res.status(400).json({ message: error.message, code: error.code });
      }
      res.status(500).json({ message: 'Failed to ingest indicator' });
    }
  }
);

/**
 * POST /api/scamshield/ingest/:feed
 * Trigger feed pull (urlhaus | openphish). Admin/analyst with ingest permission.
 */
router.post(
  '/ingest/:feed',
  requirePermission('scamshield:ingest'),
  ingestLimiter,
  async (req, res) => {
    const feed = String(req.params.feed || '').toLowerCase();
    if (!['urlhaus', 'openphish'].includes(feed)) {
      return res.status(400).json({ message: 'Unsupported feed. Use urlhaus or openphish.' });
    }
    try {
      // Allow test injection of body payload without live network
      const options = {};
      if (req.body?.csvText) options.csvText = req.body.csvText;
      if (req.body?.feedText) options.feedText = req.body.feedText;
      if (req.body?.force) options.force = true;
      if (process.env.NODE_ENV === 'test') options.skipRateLimit = true;

      const result = await ingestFromFeed(feed, options);
      const statusCode = result.status === 'failed' ? 502 : 200;
      res.status(statusCode).json({
        feed,
        ...result,
        disclaimer: 'Ingested intelligence is for investigation only.'
      });
    } catch (error) {
      res.status(502).json({
        message: 'Feed ingestion failed',
        code: error.code || 'FEED_ERROR',
        detail: error.message
      });
    }
  }
);

/**
 * POST /api/scamshield/correlate
 * Re-run deterministic correlation rules.
 */
router.post(
  '/correlate',
  requirePermission('scamshield:write'),
  async (_req, res) => {
    try {
      const result = await runCorrelation();
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Correlation failed' });
    }
  }
);

/**
 * Investigations CRUD (lightweight)
 */
router.get(
  '/investigations',
  requirePermission('scamshield:read'),
  async (req, res) => {
    try {
      const result = await store.listInvestigations({
        limit: req.query.limit,
        offset: req.query.offset
      });
      res.json({
        investigations: result.items,
        pagination: { total: result.total, limit: result.limit, offset: result.offset }
      });
    } catch {
      res.status(500).json({ message: 'Failed to list investigations' });
    }
  }
);

router.post(
  '/investigations',
  requirePermission('scamshield:write'),
  async (req, res) => {
    try {
      const title = String(req.body?.title || '').trim();
      if (!title || title.length > 200) {
        return res.status(400).json({ message: 'title is required (max 200 chars)' });
      }
      const inv = await store.createInvestigation({
        title,
        notes: String(req.body?.notes || '').slice(0, 5000),
        createdBy: req.user?.userId || null
      });
      res.status(201).json({ investigation: inv });
    } catch {
      res.status(500).json({ message: 'Failed to create investigation' });
    }
  }
);

router.get(
  '/investigations/:id',
  requirePermission('scamshield:read'),
  async (req, res) => {
    try {
      const inv = await store.getInvestigation(req.params.id);
      if (!inv) return res.status(404).json({ message: 'Investigation not found' });
      const indicators = await store.getInvestigationIndicators(inv.investigationId);
      res.json({ investigation: inv, indicators });
    } catch {
      res.status(500).json({ message: 'Failed to load investigation' });
    }
  }
);

router.patch(
  '/investigations/:id',
  requirePermission('scamshield:write'),
  async (req, res) => {
    try {
      const patch = {};
      if (req.body?.status) {
        if (!['open', 'investigating', 'closed'].includes(req.body.status)) {
          return res.status(400).json({ message: 'Invalid status' });
        }
        patch.status = req.body.status;
      }
      if (req.body?.notes != null) patch.notes = String(req.body.notes).slice(0, 5000);
      if (req.body?.title) patch.title = String(req.body.title).slice(0, 200);
      const inv = await store.updateInvestigation(req.params.id, patch);
      if (!inv) return res.status(404).json({ message: 'Investigation not found' });
      res.json({ investigation: inv });
    } catch {
      res.status(500).json({ message: 'Failed to update investigation' });
    }
  }
);

router.post(
  '/investigations/:id/indicators',
  requirePermission('scamshield:write'),
  async (req, res) => {
    try {
      const inv = await store.getInvestigation(req.params.id);
      if (!inv) return res.status(404).json({ message: 'Investigation not found' });
      const indicatorId = req.body?.indicatorId;
      if (!indicatorId) return res.status(400).json({ message: 'indicatorId required' });
      const indicator = await store.getIndicatorById(indicatorId);
      if (!indicator) return res.status(404).json({ message: 'Indicator not found' });
      await store.linkIndicatorToInvestigation(inv.investigationId, indicatorId, req.body?.notes);
      res.status(201).json({ linked: true });
    } catch {
      res.status(500).json({ message: 'Failed to link indicator' });
    }
  }
);

export default router;
