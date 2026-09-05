const authService = require('../services/auth.service');
const AppError = require('../utils/appError');
const { supabaseAdmin, supabase, isConfigured } = require('../config/supabase');

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

      const tenantId = profile?.tenant_id || null;
      if (!tenantId) {
        return next(new AppError('Tenant context could not be resolved for this user', 403, 'TENANT_NOT_RESOLVED'));
      }

      let employee = null;
      if (isConfigured && (supabaseAdmin || supabase)) {
        const client = supabaseAdmin || supabase;
        const { data: empData } = await client
          .from('employees')
          .select('id, employee_code, first_name, last_name, department_id, employment_status')
          .eq('user_id', user.id)
          .maybeSingle();
        if (empData) employee = empData;
      }

      // Attach trusted security context to Express request
      req.user = {
        id: user.id,
        email: user.email,
        tenantId,
        profile,
        roles,
        permissions,
        employee,
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
