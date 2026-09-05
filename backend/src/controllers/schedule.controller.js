const { supabaseAdmin, supabase } = require('../config/supabase');
const AppError = require('../utils/appError');
const { successResponse } = require('../utils/apiResponse');

const db = supabaseAdmin || supabase;

// Helper function to calculate weekly hours
const calculateWeeklyHours = (days) => {
  let totalMinutes = 0;
  for (const day of days) {
    if (day.is_working_day && day.start_time && day.end_time) {
      const [startHour, startMin] = day.start_time.split(':').map(Number);
      const [endHour, endMin] = day.end_time.split(':').map(Number);
      
      const startTotal = startHour * 60 + startMin;
      const endTotal = endHour * 60 + endMin;
      
      let workedMinutes = endTotal - startTotal;
      if (workedMinutes < 0) workedMinutes += 24 * 60; // handle midnight wrap around if any
      
      workedMinutes -= (day.break_minutes || 0);
      if (workedMinutes > 0) {
        totalMinutes += workedMinutes;
      }
    }
  }
  return Number((totalMinutes / 60).toFixed(2));
};

exports.createSchedule = async (req, res, next) => {
  try {
    const { name, code, days } = req.body;
    const hours_week = calculateWeeklyHours(days);

    // Using a transaction/RPC or just sequential inserts since Supabase JS client doesn't do true interactive transactions easily
    // We'll insert schedule first, then days
    const { data: schedule, error: scheduleError } = await db
      .from('working_schedules')
      .insert([{ name, code, hours_week }])
      .select()
      .single();

    if (scheduleError) {
      if (scheduleError.code === '23505') throw new AppError('Schedule code already exists', 409);
      throw new AppError(scheduleError.message, 500);
    }

    const daysToInsert = days.map(d => ({
      ...d,
      schedule_id: schedule.id
    }));

    const { error: daysError } = await db
      .from('working_schedule_days')
      .insert(daysToInsert);

    if (daysError) {
      // Rollback manual attempt
      await db.from('working_schedules').delete().eq('id', schedule.id);
      throw new AppError('Failed to create schedule days: ' + daysError.message, 500);
    }

    const { data: fullSchedule } = await db
      .from('working_schedules')
      .select('*, working_schedule_days(*)')
      .eq('id', schedule.id)
      .single();

    return successResponse(res, fullSchedule, 'Working Schedule created successfully', 201);
  } catch (error) {
    next(error);
  }
};

exports.getSchedules = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { data, error, count } = await db
      .from('working_schedules')
      .select('*, working_schedule_days(*)', { count: 'exact' })
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

exports.getScheduleById = async (req, res, next) => {
  try {
    const { data, error } = await db
      .from('working_schedules')
      .select('*, working_schedule_days(*)')
      .eq('id', req.params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw new AppError('Working Schedule not found', 404);
      throw new AppError(error.message, 500);
    }

    return successResponse(res, data);
  } catch (error) {
    next(error);
  }
};
