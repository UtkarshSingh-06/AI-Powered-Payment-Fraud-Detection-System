import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT || 5001;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'auth-service' }));

// OAuth2/OIDC placeholder — integrate Keycloak/Cognito in production
app.get('/oauth/authorize', (_req, res) => {
  res.json({
    message: 'OAuth2 authorization endpoint',
    provider: process.env.OAUTH_PROVIDER || 'keycloak',
    authorizeUrl: process.env.OAUTH_AUTHORIZE_URL || null
  });
});

app.post('/oauth/token', (_req, res) => {
  res.status(501).json({ message: 'Configure OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET for token exchange' });
});

app.post('/mfa/verify', (_req, res) => {
  const { code } = req.body;
  if (code === '000000' && process.env.NODE_ENV !== 'production') {
    return res.json({ verified: true, method: 'totp-dev-bypass' });
  }
  res.status(401).json({ verified: false, message: 'Invalid MFA code' });
});

app.use(
  '/api/auth',
  createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true
  })
);

app.listen(PORT, () => console.log(`Auth service on :${PORT}`));
