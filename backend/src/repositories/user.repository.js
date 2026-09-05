const { supabase, supabaseAdmin, isConfigured } = require('../config/supabase');
const { ROLE_PERMISSIONS_MAP, ROLES } = require('../config/rbacConstants');
const config = require('../config/env');
const AppError = require('../utils/appError');

// Controlled in-memory store for development/test mode
const mockProfiles = new Map();
const mockUserRoles = new Map();

/**
 * Checks if a user ID is an isolated mock test identifier
 */
const isMockUserId = (userId) => {
  return typeof userId === 'string' && (userId.startsWith('a0000000-') || userId.startsWith('00000000-'));
};

/**
 * User and Profile Repository
 */
class UserRepository {
  /**
   * Find profile by user ID
   * @param {string} userId
   * @returns {Promise<object|null>}
   */
  async findById(userId) {
    if (isMockUserId(userId) || (!isConfigured && !config.isProduction)) {
      return mockProfiles.get(userId) || null;
    }

    if (isConfigured && (supabaseAdmin || supabase)) {
      const client = supabaseAdmin || supabase;
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Row not found
        }
        if (config.isProduction || process.env.NODE_ENV === 'production') {
          throw new AppError(`Database query failed: ${error.message}`, 500, 'DATABASE_ERROR');
        }
        // Controlled fallback for local dev when tables are not yet migrated
        return mockProfiles.get(userId) || null;
      }
      return data || null;
    }

    if (config.isProduction || process.env.NODE_ENV === 'production') {
      throw new AppError('Database connection is not configured in production', 500, 'DATABASE_ERROR');
    }

    return mockProfiles.get(userId) || null;
  }

  /**
   * Find profile by email
   * @param {string} email
   * @returns {Promise<object|null>}
   */
  async findByEmail(email) {
    const cleanEmail = (email || '').toLowerCase().trim();

    if (!isConfigured && !config.isProduction) {
      for (const profile of mockProfiles.values()) {
        if (profile.email && profile.email.toLowerCase() === cleanEmail) {
          return profile;
        }
      }
      return null;
    }

    if (isConfigured && (supabaseAdmin || supabase)) {
      const client = supabaseAdmin || supabase;
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Row not found
        }
        if (config.isProduction || process.env.NODE_ENV === 'production') {
          throw new AppError(`Database query failed: ${error.message}`, 500, 'DATABASE_ERROR');
        }
        for (const profile of mockProfiles.values()) {
          if (profile.email && profile.email.toLowerCase() === cleanEmail) {
            return profile;
          }
        }
        return null;
      }
      return data || null;
    }

    if (config.isProduction || process.env.NODE_ENV === 'production') {
      throw new AppError('Database connection is not configured in production', 500, 'DATABASE_ERROR');
    }

    for (const profile of mockProfiles.values()) {
      if (profile.email && profile.email.toLowerCase() === cleanEmail) {
        return profile;
      }
    }
    return null;
  }

  /**
   * Upsert a user profile mapping
   * @param {object} profileData
   * @returns {Promise<object>}
   */
  async upsertProfile({ id, email, first_name = '', last_name = '', avatar_url = null, is_active = true }) {
    const payload = {
      id,
      email: (email || '').toLowerCase().trim(),
      first_name: first_name || '',
      last_name: last_name || '',
      avatar_url: avatar_url || null,
      is_active: is_active !== false,
      updated_at: new Date().toISOString(),
    };

    if (isMockUserId(id) || (!isConfigured && !config.isProduction)) {
      const existing = mockProfiles.get(id) || { created_at: new Date().toISOString() };
      const saved = { ...existing, ...payload };
      mockProfiles.set(id, saved);
      return saved;
    }

    if (isConfigured && (supabaseAdmin || supabase)) {
      const client = supabaseAdmin || supabase;
      const { data, error } = await client
        .from('profiles')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        if (config.isProduction || process.env.NODE_ENV === 'production') {
          throw new AppError(`Failed to save user profile: ${error.message}`, 500, 'DATABASE_ERROR');
        }
        // Controlled fallback for local dev
        const existing = mockProfiles.get(id) || { created_at: new Date().toISOString() };
        const saved = { ...existing, ...payload };
        mockProfiles.set(id, saved);
        return saved;
      }
      mockProfiles.set(id, data);
      return data;
    }

    if (config.isProduction || process.env.NODE_ENV === 'production') {
      throw new AppError('Database connection is not configured in production', 500, 'DATABASE_ERROR');
    }

    const existing = mockProfiles.get(id) || { created_at: new Date().toISOString() };
    const saved = { ...existing, ...payload };
    mockProfiles.set(id, saved);
    return saved;
  }

  /**
   * Update active status of a user profile
   * @param {string} userId
   * @param {boolean} isActive
   * @returns {Promise<object|null>}
   */
  async setUserActiveStatus(userId, isActive) {
    if (isMockUserId(userId) || (!isConfigured && !config.isProduction)) {
      const existing = mockProfiles.get(userId);
      if (existing) {
        existing.is_active = Boolean(isActive);
        existing.updated_at = new Date().toISOString();
        mockProfiles.set(userId, existing);
        return existing;
      }
      return null;
    }

    if (isConfigured && (supabaseAdmin || supabase)) {
      const client = supabaseAdmin || supabase;
      const { data, error } = await client
        .from('profiles')
        .update({ is_active: Boolean(isActive), updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        if (config.isProduction || process.env.NODE_ENV === 'production') {
          throw new AppError(`Failed to update user status: ${error.message}`, 500, 'DATABASE_ERROR');
        }
        const existing = mockProfiles.get(userId);
        if (existing) {
          existing.is_active = Boolean(isActive);
          mockProfiles.set(userId, existing);
          return existing;
        }
      }
      if (data) {
        mockProfiles.set(userId, data);
        return data;
      }
    }

    return null;
  }

  /**
   * Get roles and permissions for a user
   * @param {string} userId
   * @returns {Promise<{ roles: string[], permissions: string[] }>}
   */
  async getUserRolesAndPermissions(userId) {
    if (isMockUserId(userId) || (!isConfigured && !config.isProduction)) {
      const userRoleSlugs = mockUserRoles.get(userId) || [ROLES.EMPLOYEE];
      const permissionsSet = new Set();

      userRoleSlugs.forEach((roleSlug) => {
        const perms = ROLE_PERMISSIONS_MAP[roleSlug] || [];
        perms.forEach((p) => permissionsSet.add(p));
      });

      return {
        roles: userRoleSlugs,
        permissions: Array.from(permissionsSet),
      };
    }

    if (isConfigured && (supabaseAdmin || supabase)) {
      const client = supabaseAdmin || supabase;

      // Fetch user roles
      const { data: userRolesData, error: rolesError } = await client
        .from('user_roles')
        .select('roles(id, slug, name)')
        .eq('user_id', userId);

      if (rolesError) {
        if (config.isProduction || process.env.NODE_ENV === 'production') {
          throw new AppError(`Failed to query user roles: ${rolesError.message}`, 500, 'DATABASE_ERROR');
        }
      } else if (userRolesData && userRolesData.length > 0) {
        const roles = userRolesData.map((ur) => ur.roles?.slug).filter(Boolean);
        const roleIds = userRolesData.map((ur) => ur.roles?.id).filter(Boolean);

        if (roleIds.length > 0) {
          // Fetch distinct permissions mapped to user's roles
          const { data: permData, error: permError } = await client
            .from('role_permissions')
            .select('permissions(slug)')
            .in('role_id', roleIds);

          if (permError && (config.isProduction || process.env.NODE_ENV === 'production')) {
            throw new AppError(`Failed to query role permissions: ${permError.message}`, 500, 'DATABASE_ERROR');
          }

          const permissions = !permError && permData 
            ? [...new Set(permData.map((p) => p.permissions?.slug).filter(Boolean))]
            : [];

          if (roles.length > 0) {
            return { roles, permissions };
          }
        }
      }
    }

    // Default fallback resolution for non-production environments
    const userRoleSlugs = mockUserRoles.get(userId) || [ROLES.EMPLOYEE];
    const permissionsSet = new Set();

    userRoleSlugs.forEach((roleSlug) => {
      const perms = ROLE_PERMISSIONS_MAP[roleSlug] || [];
      perms.forEach((p) => permissionsSet.add(p));
    });

    return {
      roles: userRoleSlugs,
      permissions: Array.from(permissionsSet),
    };
  }

  /**
   * Assign or replace role for user
   * @param {string} userId
   * @param {string} roleSlug
   * @param {boolean} [replace=false]
   */
  async assignRole(userId, roleSlug, replace = false) {
    const normalizedRole = (roleSlug || '').trim().toLowerCase();
    if (!Object.values(ROLES).includes(normalizedRole)) {
      throw new AppError(`Invalid role slug: ${roleSlug}`, 400, 'BAD_REQUEST');
    }

    if (isMockUserId(userId) || (!isConfigured && !config.isProduction)) {
      if (replace) {
        mockUserRoles.set(userId, [normalizedRole]);
      } else {
        const current = mockUserRoles.get(userId) || [];
        if (!current.includes(normalizedRole)) {
          mockUserRoles.set(userId, [...current, normalizedRole]);
        }
      }
      return;
    }

    if (isConfigured && (supabaseAdmin || supabase)) {
      const client = supabaseAdmin || supabase;
      
      const { data: roleData, error: roleError } = await client
        .from('roles')
        .select('id')
        .eq('slug', normalizedRole)
        .single();

      if (roleError) {
        if (config.isProduction || process.env.NODE_ENV === 'production') {
          throw new AppError(`Role '${normalizedRole}' not found in database: ${roleError.message}`, 500, 'DATABASE_ERROR');
        }
      } else if (roleData) {
        if (replace) {
          await client.from('user_roles').delete().eq('user_id', userId);
        }
        const { error: assignError } = await client
          .from('user_roles')
          .upsert({ user_id: userId, role_id: roleData.id }, { onConflict: 'user_id,role_id' });

        if (assignError && (config.isProduction || process.env.NODE_ENV === 'production')) {
          throw new AppError(`Failed to assign role to user in database: ${assignError.message}`, 500, 'DATABASE_ERROR');
        }
      }
    }

    // Update in-memory record as well
    if (replace) {
      mockUserRoles.set(userId, [normalizedRole]);
    } else {
      const current = mockUserRoles.get(userId) || [];
      if (!current.includes(normalizedRole)) {
        mockUserRoles.set(userId, [...current, normalizedRole]);
      }
    }
  }
}

module.exports = new UserRepository();
