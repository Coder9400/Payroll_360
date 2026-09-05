const { supabase, isConfigured } = require('../config/supabase');
const userRepository = require('../repositories/user.repository');
const { ROLES } = require('../config/rbacConstants');
const AppError = require('../utils/appError');

class AuthService {
  /**
   * Validate token and resolve full user identity with profile, roles, and permissions
   * @param {string} token
   * @returns {Promise<{ user: object, profile: object, roles: string[], permissions: string[] }>}
   */
  async validateTokenAndGetUser(token) {
    if (!token) {
      throw new AppError('Authentication token is required', 401, 'UNAUTHORIZED');
    }

    let authUser = null;

    // Handle mock test tokens for fast automated/local testing
    if (token.startsWith('test-token-')) {
      const role = token.replace('test-token-', '');
      const validRole = Object.values(ROLES).includes(role) ? role : ROLES.EMPLOYEE;
      const testId = `test-user-${validRole}-0000-0000-000000000000`;
      
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
      });
      await userRepository.assignRole(testId, validRole);
    } else if (isConfigured && supabase) {
      // Validate with Supabase Auth
      const { data, error } = await supabase.auth.getUser(token);

      if (error || !data?.user) {
        throw new AppError('Invalid or expired authentication token', 401, 'UNAUTHORIZED');
      }

      authUser = data.user;
    } else {
      throw new AppError('Invalid or unauthorized authentication token', 401, 'UNAUTHORIZED');
    }

    // Fetch or create profile
    let profile = await userRepository.findById(authUser.id);
    if (!profile) {
      profile = await userRepository.upsertProfile({
        id: authUser.id,
        email: authUser.email,
        first_name: authUser.user_metadata?.first_name || '',
        last_name: authUser.user_metadata?.last_name || '',
      });
    }

    if (!profile.is_active) {
      throw new AppError('User account is deactivated', 403, 'FORBIDDEN');
    }

    // Fetch user roles and aggregated permissions
    const { roles, permissions } = await userRepository.getUserRolesAndPermissions(authUser.id);

    return {
      user: authUser,
      profile,
      roles: roles.length ? roles : [ROLES.EMPLOYEE],
      permissions,
    };
  }

  /**
   * Register a new user with Supabase Auth & create profile + role mapping
   */
  async register({ email, password, firstName = '', lastName = '', role = ROLES.EMPLOYEE }) {
    if (!email || !password) {
      throw new AppError('Email and password are required', 400, 'BAD_REQUEST');
    }

    const assignedRole = Object.values(ROLES).includes(role) ? role : ROLES.EMPLOYEE;

    if (isConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (error) {
        throw new AppError(error.message, 400, 'REGISTRATION_FAILED');
      }

      const user = data.user;
      if (user) {
        const profile = await userRepository.upsertProfile({
          id: user.id,
          email: user.email,
          first_name: firstName,
          last_name: lastName,
        });

        await userRepository.assignRole(user.id, assignedRole);
        const { roles, permissions } = await userRepository.getUserRolesAndPermissions(user.id);

        return {
          user,
          session: data.session,
          profile,
          roles,
          permissions,
        };
      }
    }

    // Local / Dev Fallback
    const mockId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const profile = await userRepository.upsertProfile({
      id: mockId,
      email,
      first_name: firstName,
      last_name: lastName,
    });
    await userRepository.assignRole(mockId, assignedRole);
    const { roles, permissions } = await userRepository.getUserRolesAndPermissions(mockId);

    return {
      user: { id: mockId, email },
      session: { access_token: `test-token-${assignedRole}` },
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

    if (isConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new AppError(error.message, 401, 'INVALID_CREDENTIALS');
      }

      const { user, session } = data;
      const profile = await userRepository.findById(user.id);
      const { roles, permissions } = await userRepository.getUserRolesAndPermissions(user.id);

      return {
        user,
        session,
        profile,
        roles,
        permissions,
      };
    }

    // Local test fallback lookup
    const profile = await userRepository.findByEmail(email);
    if (!profile) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
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
}

module.exports = new AuthService();
