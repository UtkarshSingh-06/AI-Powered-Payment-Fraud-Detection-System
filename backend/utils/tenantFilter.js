/** Tenant-scoped data access helpers */

export function getRequestTenantId(user, headerTenantId) {
  return user?.tenantId || headerTenantId || 'default';
}

export function canAccessTenant(user, resourceTenantId) {
  const tenant = resourceTenantId || 'default';
  if (user?.role === 'super_admin') return true;
  if ((user?.tenantId || 'default') === tenant) return true;
  return false;
}

export function filterByTenant(items, user, { tenantField = 'tenantId', userField = 'userId' } = {}) {
  const tenantId = user?.tenantId || 'default';

  if (user?.role === 'super_admin') {
    return items;
  }

  return items.filter((item) => {
    const itemTenant = item[tenantField] || 'default';
    if (itemTenant !== tenantId) return false;
    if (user?.role === 'admin' || user?.role === 'analyst') return true;
    return item[userField] === user?.userId;
  });
}
