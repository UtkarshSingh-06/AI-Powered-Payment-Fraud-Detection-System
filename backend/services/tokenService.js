import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { readData, writeData } from '../config/database.js';

const ACCESS_COOKIE = 'fs_access_token';
const REFRESH_COOKIE = 'fs_refresh_token';

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET required');
  return secret;
}

function cookieOptions(maxAgeMs) {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd || process.env.COOKIE_SECURE === 'true',
    sameSite: process.env.COOKIE_SAME_SITE || (isProd ? 'none' : 'lax'),
    maxAge: maxAgeMs,
    path: '/'
  };
}

export function setAuthCookies(res, user) {
  const secret = getSecret();
  const accessExpiresIn = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
  const refreshExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

  const accessToken = jwt.sign(
    {
      userId: user.userId,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId || 'default',
      type: 'access'
    },
    secret,
    { expiresIn: accessExpiresIn }
  );

  const refreshId = uuidv4();
  const refreshToken = jwt.sign(
    {
      userId: user.userId,
      refreshId,
      type: 'refresh'
    },
    secret,
    { expiresIn: refreshExpiresIn }
  );

  const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  storeRefreshToken(refreshId, user.userId, refreshHash).catch(console.error);

  const accessMaxAge = parseDurationMs(accessExpiresIn, 15 * 60 * 1000);
  const refreshMaxAge = parseDurationMs(refreshExpiresIn, 7 * 24 * 60 * 60 * 1000);

  res.cookie(ACCESS_COOKIE, accessToken, cookieOptions(accessMaxAge));
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions(refreshMaxAge));

  return { accessToken, refreshToken };
}

export function clearAuthCookies(res) {
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
}

export function extractAccessToken(req) {
  if (req.cookies?.[ACCESS_COOKIE]) return req.cookies[ACCESS_COOKIE];
  const header = req.headers.authorization || req.headers.Authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

export async function refreshSession(req, res) {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  if (!refreshToken) {
    return { error: 'Refresh token required', status: 401 };
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, getSecret());
  } catch {
    clearAuthCookies(res);
    return { error: 'Invalid refresh token', status: 403 };
  }

  if (payload.type !== 'refresh') {
    return { error: 'Invalid token type', status: 403 };
  }

  const tokens = await readData('refreshTokens.json');
  const record = tokens.find((t) => t.refreshId === payload.refreshId && !t.revoked);
  if (!record) {
    clearAuthCookies(res);
    return { error: 'Refresh token revoked', status: 403 };
  }

  const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  if (record.tokenHash !== refreshHash) {
    clearAuthCookies(res);
    return { error: 'Refresh token mismatch', status: 403 };
  }

  const users = await readData('users.json');
  const user = users.find((u) => u.userId === payload.userId);
  if (!user) {
    return { error: 'User not found', status: 404 };
  }

  record.revoked = true;
  record.revokedAt = new Date().toISOString();
  await writeData('refreshTokens.json', tokens);

  const { password: _, ...safeUser } = user;
  setAuthCookies(res, user);
  return { user: safeUser };
}

export async function revokeRefreshTokens(userId) {
  const tokens = await readData('refreshTokens.json');
  let changed = false;
  for (const token of tokens) {
    if (token.userId === userId && !token.revoked) {
      token.revoked = true;
      token.revokedAt = new Date().toISOString();
      changed = true;
    }
  }
  if (changed) await writeData('refreshTokens.json', tokens);
}

async function storeRefreshToken(refreshId, userId, tokenHash) {
  const tokens = await readData('refreshTokens.json');
  tokens.push({
    refreshId,
    userId,
    tokenHash,
    createdAt: new Date().toISOString(),
    revoked: false
  });
  await writeData('refreshTokens.json', tokens);
}

function parseDurationMs(value, fallback) {
  if (!value) return fallback;
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return fallback;
  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return amount * (multipliers[unit] || 60000);
}

export function validatePassword(password) {
  if (!password || password.length < 12) {
    return 'Password must be at least 12 characters';
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must include upper, lower, and a number';
  }
  return null;
}

export function requiresMfa(role) {
  const required = (process.env.MFA_REQUIRED_ROLES || 'admin,super_admin,analyst')
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);
  return required.includes(role);
}

export function verifyTotpCode(secret, code) {
  if (!secret || !code) return false;
  if (process.env.MFA_DEV_BYPASS === 'true' && code === '000000') return true;
  try {
    const epoch = Math.floor(Date.now() / 1000 / 30);
    for (const offset of [0, -1, 1]) {
      if generateTotp(secret, epoch + offset) === String(code).padStart(6, '0')) {
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

function generateTotp(secret, counter) {
  const key = Buffer.from(secret.replace(/\s/g, '').toUpperCase(), 'utf8');
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, '0');
}
