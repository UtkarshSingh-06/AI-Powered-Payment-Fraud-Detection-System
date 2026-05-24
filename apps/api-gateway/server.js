import express from 'express';
import { createGatewayAuthMiddleware } from '@fraudshield/platform-auth';
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
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5006';
const AML_SERVICE_URL = process.env.AML_SERVICE_URL || 'http://localhost:5007';
const SANDBOX_SERVICE_URL = process.env.SANDBOX_SERVICE_URL || 'http://localhost:5008';

const requireAuth = createGatewayAuthMiddleware({ publicPaths: [] });

function proxy(target, pathRewrite) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite,
    onProxyReq(proxyReq, req) {
      if (req.headers['x-correlation-id']) {
        proxyReq.setHeader('x-correlation-id', req.headers['x-correlation-id']);
      }
      if (req.headers['x-tenant-id']) {
        proxyReq.setHeader('x-tenant-id', req.headers['x-tenant-id']);
      }
      if (req.headers['x-user-id']) {
        proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
      }
      if (req.headers['x-user-role']) {
        proxyReq.setHeader('x-user-role', req.headers['x-user-role']);
      }
      if (req.headers['x-gateway-auth']) {
        proxyReq.setHeader('x-gateway-auth', req.headers['x-gateway-auth']);
      }
      if (req.authToken) {
        proxyReq.setHeader('Authorization', `Bearer ${req.authToken}`);
      }
    }
  });
}

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(rateLimit({ windowMs: 60_000, max: Number(process.env.RATE_LIMIT_PER_MINUTE || 300) }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api-gateway', version: '2.1.0', auth: 'required' });
});

app.get('/docs', (_req, res) => {
  res.redirect('/api/docs');
});

app.use('/api/auth', proxy(AUTH_SERVICE_URL, { '^/api/auth': '/api/auth' }));

app.use(requireAuth);
app.use('/api/ingest', proxy(INGESTION_SERVICE_URL, { '^/api/ingest': '' }));
app.use('/api/score', proxy(SCORING_SERVICE_URL, { '^/api/score': '' }));
app.use('/api/cases', proxy(CASE_SERVICE_URL, { '^/api/cases': '' }));
app.use('/api/rules', proxy(RULES_ENGINE_URL, { '^/api/rules': '' }));
app.use('/api/notify', proxy(NOTIFICATION_SERVICE_URL, { '^/api/notify': '' }));
app.use('/api/aml', proxy(AML_SERVICE_URL, { '^/api/aml': '' }));
app.use('/api/sandbox', proxy(SANDBOX_SERVICE_URL, { '^/api/sandbox': '' }));
app.use('/api', proxy(BACKEND_URL));
app.use('/ws', createProxyMiddleware({ target: BACKEND_URL, changeOrigin: true, ws: true }));

app.listen(PORT, () => {
  console.log(`API Gateway listening on http://localhost:${PORT} (JWT required for microservices)`);
});
