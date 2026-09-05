const { supabaseAdmin, supabase } = require('../config/supabase');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const { successResponse } = require('../utils/apiResponse');

const db = supabaseAdmin || supabase;

exports.createDepartment = async (req, res, next) => {
  try {
    const { data, error } = await db
      .from('departments')
      .insert([req.body])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new AppError('Department name or code already exists', 409);
      }
      throw new AppError(error.message, 500);
    }

    return successResponse(res, data, 'Department created successfully', 201);
  } catch (error) {
    next(error);
  }
};

exports.getDepartments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { data, error, count } = await db
      .from('departments')
      .select('*', { count: 'exact' })
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

exports.getDepartmentById = async (req, res, next) => {
  try {
    const { data, error } = await db
      .from('departments')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw new AppError('Department not found', 404);
      throw new AppError(error.message, 500);
    }

    return successResponse(res, data);
  } catch (error) {
    next(error);
  }
};

exports.updateDepartment = async (req, res, next) => {
  try {
    const { data, error } = await db
      .from('departments')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw new AppError('Department not found', 404);
      if (error.code === '23505') throw new AppError('Department name or code already exists', 409);
      throw new AppError(error.message, 500);
    }

    return successResponse(res, data, 'Department updated successfully');
  } catch (error) {
    next(error);
  }
};

exports.deleteDepartment = async (req, res, next) => {
  try {
    const { data, error } = await db
      .from('departments')
      .delete()
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw new AppError('Department not found', 404);
      if (error.code === '23503') throw new AppError('Cannot delete department because it is referenced by other records', 409);
      throw new AppError(error.message, 500);
    }

    return successResponse(res, data, 'Department deleted successfully');
  } catch (error) {
    next(error);
  }
};
