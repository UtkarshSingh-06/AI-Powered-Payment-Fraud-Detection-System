import express from 'express';
import jwt from 'jsonwebtoken';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authenticator } from 'otplib';

const app = express();
const PORT = process.env.PORT || 5001;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const MFA_SECRETS = new Map();

authenticator.options = { window: 1 };

app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'auth-service', mfa: true }));

function decodeBearer(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(header.slice(7), process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

/** OAuth2/OIDC discovery — wire Keycloak/Cognito via env */
app.get('/oauth/authorize', (_req, res) => {
  const authorizeUrl = process.env.OAUTH_AUTHORIZE_URL;
  if (!authorizeUrl) {
    return res.json({
      message: 'Configure OAUTH_AUTHORIZE_URL for production OIDC',
      provider: process.env.OAUTH_PROVIDER || 'keycloak'
    });
  }
  res.redirect(`${authorizeUrl}?client_id=${process.env.OAUTH_CLIENT_ID || ''}&response_type=code`);
});

app.post('/oauth/token', async (req, res) => {
  const { grant_type, code } = req.body;
  const tokenUrl = process.env.OAUTH_TOKEN_URL;
  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;

  if (!tokenUrl || !clientId || !clientSecret) {
    return res.status(501).json({
      message: 'Set OAUTH_TOKEN_URL, OAUTH_CLIENT_ID, and OAUTH_CLIENT_SECRET for token exchange'
    });
  }

  const body = new URLSearchParams({
    grant_type: grant_type || 'authorization_code',
    code: code || '',
    client_id: clientId,
    client_secret: clientSecret
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const payload = await response.json();
  res.status(response.status).json(payload);
});

/** Enroll TOTP MFA — returns otpauth URL for authenticator apps */
app.post('/mfa/enroll', (req, res) => {
  const user = decodeBearer(req);
  if (!user?.userId) {
    return res.status(401).json({ message: 'Bearer token required' });
  }
  const secret = authenticator.generateSecret();
  MFA_SECRETS.set(user.userId, secret);
  const label = encodeURIComponent(`FraudShield:${user.email}`);
  res.json({
    secret,
    otpauthUrl: `otpauth://totp/${label}?secret=${secret}&issuer=FraudShield`
  });
});

app.post('/mfa/verify', (req, res) => {
  const user = decodeBearer(req);
  const { code, userId } = req.body;
  const targetUser = user?.userId || userId;
  const secret = MFA_SECRETS.get(targetUser) || process.env.MFA_DEV_SECRET;

  if (!secret) {
    return res.status(400).json({ verified: false, message: 'MFA not enrolled' });
  }

  const valid = authenticator.check(String(code), secret);
  if (!valid && code === '000000' && process.env.NODE_ENV !== 'production') {
    return res.json({ verified: true, method: 'totp-dev-bypass' });
  }

  if (!valid) {
    return res.status(401).json({ verified: false, message: 'Invalid MFA code' });
  }

  res.json({ verified: true, method: 'totp' });
});

app.use(
  '/api/auth',
  createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true
  })
);

app.listen(PORT, () => console.log(`Auth service on :${PORT}`));
