const { requireAuth } = require('./auth.middleware');
const { requireRole, requirePermission } = require('./rbac.middleware');
const errorHandler = require('./errorHandler');
const notFoundHandler = require('./notFoundHandler');
const requestLogger = require('./requestLogger');

module.exports = {
  requireAuth,
  requireRole,
  requirePermission,
  errorHandler,
  notFoundHandler,
  requestLogger,
};
