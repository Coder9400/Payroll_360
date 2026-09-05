const { supabaseAdmin, supabase } = require('../config/supabase');
const AppError = require('../utils/appError');
const { successResponse } = require('../utils/apiResponse');

const db = supabaseAdmin || supabase;

exports.createEmployee = async (req, res, next) => {
  try {
    const { data, error } = await db
      .from('employees')
      .insert([req.body])
      .select('*, departments(name), job_positions(name)')
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
    const { page = 1, limit = 20, department_id, manager_id, employment_status } = req.query;
    const offset = (page - 1) * limit;

    let query = db
      .from('employees')
      .select('*, departments(name), job_positions(name), working_schedules(name)', { count: 'exact' });

    if (department_id) query = query.eq('department_id', department_id);
    if (manager_id) query = query.eq('manager_id', manager_id);
    if (employment_status) query = query.eq('employment_status', employment_status);

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
    const { data, error } = await db
      .from('employees')
      .select('*, departments(*), job_positions(*), working_schedules(*), manager:manager_id(id, first_name, last_name)')
      .eq('id', req.params.id)
      .single();

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
    const { data, error } = await db
      .from('employees')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

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
