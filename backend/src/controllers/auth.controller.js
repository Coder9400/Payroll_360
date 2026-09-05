const authService = require('../services/auth.service');
const roleRepository = require('../repositories/role.repository');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * Register a new user
 */
const signup = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;
    const result = await authService.register({
      email,
      password,
      firstName,
      lastName,
      role,
    });

    return sendSuccess(res, {
      data: result,
      message: 'User registered successfully',
      statusCode: 201,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Log in user and generate session
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });

    return sendSuccess(res, {
      data: result,
      message: 'Login successful',
      statusCode: 200,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user profile and permissions
 */
const getMe = async (req, res, next) => {
  try {
    const userData = {
      id: req.user.id,
      email: req.user.email,
      profile: req.user.profile,
      roles: req.user.roles,
      permissions: req.user.permissions,
    };

    return sendSuccess(res, {
      data: userData,
      message: 'Current authenticated user profile retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get available roles in system
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

module.exports = {
  signup,
  login,
  getMe,
  getRoles,
};
