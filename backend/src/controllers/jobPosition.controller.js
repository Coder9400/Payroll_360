const { supabaseAdmin, supabase } = require('../config/supabase');
const AppError = require('../utils/appError');
const { successResponse } = require('../utils/apiResponse');

const db = supabaseAdmin || supabase;

exports.createJobPosition = async (req, res, next) => {
  try {
    const { data, error } = await db
      .from('job_positions')
      .insert([req.body])
      .select('*, departments(name)')
      .single();

    if (error) {
      if (error.code === '23505') throw new AppError('Job Position code already exists', 409);
      if (error.code === '23503') throw new AppError('Department does not exist', 400);
      throw new AppError(error.message, 500);
    }

    return successResponse(res, data, 'Job Position created successfully', 201);
  } catch (error) {
    next(error);
  }
};

exports.getJobPositions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, department_id } = req.query;
    const offset = (page - 1) * limit;

    let query = db
      .from('job_positions')
      .select('*, departments(name, code)', { count: 'exact' });

    if (department_id) {
      query = query.eq('department_id', department_id);
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

exports.getJobPositionById = async (req, res, next) => {
  try {
    const { data, error } = await db
      .from('job_positions')
      .select('*, departments(*)')
      .eq('id', req.params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw new AppError('Job Position not found', 404);
      throw new AppError(error.message, 500);
    }

    return successResponse(res, data);
  } catch (error) {
    next(error);
  }
};

exports.updateJobPosition = async (req, res, next) => {
  try {
    const { data, error } = await db
      .from('job_positions')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw new AppError('Job Position not found', 404);
      if (error.code === '23505') throw new AppError('Job Position code already exists', 409);
      if (error.code === '23503') throw new AppError('Department does not exist', 400);
      throw new AppError(error.message, 500);
    }

    return successResponse(res, data, 'Job Position updated successfully');
  } catch (error) {
    next(error);
  }
};

exports.deleteJobPosition = async (req, res, next) => {
  try {
    const { data, error } = await db
      .from('job_positions')
      .delete()
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw new AppError('Job Position not found', 404);
      if (error.code === '23503') throw new AppError('Cannot delete job position because it is referenced by other records', 409);
      throw new AppError(error.message, 500);
    }

    return successResponse(res, data, 'Job Position deleted successfully');
  } catch (error) {
    next(error);
  }
};
