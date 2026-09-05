const { supabase, supabaseAdmin, isConfigured } = require('../config/supabase');
const userRepository = require('../repositories/user.repository');
const { ROLES } = require('../config/rbacConstants');
const config = require('../config/env');
const AppError = require('../utils/appError');

class AuthService {
  /**
   * Validate token and resolve full user identity with profile, roles, and permissions
   * @param {string} token
   * @returns {Promise<{ user: object, profile: object, roles: string[], permissions: string[] }>}
   */
  async validateTokenAndGetUser(token) {
    if (!token || typeof token !== 'string' || !token.trim()) {
      throw new AppError('Authentication token is required', 401, 'UNAUTHORIZED');
    }

    const trimmedToken = token.trim();
    let authUser = null;

    // Handle mock test tokens strictly in non-production environments
    if (trimmedToken.startsWith('test-token-')) {
      // Reject any test token in production mode
      if (config.isProduction || process.env.NODE_ENV === 'production') {
        throw new AppError('Invalid or expired authentication token', 401, 'UNAUTHORIZED');
      }

      const role = trimmedToken.replace('test-token-', '').toLowerCase();
      const validRole = Object.values(ROLES).includes(role) ? role : ROLES.EMPLOYEE;
      
      const testRoleIds = {
        [ROLES.ADMIN]: 'a0000000-0000-4000-8000-000000000001',
        [ROLES.HR_PAYROLL_MANAGER]: 'a0000000-0000-4000-8000-000000000002',
        [ROLES.HR_PAYROLL_USER]: 'a0000000-0000-4000-8000-000000000003',
        [ROLES.HR_MANAGER]: 'a0000000-0000-4000-8000-000000000004',
        [ROLES.EMPLOYEE]: 'a0000000-0000-4000-8000-000000000005',
      };
      const testId = testRoleIds[validRole] || 'a0000000-0000-4000-8000-000000000005';
      
      authUser = {
        id: testId,
        email: `${validRole}@peoplepay360.local`,
        user_metadata: {
          first_name: 'Test',
          last_name: validRole.toUpperCase(),
        },
      };

      // Ensure test profile and role are registered
      await userRepository.upsertProfile({
        id: testId,
        email: authUser.email,
        first_name: 'Test',
        last_name: validRole.toUpperCase(),
        is_active: true,
      });
      await userRepository.assignRole(testId, validRole, true);
    } else if (isConfigured && supabase) {
      // Validate real token with Supabase Auth
      const { data, error } = await supabase.auth.getUser(trimmedToken);

      if (error || !data?.user) {
        throw new AppError('Invalid or expired authentication token', 401, 'UNAUTHORIZED');
      }

      authUser = data.user;
    } else {
      throw new AppError('Invalid or expired authentication token', 401, 'UNAUTHORIZED');
    }

    // Fetch or initialize profile
    let profile = await userRepository.findById(authUser.id);
    if (!profile) {
      profile = await userRepository.upsertProfile({
        id: authUser.id,
        email: authUser.email,
        first_name: authUser.user_metadata?.first_name || '',
        last_name: authUser.user_metadata?.last_name || '',
        is_active: true,
      });
      await userRepository.assignRole(authUser.id, ROLES.EMPLOYEE);
    }

    // Check deactivated status
    if (profile.is_active === false) {
      throw new AppError('User account is deactivated. Contact an administrator.', 403, 'FORBIDDEN');
    }

    // Fetch user roles and aggregated permissions from database/repository
    const { roles, permissions } = await userRepository.getUserRolesAndPermissions(authUser.id);

    return {
      user: {
        id: authUser.id,
        email: authUser.email,
      },
      profile,
      roles: roles.length ? roles : [ROLES.EMPLOYEE],
      permissions,
    };
  }

  /**
   * Register a new user with Supabase Auth & create profile
   * NOTE: Public registration strictly assigns the default 'employee' role.
   */
  async register({ email, password, firstName = '', lastName = '' }) {
    if (!email || typeof email !== 'string' || !email.trim()) {
      throw new AppError('A valid email address is required', 400, 'BAD_REQUEST');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.trim().toLowerCase();
    if (!emailRegex.test(cleanEmail)) {
      throw new AppError('Invalid email format', 400, 'BAD_REQUEST');
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      throw new AppError('Password must be at least 6 characters long', 400, 'BAD_REQUEST');
    }

    const cleanFirstName = (firstName || '').trim();
    const cleanLastName = (lastName || '').trim();

    let authUser = null;
    let authSession = null;

    if (isConfigured && supabaseAdmin) {
      try {
        const { data: adminData, error: adminErr } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password,
          user_metadata: {
            first_name: cleanFirstName,
            last_name: cleanLastName,
          },
          email_confirm: true,
        });

        if (!adminErr && adminData?.user) {
          authUser = adminData.user;
        }
      } catch (err) {
        // Fallback to client signup
      }
    }

