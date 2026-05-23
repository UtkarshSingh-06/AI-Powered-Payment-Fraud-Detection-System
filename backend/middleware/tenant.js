export function resolveTenant(req, _res, next) {
  req.user = req.user || {};
  req.user.tenantId =
    req.headers['x-tenant-id'] ||
    req.user.tenantId ||
    process.env.DEFAULT_TENANT_ID ||
    'default';
  next();
}

export function requireTenantAccess(req, res, next) {
  const resourceTenant = req.params.tenantId || req.body?.tenantId;
  if (!resourceTenant || resourceTenant === req.user?.tenantId || req.user?.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Tenant access denied' });
}
