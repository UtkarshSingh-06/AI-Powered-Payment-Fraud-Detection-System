import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { readData, writeData } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import {
  setAuthCookies,
  clearAuthCookies,
  refreshSession,
  revokeRefreshTokens,
  validatePassword,
  requiresMfa,
  verifyTotpCode
} from '../services/tokenService.js';

const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, password, and name are required' });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const users = await readData('users.json');
    if (users.find((u) => u.email === email)) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const tenantId = req.headers['x-tenant-id'] || process.env.DEFAULT_TENANT_ID || 'default';

    const newUser = {
      userId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email,
      password: hashedPassword,
      name,
      role: 'user',
      tenantId,
      mfaEnabled: false,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    await writeData('users.json', users);

    const { password: _, ...userWithoutPassword } = newUser;
    const tokens = setAuthCookies(res, newUser);

    res.status(201).json({
      message: 'User registered successfully',
      user: userWithoutPassword,
      token: tokens.accessToken
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password, totpCode } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const users = await readData('users.json');
    const user = users.find((u) => u.email === email);

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

  const needsMfa = requiresMfa(user.role) || user.mfaEnabled;
    if (needsMfa) {
      if (!user.mfaSecret && !totpCode) {
        const secret = crypto.randomBytes(20).toString('hex');
        user.mfaSecret = secret;
        user.mfaEnabled = true;
        await writeData('users.json', users);
        return res.status(403).json({
          message: 'MFA enrollment required',
          mfaRequired: true,
          enroll: true,
          mfaSecret: secret,
          hint: 'Use any TOTP app. Dev bypass: set MFA_DEV_BYPASS=true and code 000000'
        });
      }

      if (!totpCode) {
        return res.status(403).json({ message: 'MFA code required', mfaRequired: true });
      }

      if (!verifyTotpCode(user.mfaSecret, totpCode)) {
        return res.status(401).json({ message: 'Invalid MFA code' });
      }
    }

    const { password: _, ...userWithoutPassword } = user;
    const tokens = setAuthCookies(res, user);

    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      token: tokens.accessToken
    });
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const result = await refreshSession(req, res);
    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }
    res.json({ message: 'Token refreshed', user: result.user });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', authenticateToken, async (req, res, next) => {
  try {
    await revokeRefreshTokens(req.user.userId);
    clearAuthCookies(res);
    res.json({ message: 'Logged out' });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const users = await readData('users.json');
    const user = users.find((u) => u.userId === req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { password: _, mfaSecret: __, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
});

export default router;
