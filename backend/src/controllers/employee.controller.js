const { supabaseAdmin, supabase, isConfigured } = require('../config/supabase');
const AppError = require('../utils/appError');
const { successResponse } = require('../utils/apiResponse');
const { ROLES, PERMISSIONS } = require('../config/rbacConstants');
const { withTenant, withTenantId } = require('../utils/tenantScope');
const crypto = require('crypto');

const db = supabaseAdmin || supabase;

exports.createEmployee = async (req, res, next) => {
  try {
    const payload = withTenantId(req.body, req.user.tenantId);
    const { data, error } = await db
      .from('employees')
      .insert([payload])
      .select('*, departments!employees_department_id_fkey(name), job_positions(name)')
      .single();

    if (error) {
      if (error.code === '23505') {
        if (error.message.includes('employee_code')) throw new AppError('Employee code already exists', 409);
        if (error.message.includes('email')) throw new AppError('Email already exists', 409);
        if (error.message.includes('user_id')) throw new AppError('User ID is already linked to another employee', 409);
        throw new AppError('A conflict occurred with unique constraints', 409);
      }
      if (error.code === '23503') throw new AppError('A related record (Department, Job Position, Manager, Schedule, or User) does not exist', 400);
      throw new AppError(error.message, 500);
    }

    return successResponse(res, data, 'Employee created successfully', 201);
  } catch (error) {
    next(error);
  }
};

exports.getEmployees = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      department_id,
      manager_id,
      employment_status,
      employee_type,
      job_position_id,
      search,
    } = req.query;
    const offset = (page - 1) * limit;

    let query = withTenant(
      db.from('employees').select('*, departments!employees_department_id_fkey(name), job_positions(name), working_schedules(name), manager:manager_id(id, first_name, last_name)', { count: 'exact' }),
      req.user.tenantId
    );

    // --- DATA ISOLATION ---
    // If the user does not have full read access (only read_own), restrict the query to their own ID.
    if (!req.user.permissions.includes(PERMISSIONS.EMPLOYEE_READ)) {
      if (!req.user.employee) {
        return res.status(200).json({ success: true, data: [], page: 1, limit: parseInt(limit), total: 0, totalPages: 0 });
      }
      query = query.eq('id', req.user.employee.id);
    } else {
      if (department_id) query = query.eq('department_id', department_id);
      if (manager_id) query = query.eq('manager_id', manager_id);
      if (employment_status) query = query.eq('employment_status', employment_status);
      if (employee_type) query = query.eq('employee_type', employee_type);
      if (job_position_id) query = query.eq('job_position_id', job_position_id);
      if (search && String(search).trim()) {
        const term = String(search).trim().replace(/[,()%]/g, '');
        query = query.or(
          `first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,employee_code.ilike.%${term}%`
        );
      }
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw new AppError(error.message, 500);

    return res.status(200).json({
      success: true,
      data,
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    next(error);
  }
};

exports.getEmployeeById = async (req, res, next) => {
  try {
    // --- DATA ISOLATION ---
    if (!req.user.permissions.includes(PERMISSIONS.EMPLOYEE_READ)) {
      if (!req.user.employee || req.user.employee.id !== req.params.id) {
        throw new AppError('Forbidden: You can only access your own employee record', 403, 'FORBIDDEN');
      }
    }

    const { data, error } = await withTenant(
      db.from('employees')
        .select('*, departments!employees_department_id_fkey(*), job_positions(*), working_schedules(*), manager:manager_id(id, first_name, last_name)')
        .eq('id', req.params.id),
      req.user.tenantId
    ).single();

    if (error) {
      if (error.code === 'PGRST116') throw new AppError('Employee not found', 404);
      throw new AppError(error.message, 500);
    }

    return successResponse(res, data);
  } catch (error) {
    next(error);
  }
};

exports.updateEmployee = async (req, res, next) => {
  try {
    const { tenant_id, ...body } = req.body || {};
    const { data, error } = await withTenant(
      db.from('employees').update(body).eq('id', req.params.id),
      req.user.tenantId
    ).select().single();

    if (error) {
      if (error.code === 'PGRST116') throw new AppError('Employee not found', 404);
      if (error.code === '23505') throw new AppError('Employee code or email already exists', 409);
      if (error.code === '23503') throw new AppError('A related record (Department, Job Position, Manager, Schedule, or User) does not exist', 400);
      throw new AppError(error.message, 500);
    }

    return successResponse(res, data, 'Employee updated successfully');
  } catch (error) {
    next(error);
  }
};

exports.provisionAccount = async (req, res, next) => {
  try {
    const employeeId = req.params.id;

    if (!isConfigured || !supabaseAdmin) {
      throw new AppError('Supabase Admin is not configured', 500);
    }

    // 1. Fetch Employee (tenant-scoped, so a cross-tenant id 404s instead of leaking)
    const { data: employee, error: empErr } = await withTenant(
      db.from('employees').select('*').eq('id', employeeId),
      req.user.tenantId
    ).single();

    if (empErr || !employee) throw new AppError('Employee not found', 404);
    if (employee.user_id) throw new AppError('Employee already has a provisioned account', 400);
    if (!employee.email) throw new AppError('Employee must have an email address to provision an account', 400);

    // 2. Generate secure temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex') + 'A1!'; // e.g. 84bc8d8a7c2aA1!

    // 3. Create Auth User
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: employee.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name: employee.first_name,
        last_name: employee.last_name,
      }
    });

    if (authErr) {
      if (authErr.message.includes('already registered')) {
        throw new AppError('An account with this email already exists', 409);
      }
      throw new AppError(authErr.message, 500);
    }

    const authUser = authData.user;

    // 4. Upsert Profile (same tenant as the employee being provisioned)
    await db.from('profiles').upsert({
      id: authUser.id,
      email: employee.email,
      first_name: employee.first_name,
      last_name: employee.last_name,
      is_active: true,
      tenant_id: employee.tenant_id,
    });

    // 5. Assign Employee Role
    const { data: roleData } = await db.from('roles').select('id').eq('slug', ROLES.EMPLOYEE).single();
    if (roleData) {
      await db.from('user_roles').upsert(
        { user_id: authUser.id, role_id: roleData.id, tenant_id: employee.tenant_id },
        { onConflict: 'user_id,role_id' }
      );
    }

    // 6. Link Employee to User
    const { error: updateErr } = await db
      .from('employees')
      .update({ user_id: authUser.id })
      .eq('id', employeeId);

    if (updateErr) {
      // Rollback best-effort
      await supabaseAdmin.auth.admin.deleteUser(authUser.id).catch(() => {});
      throw new AppError('Failed to link user to employee record', 500);
    }

    return successResponse(res, { tempPassword, userId: authUser.id }, 'Employee account provisioned successfully');
  } catch (error) {
    next(error);
  }
};

exports.disableAccount = async (req, res, next) => {
  try {
    const employeeId = req.params.id;

    const { data: employee, error: empErr } = await withTenant(
      db.from('employees').select('user_id').eq('id', employeeId),
      req.user.tenantId
    ).single();

    if (empErr || !employee) throw new AppError('Employee not found', 404);
    if (!employee.user_id) throw new AppError('Employee does not have a provisioned account', 400);

    const { error: profileErr } = await db
      .from('profiles')
      .update({ is_active: false })
      .eq('id', employee.user_id);

    if (profileErr) throw new AppError('Failed to disable account', 500);

    return successResponse(res, null, 'Employee account disabled successfully');
  } catch (error) {
    next(error);
  }
};
