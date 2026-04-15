import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import client from 'prom-client';
import { createServer } from 'http';
import { setupWebSocket } from './services/websocket.js';
import { initializeDatabase } from './config/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

const [{ default: authRoutes }, { default: transactionRoutes }, { default: analyticsRoutes }, { default: recommendationRoutes }, { default: adminRoutes }] =
  await Promise.all([
    import('./routes/auth.js'),
    import('./routes/transactions.js'),
    import('./routes/analytics.js'),
    import('./routes/recommendations.js'),
    import('./routes/admin.js')
  ]);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Fraud Detection API is running' });
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
setupWebSocket(server, app);

// Start server (skip auto-listen during tests)
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API Health: http://localhost:${PORT}/api/health`);
  });
}

export default app;
