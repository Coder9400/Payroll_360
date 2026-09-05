const { supabase, supabaseAdmin, isConfigured } = require('../config/supabase');
const { ROLE_PERMISSIONS_MAP, ROLES } = require('../config/rbacConstants');

// In-memory store fallback for test/dev when Supabase is not yet connected or tables unmigrated
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
      try {
        const client = supabaseAdmin || supabase;
        const { data, error } = await client
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (!error && data) return data;
      } catch (err) {
        // Fall back to in-memory store
      }
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
      try {
        const client = supabaseAdmin || supabase;
        const { data, error } = await client
          .from('profiles')
          .select('*')
          .eq('email', email.toLowerCase())
          .single();

        if (!error && data) return data;
      } catch (err) {
        // Fall back to in-memory store
      }
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
      try {
        const client = supabaseAdmin || supabase;
        const { data, error } = await client
          .from('profiles')
          .upsert(payload, { onConflict: 'id' })
          .select()
          .single();

        if (!error && data) {
          mockProfiles.set(id, data);
          return data;
        }
      } catch (err) {
        // Fall back to in-memory store
      }
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
    if (isConfigured && (supabaseAdmin || supabase)) {
      try {
        const client = supabaseAdmin || supabase;
        const { data, error } = await client
          .from('profiles')
          .update({ is_active: Boolean(isActive), updated_at: new Date().toISOString() })
          .eq('id', userId)
          .select()
          .single();

        if (!error && data) {
          mockProfiles.set(userId, data);
          return data;
        }
      } catch (err) {
        // Fall back to in-memory store
      }
    }

    const existing = mockProfiles.get(userId);
    if (existing) {
      existing.is_active = Boolean(isActive);
      existing.updated_at = new Date().toISOString();
      mockProfiles.set(userId, existing);
      return existing;
    }
    return null;
  }

  /**
   * Get roles and permissions for a user
   * @param {string} userId
   * @returns {Promise<{ roles: string[], permissions: string[] }>}
   */
  async getUserRolesAndPermissions(userId) {
    if (isConfigured && (supabaseAdmin || supabase)) {
      try {
        const client = supabaseAdmin || supabase;

        // Fetch user roles
        const { data: userRolesData, error: rolesError } = await client
          .from('user_roles')
          .select('roles(id, slug, name)')
          .eq('user_id', userId);

        if (!rolesError && userRolesData && userRolesData.length > 0) {
          const roles = userRolesData.map((ur) => ur.roles?.slug).filter(Boolean);
          const roleIds = userRolesData.map((ur) => ur.roles?.id).filter(Boolean);

          if (roleIds.length > 0) {
            // Fetch distinct permissions mapped to user's roles
            const { data: permData, error: permError } = await client
              .from('role_permissions')
              .select('permissions(slug)')
              .in('role_id', roleIds);

            const permissions = !permError && permData 
              ? [...new Set(permData.map((p) => p.permissions?.slug).filter(Boolean))]
              : [];

            if (roles.length > 0) {
              return { roles, permissions };
            }
          }
        }
      } catch (err) {
        // Fall back to in-memory store
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
   * Assign or replace role for user
   * @param {string} userId
   * @param {string} roleSlug
   * @param {boolean} [replace=false]
   */
  async assignRole(userId, roleSlug, replace = false) {
    if (isConfigured && (supabaseAdmin || supabase)) {
      try {
        const client = supabaseAdmin || supabase;
        
        // Get role ID
        const { data: roleData, error: roleError } = await client
          .from('roles')
          .select('id')
          .eq('slug', roleSlug)
          .single();

        if (!roleError && roleData) {
          if (replace) {
            await client.from('user_roles').delete().eq('user_id', userId);
          }
          await client
            .from('user_roles')
            .upsert({ user_id: userId, role_id: roleData.id }, { onConflict: 'user_id,role_id' });
        }
      } catch (err) {
        // Fall back to in-memory store
      }
    }

    const current = mockUserRoles.get(userId) || [];
    if (replace) {
      mockUserRoles.set(userId, [roleSlug]);
    } else if (!current.includes(roleSlug)) {
      mockUserRoles.set(userId, [...current, roleSlug]);
    }
  }
}

module.exports = new UserRepository();
