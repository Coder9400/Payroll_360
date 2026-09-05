const { supabaseAdmin, supabase, isConfigured } = require('../config/supabase');
const AppError = require('../utils/appError');
const { successResponse } = require('../utils/apiResponse');
const { ROLES } = require('../config/rbacConstants');
const crypto = require('crypto');

const db = supabaseAdmin || supabase;

exports.createHrUser = async (req, res, next) => {
  try {
    const { email, first_name, last_name, role } = req.body;

    if (!email || !first_name || !last_name) {
      throw new AppError('Email, first_name, and last_name are required', 400);
    }

    // Must be a valid HR role, default to HR Manager
    const targetRole = role || ROLES.HR_MANAGER;
    if (![ROLES.HR_MANAGER, ROLES.HR_PAYROLL_MANAGER, ROLES.HR_PAYROLL_USER].includes(targetRole)) {
      throw new AppError('Invalid HR role specified', 400);
    }

    if (!isConfigured || !supabaseAdmin) {
      throw new AppError('Supabase Admin is not configured', 500);
    }

    // 1. Generate secure temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex') + 'A1!';

    // 2. Create Auth User
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name: first_name,
        last_name: last_name,
      }
    });

    if (authErr) {
      if (authErr.message.includes('already registered')) {
        throw new AppError('An account with this email already exists', 409);
      }
      throw new AppError(authErr.message, 500);
    }

    const authUser = authData.user;

    // 3. Upsert Profile
    await db.from('profiles').upsert({
      id: authUser.id,
      email: email,
      first_name: first_name,
      last_name: last_name,
      is_active: true
    });

    // 4. Assign HR Role
    const { data: roleData } = await db.from('roles').select('id').eq('slug', targetRole).single();
    if (roleData) {
      await db.from('user_roles').upsert({ user_id: authUser.id, role_id: roleData.id });
    }

    return successResponse(res, { tempPassword, userId: authUser.id, role: targetRole }, 'HR user created successfully');
  } catch (error) {
    next(error);
  }
};
