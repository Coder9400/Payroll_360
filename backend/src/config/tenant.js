/**
 * The tenant every pre-existing (pre-multi-tenant) row was backfilled into by
 * migration 006_multi_tenant_foundation.sql. Used as the fallback tenant for
 * mock/dev auth paths and for `POST /auth/signup` (join-as-employee), which
 * doesn't create a new tenant of its own.
 */
const DEFAULT_TENANT_ID = '00000000-0000-4000-9000-000000000001';

module.exports = { DEFAULT_TENANT_ID };
