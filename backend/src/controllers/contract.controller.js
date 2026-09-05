const { supabaseAdmin, supabase } = require('../config/supabase');
const AppError = require('../utils/appError');
const { successResponse } = require('../utils/apiResponse');
const { withTenant, withTenantId } = require('../utils/tenantScope');

const db = supabaseAdmin || supabase;

exports.createContract = async (req, res, next) => {
  try {
    const { employee_id, start_date, end_date } = req.body;

    // Check for overlapping active contracts for the same employee
    let query = withTenant(
      db.from('contracts').select('id').eq('employee_id', employee_id).eq('status', 'ACTIVE'),
      req.user.tenantId
    );

    if (end_date) {
      query = query.or(`and(start_date.lte.${end_date},end_date.gte.${start_date}),and(start_date.lte.${end_date},end_date.is.null)`);
    } else {
      query = query.or(`end_date.gte.${start_date},end_date.is.null`);
    }

    const { data: overlappingContracts, error: overlapError } = await query;

    if (overlapError) throw new AppError(overlapError.message, 500);

    if (overlappingContracts && overlappingContracts.length > 0) {
      throw new AppError('An overlapping active contract already exists for this date range', 409);
    }

    const payload = withTenantId(req.body, req.user.tenantId);
    const { data, error } = await db
      .from('contracts')
      .insert([payload])
      .select('*, employees(first_name, last_name, employee_code)')
      .single();

    if (error) {
      if (error.code === '23505') throw new AppError('Contract number already exists', 409);
      if (error.code === '23503') throw new AppError('A related record (Employee, Department, Job Position, Schedule) does not exist', 400);
      throw new AppError(error.message, 500);
    }

    return successResponse(res, data, 'Contract created successfully', 201);
  } catch (error) {
    next(error);
  }
};

exports.getContracts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, employee_id, status } = req.query;
    const offset = (page - 1) * limit;

    let query = withTenant(
      db.from('contracts').select('*, employees(first_name, last_name, employee_code), departments(name), job_positions(name)', { count: 'exact' }),
      req.user.tenantId
    );

    if (employee_id) query = query.eq('employee_id', employee_id);
    if (status) query = query.eq('status', status);

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

exports.getContractById = async (req, res, next) => {
  try {
    const { data, error } = await withTenant(
      db.from('contracts').select('*, employees(*), departments(*), job_positions(*), working_schedules(*)').eq('id', req.params.id),
      req.user.tenantId
    ).single();

    if (error) {
      if (error.code === 'PGRST116') throw new AppError('Contract not found', 404);
      throw new AppError(error.message, 500);
    }

    return successResponse(res, data);
  } catch (error) {
    next(error);
  }
};

exports.updateContract = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tenant_id, ...body } = req.body || {};
    const { start_date, end_date, employee_id, status } = body;

    if (status === 'ACTIVE') {
      const empId = employee_id ?? (await withTenant(db.from('contracts').select('employee_id').eq('id', id), req.user.tenantId).single()).data?.employee_id;
      let query = withTenant(
        db.from('contracts').select('id').eq('employee_id', empId).eq('status', 'ACTIVE').neq('id', id),
        req.user.tenantId
      );

      if (end_date) {
        query = query.or(`and(start_date.lte.${end_date},end_date.gte.${start_date}),and(start_date.lte.${end_date},end_date.is.null)`);
      } else if (start_date) {
        query = query.or(`end_date.gte.${start_date},end_date.is.null`);
      }

      const { data: overlapping, error: overlapError } = await query;
      if (overlapError) throw new AppError(overlapError.message, 500);
      if (overlapping && overlapping.length > 0) {
        throw new AppError('An overlapping active contract already exists for this date range', 409);
      }
    }

    const { data, error } = await withTenant(
      db.from('contracts').update(body).eq('id', id),
      req.user.tenantId
    ).select('*, employees(first_name, last_name, employee_code)').single();

    if (error) {
      if (error.code === 'PGRST116') throw new AppError('Contract not found', 404);
      if (error.code === '23505') throw new AppError('Contract number already exists', 409);
      if (error.code === '23503') throw new AppError('A related record (Employee, Department, Job Position, Schedule) does not exist', 400);
      throw new AppError(error.message, 500);
    }

    return successResponse(res, data, 'Contract updated successfully');
  } catch (error) {
    next(error);
  }
};

exports.getApplicableContract = async (req, res, next) => {
  try {
    const { employeeId, date } = req.params;

    const { data, error } = await withTenant(
      db.from('contracts')
        .select('*, working_schedules(*, working_schedule_days(*))')
        .eq('employee_id', employeeId)
        .eq('status', 'ACTIVE')
        .lte('start_date', date)
        .or(`end_date.gte.${date},end_date.is.null`),
      req.user.tenantId
    )
      .order('start_date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw new AppError('No applicable active contract found for the given date', 404);
      throw new AppError(error.message, 500);
    }

    return successResponse(res, data);
  } catch (error) {
    next(error);
  }
};