    if (!authUser && isConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            first_name: cleanFirstName,
            last_name: cleanLastName,
          },
        },
      });

      if (error) {
        throw new AppError(error.message, 400, 'REGISTRATION_FAILED');
      }

      if (data?.user) {
        authUser = data.user;
        authSession = data.session;
      }
    }

    if (authUser) {
      const profile = await userRepository.upsertProfile({
        id: authUser.id,
        email: cleanEmail,
        first_name: cleanFirstName,
        last_name: cleanLastName,
        is_active: true,
      });

      // Strictly assign employee role on public registration
      await userRepository.assignRole(authUser.id, ROLES.EMPLOYEE, true);
      const { roles, permissions } = await userRepository.getUserRolesAndPermissions(authUser.id);

      return {
        user: { id: authUser.id, email: authUser.email },
        session: authSession,
        profile,
        roles,
        permissions,
      };
    }

    // Local / Dev Fallback
    const mockId = `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0').slice(-12)}`;
    const profile = await userRepository.upsertProfile({
      id: mockId,
      email: cleanEmail,
      first_name: cleanFirstName,
      last_name: cleanLastName,
      is_active: true,
    });
    await userRepository.assignRole(mockId, ROLES.EMPLOYEE, true);
    const { roles, permissions } = await userRepository.getUserRolesAndPermissions(mockId);

    return {
      user: { id: mockId, email: cleanEmail },
      session: { access_token: `test-token-employee` },
      profile,
      roles,
      permissions,
    };
  }

  /**
   * Log in user via Supabase Auth
   */
  async login({ email, password }) {
    if (!email || !password) {
      throw new AppError('Email and password are required', 400, 'BAD_REQUEST');
    }

    const cleanEmail = email.trim().toLowerCase();

    if (isConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        throw new AppError(error.message, 401, 'INVALID_CREDENTIALS');
      }

      const { user, session } = data;
      const profile = await userRepository.findById(user.id);

      if (profile && profile.is_active === false) {
        throw new AppError('User account is deactivated. Contact an administrator.', 403, 'FORBIDDEN');
      }

      const { roles, permissions } = await userRepository.getUserRolesAndPermissions(user.id);

      return {
        user: { id: user.id, email: user.email },
        session,
        profile,
        roles,
        permissions,
      };
    }

    // Local test fallback lookup
    const profile = await userRepository.findByEmail(cleanEmail);
    if (!profile) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    if (profile.is_active === false) {
      throw new AppError('User account is deactivated. Contact an administrator.', 403, 'FORBIDDEN');
    }

    const { roles, permissions } = await userRepository.getUserRolesAndPermissions(profile.id);

    return {
      user: { id: profile.id, email: profile.email },
      session: { access_token: `test-token-${roles[0] || 'employee'}` },
      profile,
      roles,
      permissions,
    };
  }

  /**
   * Privileged administrative role assignment
   */
  async assignUserRole({ targetUserId, newRole }) {
    if (!targetUserId) {
      throw new AppError('Target user ID is required', 400, 'BAD_REQUEST');
    }

    const normalizedRole = (newRole || '').trim().toLowerCase();
    if (!Object.values(ROLES).includes(normalizedRole)) {
      throw new AppError(`Invalid role specified. Valid roles are: ${Object.values(ROLES).join(', ')}`, 400, 'BAD_REQUEST');
    }

    const profile = await userRepository.findById(targetUserId);
    if (!profile) {
      throw new AppError('Target user profile not found', 404, 'NOT_FOUND');
    }

    await userRepository.assignRole(targetUserId, normalizedRole, true);
    const { roles, permissions } = await userRepository.getUserRolesAndPermissions(targetUserId);

    return {
      userId: targetUserId,
      roles,
      permissions,
    };
  }
}

module.exports = new AuthService();
