const AppError = require('../utils/appError');
const { ROLES, PERMISSIONS } = require('../config/rbacConstants');

/**
 * Middleware requiring specific role(s) to access a route
 * @param  {...string} allowedRoles - Role slugs allowed (e.g. 'admin', 'hr_manager')
 */
const requireRole = (...allowedRoles) => {
  const rolesList = allowedRoles.flat().map((r) => r.toLowerCase());

  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required before role check', 401, 'UNAUTHORIZED'));
    }

    const userRoles = (req.user.roles || []).map((r) => r.toLowerCase());

    // Admin has superuser access
    if (userRoles.includes(ROLES.ADMIN)) {
      return next();
    }

    // Check if user has at least one allowed role
    const hasRole = rolesList.some((role) => userRoles.includes(role));

    if (!hasRole) {
      return next(
        new AppError(
          `Forbidden: Access denied. Required role: [${rolesList.join(', ')}]. Current roles: [${userRoles.join(', ')}]`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
};

/**
 * Middleware requiring specific granular permission(s) to access a route
 * @param  {...string} requiredPermissions - Permission slugs required (e.g. 'payroll:process', 'salary_structure:manage')
 */
const requirePermission = (...requiredPermissions) => {
  const permsList = requiredPermissions.flat();

  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required before permission check', 401, 'UNAUTHORIZED'));
    }

    const userRoles = req.user.roles || [];
    const userPermissions = req.user.permissions || [];

    // Admin role or admin:all permission bypasses specific checks
    if (userRoles.includes(ROLES.ADMIN) || userPermissions.includes(PERMISSIONS.ADMIN_ALL)) {
      return next();
    }

    // Verify all required permissions are held by the user
    const missingPermissions = permsList.filter((perm) => !userPermissions.includes(perm));

    if (missingPermissions.length > 0) {
      return next(
        new AppError(
          `Forbidden: Insufficient permissions. Missing: [${missingPermissions.join(', ')}]`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
};

module.exports = {
  requireRole,
  requirePermission,
};
