const { supabase, supabaseAdmin, isConfigured } = require('../config/supabase');
const userRepository = require('../repositories/user.repository');
const { ROLES } = require('../config/rbacConstants');
const config = require('../config/env');
const AppError = require('../utils/appError');
const { DEFAULT_TENANT_ID } = require('../config/tenant');

/**
 * Turn a company name into a URL-safe tenant slug, appending a numeric
 * suffix on collision (checked by the caller).
 */
function slugify(name) {
  return (name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'company';
}

const VALID_MOCK_ROLES = [
  ROLES.ADMIN,
  ROLES.HR_PAYROLL_MANAGER,
  ROLES.HR_PAYROLL_USER,
  ROLES.HR_MANAGER,
  ROLES.EMPLOYEE,
  'deactivated',
];

const MOCK_ROLE_IDS = {
  [ROLES.ADMIN]: 'a0000000-0000-4000-8000-000000000001',
  [ROLES.HR_PAYROLL_MANAGER]: 'a0000000-0000-4000-8000-000000000002',
  [ROLES.HR_PAYROLL_USER]: 'a0000000-0000-4000-8000-000000000003',
  [ROLES.HR_MANAGER]: 'a0000000-0000-4000-8000-000000000004',
  [ROLES.EMPLOYEE]: 'a0000000-0000-4000-8000-000000000005',
  deactivated: 'a0000000-0000-4000-8000-000000000099',
};

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
      // Reject any test token in production mode immediately
      if (config.isProduction || process.env.NODE_ENV === 'production') {
        throw new AppError('Invalid or expired authentication token', 401, 'UNAUTHORIZED');
      }

      const role = trimmedToken.replace('test-token-', '').toLowerCase().trim();

      // Only explicitly recognized mock roles are allowed; unknown tokens fail with 401
      if (!VALID_MOCK_ROLES.includes(role)) {
        throw new AppError('Invalid or expired authentication token', 401, 'UNAUTHORIZED');
      }

      const testId = MOCK_ROLE_IDS[role] || 'a0000000-0000-4000-8000-000000000005';
      const isDeactivated = role === 'deactivated';
      const effectiveRole = isDeactivated ? ROLES.EMPLOYEE : role;

      authUser = {
        id: testId,
        email: `${role}@peoplepay360.local`,
        user_metadata: {
          first_name: 'Test',
          last_name: role.toUpperCase(),
        },
      };

      // Register test profile and role in isolated mock storage
      await userRepository.upsertProfile({
        id: testId,
        email: authUser.email,
        first_name: 'Test',
        last_name: role.toUpperCase(),
        is_active: !isDeactivated,
        tenant_id: DEFAULT_TENANT_ID,
      });

      if (!isDeactivated) {
        await userRepository.assignRole(testId, effectiveRole, DEFAULT_TENANT_ID, true);
      }
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

    // Fetch or initialize application profile
    let profile = await userRepository.findById(authUser.id);
    if (!profile) {
      profile = await userRepository.upsertProfile({
        id: authUser.id,
        email: authUser.email,
        first_name: authUser.user_metadata?.first_name || '',
        last_name: authUser.user_metadata?.last_name || '',
        is_active: true,
        tenant_id: DEFAULT_TENANT_ID,
      });
      await userRepository.assignRole(authUser.id, ROLES.EMPLOYEE, DEFAULT_TENANT_ID, true);
    }

    // Check deactivated status -> return 403 FORBIDDEN
    if (profile.is_active === false) {
      throw new AppError('User account is deactivated. Contact an administrator.', 403, 'FORBIDDEN');
    }

    // Fetch trusted user roles and aggregated permissions from repository
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

    // Isolated test mode check: when running automated tests, use fast deterministic mock registration
    if (process.env.NODE_ENV === 'test') {
      const mockId = `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0').slice(-12)}`;
      const profile = await userRepository.upsertProfile({
        id: mockId,
        email: cleanEmail,
        first_name: cleanFirstName,
        last_name: cleanLastName,
        is_active: true,
        tenant_id: DEFAULT_TENANT_ID,
      });
      await userRepository.assignRole(mockId, ROLES.EMPLOYEE, DEFAULT_TENANT_ID, true);
      const { roles, permissions } = await userRepository.getUserRolesAndPermissions(mockId);

      return {
        user: { id: mockId, email: cleanEmail },
        session: { access_token: `test-token-employee` },
        profile,
        roles,
        permissions,
      };
    }

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
        // Fallback to standard signup
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
        tenant_id: DEFAULT_TENANT_ID,
      });

      // Strictly assign employee role on public registration
      await userRepository.assignRole(authUser.id, ROLES.EMPLOYEE, DEFAULT_TENANT_ID, true);
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
      tenant_id: DEFAULT_TENANT_ID,
    });
    await userRepository.assignRole(mockId, ROLES.EMPLOYEE, DEFAULT_TENANT_ID, true);
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
   * Register a brand new company: creates a Tenant + default LegalEntity +
   * a default Department/JobPosition/WorkingSchedule (needed to satisfy the
   * NOT NULL FKs on `employees`) + the signing-up user as that tenant's
   * Owner/Admin, with their own Employee record.
   *
   * Sequential inserts with best-effort compensating deletes on failure —
   * the Supabase JS client has no real multi-table transaction.
   */
  async registerCompany({ companyName, email, password, firstName = '', lastName = '' }) {
    if (!companyName || typeof companyName !== 'string' || !companyName.trim()) {
      throw new AppError('Company name is required', 400, 'BAD_REQUEST');
    }
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

    const cleanCompanyName = companyName.trim();
    const cleanFirstName = (firstName || '').trim();
    const cleanLastName = (lastName || '').trim();

    if (!isConfigured || !supabaseAdmin) {
      throw new AppError('Company signup requires a configured database connection', 500, 'DATABASE_ERROR');
    }
    const db = supabaseAdmin;

    // ── 1. Resolve a unique tenant slug ──────────────────────────────────────
    const baseSlug = slugify(cleanCompanyName);
    let slug = baseSlug;
    for (let i = 1; i < 50; i += 1) {
      const { data: existing } = await db.from('tenants').select('id').eq('slug', slug).maybeSingle();
      if (!existing) break;
      slug = `${baseSlug}-${i + 1}`;
    }

    let authUserId = null;
    let tenantId = null;

    try {
      // ── 2. Create the Supabase Auth user ───────────────────────────────────
      const { data: adminData, error: adminErr } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password,
        user_metadata: { first_name: cleanFirstName, last_name: cleanLastName },
        email_confirm: true,
      });
      if (adminErr || !adminData?.user) {
        throw new AppError(adminErr?.message || 'Failed to create user account', 400, 'REGISTRATION_FAILED');
      }
      authUserId = adminData.user.id;

      // ── 3. Tenant + default Legal Entity ──────────────────────────────────
      const { data: tenant, error: tenantErr } = await db
        .from('tenants')
        .insert({ name: cleanCompanyName, slug })
        .select()
        .single();
      if (tenantErr) throw new AppError(`Failed to create company: ${tenantErr.message}`, 500, 'DATABASE_ERROR');
      tenantId = tenant.id;

      const { error: entityErr } = await db
        .from('legal_entities')
        .insert({ tenant_id: tenantId, name: cleanCompanyName, is_default: true });
      if (entityErr) throw new AppError(`Failed to create legal entity: ${entityErr.message}`, 500, 'DATABASE_ERROR');

      // ── 4. Default org structure (needed for the owner's Employee row) ───
      const { data: department, error: deptErr } = await db
        .from('departments')
        .insert({ tenant_id: tenantId, name: 'General', code: 'GEN' })
        .select()
        .single();
      if (deptErr) throw new AppError(`Failed to create default department: ${deptErr.message}`, 500, 'DATABASE_ERROR');

      const { data: jobPosition, error: posErr } = await db
        .from('job_positions')
        .insert({ tenant_id: tenantId, name: 'Owner', code: 'OWNER', department_id: department.id })
        .select()
        .single();
      if (posErr) throw new AppError(`Failed to create default job position: ${posErr.message}`, 500, 'DATABASE_ERROR');

      const { data: schedule, error: schedErr } = await db
        .from('working_schedules')
        .insert({ tenant_id: tenantId, name: 'Standard 9-6', code: 'STD-9-6', hours_week: 45 })
        .select()
        .single();
      if (schedErr) throw new AppError(`Failed to create default working schedule: ${schedErr.message}`, 500, 'DATABASE_ERROR');

      const scheduleDays = [1, 2, 3, 4, 5].map((day) => ({
        schedule_id: schedule.id,
        day_of_week: day,
        is_working_day: true,
        start_time: '09:00',
        end_time: '18:00',
      }));
      await db.from('working_schedule_days').insert(scheduleDays);

      // ── 5. Profile + Admin role ────────────────────────────────────────────
      const profile = await userRepository.upsertProfile({
        id: authUserId,
        email: cleanEmail,
        first_name: cleanFirstName,
        last_name: cleanLastName,
        is_active: true,
        tenant_id: tenantId,
      });
      await userRepository.assignRole(authUserId, ROLES.ADMIN, tenantId, true);

      // ── 6. Owner's Employee record ────────────────────────────────────────
      const { data: employee, error: empErr } = await db
        .from('employees')
        .insert({
          tenant_id: tenantId,
          employee_code: 'EMP-0001',
          user_id: authUserId,
          first_name: cleanFirstName || 'Owner',
          last_name: cleanLastName || cleanCompanyName,
          email: cleanEmail,
          date_of_joining: new Date().toISOString().slice(0, 10),
          department_id: department.id,
          job_position_id: jobPosition.id,
          working_schedule_id: schedule.id,
          employee_type: 'FULL_TIME',
          employment_status: 'ACTIVE',
        })
        .select()
        .single();
      if (empErr) throw new AppError(`Failed to create owner employee record: ${empErr.message}`, 500, 'DATABASE_ERROR');

      const { roles, permissions } = await userRepository.getUserRolesAndPermissions(authUserId);

      return {
        user: { id: authUserId, email: cleanEmail },
        tenant,
        employee,
        profile,
        roles,
        permissions,
      };
    } catch (err) {
      // Best-effort cleanup: deleting the tenant cascades legal_entities/
      // departments/job_positions/working_schedules/employees via their FKs.
      if (tenantId) {
        await db.from('tenants').delete().eq('id', tenantId).catch(() => {});
      }
      if (authUserId) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId).catch(() => {});
      }
      if (err instanceof AppError) throw err;
      throw new AppError(err.message || 'Company registration failed', 500, 'REGISTRATION_FAILED');
    }
  }

  /**
   * Log in user via Supabase Auth
   */
  async login({ email, password }) {
    if (!email || !password) {
      throw new AppError('Email and password are required', 400, 'BAD_REQUEST');
    }

    const cleanEmail = email.trim().toLowerCase();

    if (isConfigured && supabase && process.env.NODE_ENV !== 'test') {
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

    await userRepository.assignRole(targetUserId, normalizedRole, profile.tenant_id, true);
    const { roles, permissions } = await userRepository.getUserRolesAndPermissions(targetUserId);

    return {
      userId: targetUserId,
      roles,
      permissions,
    };
  }
}

module.exports = new AuthService();
