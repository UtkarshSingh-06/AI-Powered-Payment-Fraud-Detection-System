import express from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { readData, writeData } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { generateApiKeyRaw, hashApiKey } from '@fraudshield/platform-auth';

const router = express.Router();

function getJwtConfig() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET required');
  return { secret, expiresIn: process.env.API_KEY_EXPIRES_IN || '365d' };
}

router.get('/', authenticateToken, requirePermission('apikeys:read'), async (req, res, next) => {
  try {
    const keys = await readData('apiKeys.json');
    const tenantId = req.user.tenantId || 'default';
    const visible = keys.filter(
      (k) => k.tenantId === tenantId && (req.user.role === 'admin' || k.createdBy === req.user.userId)
    );
    res.json({
      keys: visible.map(({ keyHash, ...rest }) => rest)
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticateToken, requirePermission('apikeys:write'), async (req, res, next) => {
  try {
    const { name, scopes = ['ingest:write', 'score:read'] } = req.body;
    if (!name) return res.status(400).json({ message: 'Key name is required' });

    const rawKey = generateApiKeyRaw();
    const keyId = uuidv4();
    const tenantId = req.user.tenantId || 'default';
    const { secret, expiresIn } = getJwtConfig();

    const token = jwt.sign(
      {
        authType: 'api_key',
        keyId,
        userId: req.user.userId,
        tenantId,
        role: 'api_client',
        scopes
      },
      secret,
      { expiresIn }
    );

    const record = {
      keyId,
      name,
      prefix: rawKey.slice(0, 12),
      keyHash: hashApiKey(rawKey),
      tenantId,
      scopes,
      createdBy: req.user.userId,
      createdAt: new Date().toISOString(),
      revoked: false
    };

    const keys = await readData('apiKeys.json');
    keys.push(record);
    await writeData('apiKeys.json', keys);

    res.status(201).json({
      keyId,
      name,
      apiKey: rawKey,
      bearerToken: token,
      message: 'Store the apiKey securely — it will not be shown again. Use Bearer token for SDK calls.'
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:keyId', authenticateToken, requirePermission('apikeys:write'), async (req, res, next) => {
  try {
    const keys = await readData('apiKeys.json');
    const tenantId = req.user.tenantId || 'default';
    const index = keys.findIndex(
      (k) => k.keyId === req.params.keyId && k.tenantId === tenantId && !k.revoked
    );
    if (index === -1) return res.status(404).json({ message: 'API key not found' });

    keys[index].revoked = true;
    keys[index].revokedAt = new Date().toISOString();
    await writeData('apiKeys.json', keys);
    res.json({ message: 'API key revoked', keyId: req.params.keyId });
  } catch (error) {
    next(error);
  }
});

export default router;
