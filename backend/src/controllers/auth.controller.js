/**
 * Auth Controller
 */

const authService = require('../services/auth.service');
const roleRepository = require('../repositories/role.repository');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * Register a new user (Public endpoint: strictly assigns employee role).
 * Client-supplied role, roles, permissions, is_admin etc. are silently ignored.
 */
const signup = async (req, res, next) => {
  try {
    // Destructure ONLY the four permitted fields — any extra fields are dropped
    const { email, password, firstName, lastName } = req.body;

    const result = await authService.register({ email, password, firstName, lastName });

    return sendSuccess(res, {
      data: {
        user: result.user,
        profile: result.profile,
        roles: result.roles,
        permissions: result.permissions,
        session: result.session,
      },
      message: 'User registered successfully',
      statusCode: 201,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Log in user and return session + profile
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });

    return sendSuccess(res, {
      data: {
        user: result.user,
        profile: result.profile,
        roles: result.roles,
        permissions: result.permissions,
        session: result.session,
      },
      message: 'Login successful',
      statusCode: 200,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user profile, roles, and permissions
 */
const getMe = async (req, res, next) => {
  try {
    return sendSuccess(res, {
      data: {
        id: req.user.id,
        email: req.user.email,
        profile: req.user.profile,
        roles: req.user.roles,
        permissions: req.user.permissions,
      },
      message: 'Current authenticated user profile retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all system roles
 */
const getRoles = async (req, res, next) => {
  try {
    const roles = await roleRepository.getAllRoles();
    return sendSuccess(res, {
      data: roles,
      message: 'System roles retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Privileged role assignment (Admin only)
 */
const assignRole = async (req, res, next) => {
  try {
    const { targetUserId, role } = req.body;
    const result = await authService.assignUserRole({ targetUserId, newRole: role });

    return sendSuccess(res, {
      data: result,
      message: `Role '${role}' assigned to user successfully`,
      statusCode: 200,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,
  login,
  getMe,
  getRoles,
  assignRole,
};
