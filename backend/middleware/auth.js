import { verifyAccessToken } from '@fraudshield/platform-auth';
import { extractAccessToken } from '../services/tokenService.js';
import { readData } from '../config/database.js';

export async function authenticateToken(req, res, next) {
  const token = extractAccessToken(req);

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  const user = verifyAccessToken(token);
  if (!user) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }

  if (user.type && user.type !== 'access' && user.authType !== 'api_key') {
    return res.status(403).json({ message: 'Invalid token type' });
  }

  if (user.authType === 'api_key' && user.keyId) {
    validateApiKeyRecord(user.keyId)
      .then((valid) => {
        if (!valid) return res.status(403).json({ message: 'API key revoked or invalid' });
        req.user = user;
        next();
      })
      .catch(() => res.status(500).json({ message: 'Auth validation failed' }));
    return;
  }

  req.user = user;
  next();
}

async function validateApiKeyRecord(keyId) {
  const keys = await readData('apiKeys.json');
  const record = keys.find((k) => k.keyId === keyId);
  return Boolean(record && !record.revoked);
}

export function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

export function requireAdminOrOwner(req, res, next) {
  const userId = req.params.userId || req.body.userId || req.query.userId;

  if (req.user.role === 'admin' || req.user.role === 'super_admin' || req.user.userId === userId) {
    return next();
  }

  return res.status(403).json({ message: 'Access denied' });
}

export function requireAnalyst(req, res, next) {
  const allowed = ['admin', 'super_admin', 'analyst'];
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ message: 'Analyst access required' });
  }
  next();
}
