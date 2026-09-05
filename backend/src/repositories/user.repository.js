const { supabase, supabaseAdmin, isConfigured } = require('../config/supabase');
const { ROLE_PERMISSIONS_MAP, ROLES } = require('../config/rbacConstants');

// In-memory store fallback for test/dev when Supabase is not yet connected
const mockProfiles = new Map();
const mockUserRoles = new Map();

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
    if (isConfigured && (supabaseAdmin || supabase)) {
      const client = supabaseAdmin || supabase;
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message);
      }
      return data || null;
    }

    return mockProfiles.get(userId) || null;
  }

  /**
   * Find profile by email
   * @param {string} email
   * @returns {Promise<object|null>}
   */
  async findByEmail(email) {
    if (isConfigured && (supabaseAdmin || supabase)) {
      const client = supabaseAdmin || supabase;
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message);
      }
      return data || null;
    }

    for (const profile of mockProfiles.values()) {
      if (profile.email.toLowerCase() === email.toLowerCase()) {
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
      email: email.toLowerCase(),
      first_name,
      last_name,
      avatar_url,
      is_active,
      updated_at: new Date().toISOString(),
    };

    if (isConfigured && (supabaseAdmin || supabase)) {
      const client = supabaseAdmin || supabase;
      const { data, error } = await client
        .from('profiles')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data;
    }

    const existing = mockProfiles.get(id) || { created_at: new Date().toISOString() };
    const saved = { ...existing, ...payload };
    mockProfiles.set(id, saved);
    return saved;
  }

  /**
   * Get roles and permissions for a user
   * @param {string} userId
   * @returns {Promise<{ roles: string[], permissions: string[] }>}
   */
  async getUserRolesAndPermissions(userId) {
    if (isConfigured && (supabaseAdmin || supabase)) {
      const client = supabaseAdmin || supabase;

      // Fetch user roles
      const { data: userRolesData, error: rolesError } = await client
        .from('user_roles')
        .select('roles(id, slug, name)')
        .eq('user_id', userId);

      if (!rolesError && userRolesData && userRolesData.length > 0) {
        const roles = userRolesData.map((ur) => ur.roles.slug);
        const roleIds = userRolesData.map((ur) => ur.roles.id);

        // Fetch distinct permissions mapped to user's roles
        const { data: permData, error: permError } = await client
          .from('role_permissions')
          .select('permissions(slug)')
          .in('role_id', roleIds);

        const permissions = !permError && permData 
          ? [...new Set(permData.map((p) => p.permissions.slug))]
          : [];

        return { roles, permissions };
      }
    }

    // Fallback in-memory resolution
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
   * Assign role to user
   * @param {string} userId
   * @param {string} roleSlug
   */
  async assignRole(userId, roleSlug) {
    if (isConfigured && (supabaseAdmin || supabase)) {
      const client = supabaseAdmin || supabase;
      
      // Get role ID
      const { data: roleData, error: roleError } = await client
        .from('roles')
        .select('id')
        .eq('slug', roleSlug)
        .single();

      if (!roleError && roleData) {
        await client
          .from('user_roles')
          .upsert({ user_id: userId, role_id: roleData.id }, { onConflict: 'user_id,role_id' });
      }
    }

    const current = mockUserRoles.get(userId) || [];
    if (!current.includes(roleSlug)) {
      mockUserRoles.set(userId, [...current, roleSlug]);
    }
  }
}

module.exports = new UserRepository();
