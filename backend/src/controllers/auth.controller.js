const authService = require('../services/auth.service');
const roleRepository = require('../repositories/role.repository');
const { supabase, supabaseAdmin, isConfigured } = require('../config/supabase');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * Register a new user (Public endpoint: strictly assigns employee role)
 */
const signup = async (req, res, next) => {
  try {
    // Explicitly destructure only allowed fields - ignore any client-supplied role or permissions
    const { email, password, firstName, lastName } = req.body;
    
    const result = await authService.register({
      email,
      password,
      firstName,
      lastName,
    });

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
 * Register a brand new company (Public endpoint): creates a Tenant, a default
 * Legal Entity/Department/Job Position/Working Schedule, and the signing-up
 * user as that tenant's Owner/Admin with their own Employee record.
 */
const signupCompany = async (req, res, next) => {
  try {
    const { companyName, email, password, firstName, lastName } = req.body;

    const result = await authService.registerCompany({
      companyName,
      email,
      password,
      firstName,
      lastName,
    });

    return sendSuccess(res, {
      data: {
        user: result.user,
        tenant: result.tenant,
        employee: result.employee,
        profile: result.profile,
        roles: result.roles,
        permissions: result.permissions,
      },
      message: 'Company registered successfully',
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
 * Logout — invalidate Supabase session
 */
const logout = async (req, res, next) => {
  try {
    // Extract token from Authorization header if present
    const authHeader = req.headers.authorization;
    if (authHeader && isConfigured && supabase) {
      const token = authHeader.replace('Bearer ', '').trim();
      // Best-effort signout — ignore errors
      await supabase.auth.admin?.signOut(token).catch(() => {});
    }
    return sendSuccess(res, { message: 'Logged out successfully', statusCode: 200 });
  } catch (error) {
    // Always return success on logout
    return sendSuccess(res, { message: 'Logged out successfully', statusCode: 200 });
  }
};

/**
 * Get current authenticated user profile, roles, and permissions
 * Also resolves linked employee record if available.
 */
const getMe = async (req, res, next) => {
  try {
    let employee = null;

    // Attempt to resolve linked employee record via user_id
    if (isConfigured && (supabaseAdmin || supabase)) {
      const client = supabaseAdmin || supabase;
      const { data: empData } = await client
        .from('employees')
        .select('id, employee_code, first_name, last_name, employment_status, department_id')
        .eq('user_id', req.user.id)
        .maybeSingle();
      if (empData) employee = empData;
    }

    const userData = {
      id:          req.user.id,
      email:       req.user.email,
      profile:     req.user.profile,
      roles:       req.user.roles,
      permissions: req.user.permissions,
      tenantId:    req.user.tenantId,
      employee,
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
 * Get available system roles
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
    const result = await authService.assignUserRole({
      targetUserId,
      newRole: role,
    });

    return sendSuccess(res, {
      data: result,
      message: `Role ${role} assigned to user successfully`,
      statusCode: 200,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,
  signupCompany,
  login,
  logout,
  getMe,
  getRoles,
  assignRole,
};
