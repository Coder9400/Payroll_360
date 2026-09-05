const { supabaseAdmin, supabase } = require('../config/supabase');
const AppError = require('../utils/appError');
const { successResponse } = require('../utils/apiResponse');
const { withTenant, withTenantId } = require('../utils/tenantScope');

const db = supabaseAdmin || supabase;

exports.createTimeOffType = async (req, res, next) => {
  try {
    const payload = withTenantId(req.body, req.user.tenantId);
    const { data, error } = await db
      .from('time_off_types')
      .insert([payload])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new AppError('Time Off Type name or code already exists', 409);
      throw new AppError(error.message, 500);
    }

    return successResponse(res, data, 'Time Off Type created successfully', 201);
  } catch (error) {
    next(error);
  }
};

exports.getTimeOffTypes = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { data, error, count } = await withTenant(
      db.from('time_off_types').select('*', { count: 'exact' }),
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

exports.getTimeOffTypeById = async (req, res, next) => {
  try {
    const { data, error } = await withTenant(
      db.from('time_off_types').select('*').eq('id', req.params.id),
      req.user.tenantId
    ).single();

    if (error) {
      if (error.code === 'PGRST116') throw new AppError('Time Off Type not found', 404);
      throw new AppError(error.message, 500);
    }

    return successResponse(res, data);
  } catch (error) {
    next(error);
  }
};
