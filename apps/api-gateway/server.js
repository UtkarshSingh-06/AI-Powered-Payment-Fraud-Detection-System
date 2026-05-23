import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT || 8080;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';
const INGESTION_SERVICE_URL = process.env.INGESTION_SERVICE_URL || 'http://localhost:5002';
const SCORING_SERVICE_URL = process.env.SCORING_SERVICE_URL || 'http://localhost:5003';
const CASE_SERVICE_URL = process.env.CASE_SERVICE_URL || 'http://localhost:5004';
const RULES_ENGINE_URL = process.env.RULES_ENGINE_URL || 'http://localhost:5005';

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(rateLimit({ windowMs: 60_000, max: Number(process.env.RATE_LIMIT_PER_MINUTE || 300) }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

app.get('/docs', (_req, res) => {
  res.redirect('/api/docs');
});

app.use('/api/auth', createProxyMiddleware({ target: AUTH_SERVICE_URL, changeOrigin: true }));
app.use('/api/ingest', createProxyMiddleware({ target: INGESTION_SERVICE_URL, changeOrigin: true }));
app.use('/api/score', createProxyMiddleware({ target: SCORING_SERVICE_URL, changeOrigin: true }));
app.use('/api/cases', createProxyMiddleware({ target: CASE_SERVICE_URL, changeOrigin: true }));
app.use('/api/rules', createProxyMiddleware({ target: RULES_ENGINE_URL, changeOrigin: true }));
app.use('/api', createProxyMiddleware({ target: BACKEND_URL, changeOrigin: true }));
app.use('/ws', createProxyMiddleware({ target: BACKEND_URL, changeOrigin: true, ws: true }));

app.listen(PORT, () => {
  console.log(`API Gateway listening on http://localhost:${PORT}`);
});
