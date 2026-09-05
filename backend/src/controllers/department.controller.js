const { supabaseAdmin, supabase } = require('../config/supabase');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const { successResponse } = require('../utils/apiResponse');
const { withTenant, withTenantId } = require('../utils/tenantScope');

const db = supabaseAdmin || supabase;

exports.createDepartment = async (req, res, next) => {
  try {
    const payload = withTenantId(req.body, req.user.tenantId);
    const { data, error } = await db
      .from('departments')
      .insert([payload])
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

    const { data, error, count } = await withTenant(
      db.from('departments').select('*', { count: 'exact' }),
      req.user.tenantId
    )
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
    const { data, error } = await withTenant(
      db.from('departments').select('*').eq('id', req.params.id),
      req.user.tenantId
    ).single();

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
    const { tenant_id, ...body } = req.body || {};
    const { data, error } = await withTenant(
      db.from('departments').update(body).eq('id', req.params.id),
      req.user.tenantId
    ).select().single();

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
    const { data, error } = await withTenant(
      db.from('departments').delete().eq('id', req.params.id),
      req.user.tenantId
    ).select().single();

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
