import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export function getJwtSecret() {
  return process.env.JWT_SECRET || process.env.API_KEY_SECRET;
}

export function verifyAccessToken(token) {
  const secret = getJwtSecret();
  if (!secret || !token) return null;
  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

export function extractBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

export function createGatewayAuthMiddleware(options = {}) {
  const publicPaths = options.publicPaths || ['/health'];
  const internalSecret = process.env.GATEWAY_INTERNAL_SECRET || process.env.JWT_SECRET;

  return (req, res, next) => {
    if (publicPaths.some((p) => req.path === p || req.path.startsWith(`${p}/`))) {
      return next();
    }

    const token = extractBearerToken(req);
    const user = verifyAccessToken(token);
    if (!user) {
      return res.status(401).json({ message: 'Valid Bearer token or API key required' });
    }

    req.user = user;
    req.authToken = token;
    req.headers['x-tenant-id'] = user.tenantId || req.headers['x-tenant-id'] || 'default';
    req.headers['x-user-id'] = user.userId;
    req.headers['x-user-role'] = user.role || 'user';
    if (internalSecret) {
      req.headers['x-gateway-auth'] = internalSecret;
    }
    return next();
  };
}

export function createServiceAuthMiddleware() {
  const internalSecret = process.env.GATEWAY_INTERNAL_SECRET || process.env.JWT_SECRET;

  return (req, res, next) => {
    if (req.path === '/health') return next();

    if (internalSecret && req.headers['x-gateway-auth'] === internalSecret) {
      req.user = {
        userId: req.headers['x-user-id'],
        role: req.headers['x-user-role'] || 'api_client',
        tenantId: req.headers['x-tenant-id'] || 'default'
      };
      return next();
    }

    const token = extractBearerToken(req);
    const user = verifyAccessToken(token);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    req.user = user;
    return next();
  };
}

export function hashApiKey(rawKey) {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

export function generateApiKeyRaw() {
  return `fs_live_${crypto.randomBytes(24).toString('hex')}`;
}
