import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import client from 'prom-client';
import { createServer } from 'http';
import { setupWebSocket } from './services/websocket.js';
import { initializeDatabase } from './config/database.js';
import { runEnterpriseMigrations } from './config/migrations.js';
import { startScoringConsumer } from './workers/scoringConsumer.js';
import { startLabelConsumer } from './workers/labelConsumer.js';
import { resolveTenant } from './middleware/tenant.js';
import { structuredLogMiddleware } from './middleware/structuredLog.js';
import { runDeepHealthCheck } from './services/healthCheck.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 5000;
const corsOriginEnv =
  process.env.CORS_ORIGIN || 'http://localhost:3002,http://localhost:3000';
const allowedOrigins = corsOriginEnv
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: process.env.SERVE_FRONTEND === 'true' ? { policy: 'cross-origin' } : undefined
}));
app.use(compression());
app.use(cookieParser());

const { default: stripeWebhookRoutes } = await import('./routes/webhooks/stripe.js');
app.use('/api/webhooks/stripe', stripeWebhookRoutes);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(structuredLogMiddleware);
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: Number(process.env.RATE_LIMIT_PER_MINUTE || 120)
  })
);

const register = new client.Registry();
client.collectDefaultMetrics({ register });

app.get('/api/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

await initializeDatabase();
await runEnterpriseMigrations();

const [
  { default: authRoutes },
  { default: transactionRoutes },
  { default: analyticsRoutes },
  { default: recommendationRoutes },
  { default: adminRoutes },
  { default: auditRoutes },
  { default: billingRoutes },
  { default: complianceRoutes },
  { default: apiKeyRoutes },
  { default: alertsRoutes },
  { default: casesRoutes }
] = await Promise.all([
  import('./routes/auth.js'),
  import('./routes/transactions.js'),
  import('./routes/analytics.js'),
  import('./routes/recommendations.js'),
  import('./routes/admin.js'),
  import('./routes/audit.js'),
  import('./routes/billing.js'),
  import('./routes/compliance.js'),
  import('./routes/apiKeys.js'),
  import('./routes/alerts.js'),
  import('./routes/cases.js')
]);

// API Routes — tenant context for all authenticated resources
app.use(resolveTenant);
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/cases', casesRoutes);

if (process.env.SERVE_FRONTEND === 'true') {
  const publicDir = path.join(__dirname, 'public');
  app.use(express.static(publicDir));
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

app.get('/api/docs', (_req, res) => {
  res.redirect(302, '/openapi/fraudshield-api.yaml');
});

// Health check (liveness)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Fraud Detection API is running' });
});

// Deep health (readiness — dependency checks)
app.get('/api/health/deep', async (_req, res) => {
  const report = await runDeepHealthCheck();
  const statusCode = report.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(report);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Create HTTP server
const server = createServer(app);

// Setup WebSocket for real-time updates
setupWebSocket(server);

// Kafka async scoring consumer (event-driven ingest path)
if (process.env.KAFKA_BROKERS) {
  startScoringConsumer().catch((err) => console.warn('Scoring consumer:', err.message));
  startLabelConsumer().catch((err) => console.warn('Label consumer:', err.message));
}

// Start server (skip auto-listen during tests)
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API Health: http://localhost:${PORT}/api/health`);
  });
}

export default app;
