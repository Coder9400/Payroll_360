/**
 * Multi-tenant query helpers.
 *
 * Every table added in migration 006 carries a NOT NULL tenant_id column.
 * These helpers are the single place that enforces "never read or write a
 * row without a tenant filter" — controllers/services should never call
 * `.eq('tenant_id', ...)` inline, so a missing tenantId always fails loudly
 * instead of silently returning/writing cross-tenant data.
 */

const AppError = require('./appError');

/**
 * Wrap a Supabase query builder with a tenant filter.
 * @param {*} query - a Supabase query builder (e.g. db.from('employees').select(...))
 * @param {string} tenantId - req.user.tenantId
 */
function withTenant(query, tenantId) {
  if (!tenantId) {
    throw new AppError('Tenant context missing', 500, 'TENANT_CONTEXT_MISSING');
  }
  return query.eq('tenant_id', tenantId);
}

/**
 * Prepare an insert/update payload for a tenant-scoped table: strips any
 * client-supplied tenant_id (never trust the caller) and injects the real one.
 * @param {object} body - req.body or similar
 * @param {string} tenantId - req.user.tenantId
 */
function withTenantId(body, tenantId) {
  if (!tenantId) {
    throw new AppError('Tenant context missing', 500, 'TENANT_CONTEXT_MISSING');
  }
  const { tenant_id, ...rest } = body || {};
  return { ...rest, tenant_id: tenantId };
}

module.exports = { withTenant, withTenantId };
