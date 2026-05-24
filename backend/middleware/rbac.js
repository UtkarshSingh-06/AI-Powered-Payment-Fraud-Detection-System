const ROLE_PERMISSIONS = {
  super_admin: ['*'],
  admin: ['*'],
  analyst: ['transactions:read', 'cases:read', 'cases:write', 'audit:read', 'apikeys:read'],
  user: ['transactions:read', 'transactions:write', 'billing:write', 'apikeys:read', 'apikeys:write'],
  api_client: ['transactions:write', 'ingest:write', 'billing:write', 'score:read']
};

export function requirePermission(permission) {
  return (req, res, next) => {
    const role = req.user?.role || 'user';
    const allowed = ROLE_PERMISSIONS[role] || [];
    if (allowed.includes('*') || allowed.includes(permission)) {
      return next();
    }
    return res.status(403).json({ message: `Missing permission: ${permission}` });
  };
}
