const authService = require('../services/auth.service');
const AppError = require('../utils/appError');

/**
 * Authentication middleware that verifies Supabase bearer tokens
 * and loads the authenticated user profile, roles, and permissions.
 */
const requireAuth = () => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
        return next(new AppError('Authentication required: Missing or malformed Bearer token', 401, 'UNAUTHORIZED'));
      }

      const parts = authHeader.trim().split(/\s+/);
      if (parts.length < 2 || !parts[1]) {
        return next(new AppError('Authentication required: No token provided in Bearer header', 401, 'UNAUTHORIZED'));
      }

      const token = parts[1];
      const { user, profile, roles, permissions } = await authService.validateTokenAndGetUser(token);

      // Attach trusted security context to Express request
      req.user = {
        id: user.id,
        email: user.email,
        profile,
        roles,
        permissions,
      };

      next();
    } catch (error) {
      if (error.statusCode === 401 || error.statusCode === 403) {
        return next(error);
      }
      return next(new AppError('Authentication failed: Invalid session or token', 401, 'UNAUTHORIZED'));
    }
  };
};

module.exports = {
  requireAuth,
};
