import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fraud-detection-secret-key-change-in-production';

// Verify JWT token
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Check if user is admin
export function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

// Check if user is admin or owns the resource
export function requireAdminOrOwner(req, res, next) {
  const userId = req.params.userId || req.body.userId || req.query.userId;
  
  if (req.user.role === 'admin' || req.user.userId === userId) {
    return next();
  }
  
  return res.status(403).json({ message: 'Access denied' });
}
