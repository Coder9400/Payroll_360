const { supabase, supabaseAdmin, isConfigured } = require('../config/supabase');
const { ROLES, ROLE_PERMISSIONS_MAP } = require('../config/rbacConstants');

/**
 * Role and Permission Repository
 */
class RoleRepository {
  /**
   * Get all active system roles
   * @returns {Promise<Array>}
   */
  async getAllRoles() {
    if (isConfigured && (supabaseAdmin || supabase)) {
      const client = supabaseAdmin || supabase;
      const { data, error } = await client.from('roles').select('*').order('name');
      if (!error && data) return data;
    }

    return Object.values(ROLES).map((slug) => ({
      slug,
      name: slug.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      is_system: true,
    }));
  }

  /**
   * Get permissions for a specific role slug
   * @param {string} roleSlug
   * @returns {Promise<string[]>}
   */
  async getPermissionsByRole(roleSlug) {
    if (isConfigured && (supabaseAdmin || supabase)) {
      const client = supabaseAdmin || supabase;
      const { data: role, error: roleError } = await client
        .from('roles')
        .select('id')
        .eq('slug', roleSlug)
        .single();

      if (!roleError && role) {
        const { data: perms, error: permsError } = await client
          .from('role_permissions')
          .select('permissions(slug)')
          .eq('role_id', role.id);

        if (!permsError && perms) {
          return perms.map((p) => p.permissions.slug);
        }
      }
    }

    return ROLE_PERMISSIONS_MAP[roleSlug] || [];
  }
}

module.exports = new RoleRepository();
