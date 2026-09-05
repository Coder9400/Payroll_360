/**
 * Attendance Service — Phase 2
 *
 * Business Logic:
 * ─────────────────────────────────────────────────────────────────────────────
 * CHECK-IN
 *   1. Resolve employee from auth user (or use provided employee_id for HR)
 *   2. Verify today is a working day per the employee's schedule
 *   3. Prevent duplicate check-in (UNIQUE DB constraint + pre-check)
 *   4. Snapshot schedule's expected_start, expected_end, break_minutes
 *   5. Determine status: PRESENT vs LATE (if check_in > expected_start)
 *   6. Insert attendance row with status = MISSING_CHECKOUT initially
 *
 * CHECK-OUT
 *   1. Find the open attendance record (check_in NOT NULL, check_out IS NULL)
 *   2. Reject if no open session
 *   3. Reject if check_out <= check_in
 *   4. Calculate worked_hours = (check_out - check_in) - break_minutes
 *   5. Determine final status: PRESENT | LATE | HALF_DAY | OVERTIME | CORRECTED
 *   6. Calculate overtime_hours if worked > expected
 *
 * CORRECTION
 *   1. Only HR/admin can correct
 *   2. Any corrected record sets is_manual_edit = true, stores correction_reason
 *   3. Recalculates worked_hours and status on correction
 *
 * LATE DETECTION
 *   Actual check_in > expected_start → LATE
 *
 * OVERTIME
 *   worked_hours > expected_hours → OVERTIME (base status; also records overtime_hours)
 *
 * MISSING CHECKOUT
 *   check_out IS NULL → status remains MISSING_CHECKOUT
 *
 * WORKED HOURS
 *   worked_hours = totalMinutes(check_out - check_in) / 60 - (break_minutes / 60)
 *   Minimum: 0 (never negative)
 *
 * ABSENCE DETECTION
 *   Not stored as rows. Calculated on-demand by getAbsenceSummary.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { supabaseAdmin, supabase } = require('../config/supabase');
const AppError = require('../utils/appError');
const { ATTENDANCE_STATUS, ATTENDANCE_ERRORS } = require('../config/attendanceConstants');

const db = supabaseAdmin || supabase;

// ---------------------------------------------------------------------------
// PRIVATE HELPERS
// ---------------------------------------------------------------------------

/**
 * Resolve employee record from an authenticated user's user_id.
 * @param {string} userId - Authenticated user's UUID from req.user.id
 * @returns {Promise<object>} Employee record with working_schedule_days
 */
async function resolveEmployeeFromUser(userId) {
  const { data, error } = await db
    .from('employees')
    .select('*, working_schedules(*, working_schedule_days(*))')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new AppError(
      'No employee record linked to your account. Contact HR.',
      404,
      ATTENDANCE_ERRORS.EMPLOYEE_NOT_FOUND
    );
  }

  return data;
}

/**
 * Get employee with schedule by employee_id (for HR operations).
 * @param {string} employeeId
 * @returns {Promise<object>}
 */
async function getEmployeeWithSchedule(employeeId) {
  const { data, error } = await db
    .from('employees')
    .select('*, working_schedules(*, working_schedule_days(*))')
    .eq('id', employeeId)
    .single();

  if (error || !data) {
    throw new AppError('Employee not found', 404, ATTENDANCE_ERRORS.EMPLOYEE_NOT_FOUND);
  }

  return data;
}

/**
 * Get the working_schedule_day entry for a given date (by day_of_week).
 * @param {object} employee - Employee with working_schedules.working_schedule_days
 * @param {Date} date
 * @returns {object|null} Schedule day entry or null
 */
function getScheduleDayForDate(employee, date) {
  const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, ...6=Saturday
  const scheduleDays = employee.working_schedules?.working_schedule_days || [];
  return scheduleDays.find((d) => d.day_of_week === dayOfWeek) || null;
}

/**
 * Parse a TIME string like "09:00" into { hours, minutes }
 * @param {string|null} timeStr
 * @returns {{ hours: number, minutes: number }|null}
 */
function parseTime(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return { hours: h, minutes: m };
}

/**
 * Calculate worked hours from check_in and check_out timestamps.
 * Subtracts break_minutes from the raw difference.
 *
 * @param {string|Date} checkIn
 * @param {string|Date} checkOut
 * @param {number} breakMinutes
 * @returns {number} Worked hours (>= 0)
 */
function calculateWorkedHours(checkIn, checkOut, breakMinutes = 0) {
  const ci = new Date(checkIn);
  const co = new Date(checkOut);
  const totalMinutes = (co - ci) / 60000; // ms → minutes
  const workedMinutes = Math.max(0, totalMinutes - breakMinutes);
  return Math.round((workedMinutes / 60) * 100) / 100; // round to 2dp
}

/**
 * Determine attendance status based on check-in time and schedule.
 *
 * Rules:
 *   1. If worked_hours > expected_hours → OVERTIME
 *   2. Else if check_in_time > expected_start → LATE
 *   3. Else if worked_hours < (expected_hours * 0.5) → HALF_DAY
 *   4. Else → PRESENT
 *
 * @param {object} params
 * @returns {string} ATTENDANCE_STATUS value
 */
function determineStatus({ checkIn, workedHours, expectedStart, expectedHours, isManualEdit }) {
  if (isManualEdit) return ATTENDANCE_STATUS.CORRECTED;

  const checkInDate = new Date(checkIn);
  // Use UTC hours/minutes to compare consistently with stored timestamps (UTC)
  const checkInTime = checkInDate.getUTCHours() * 60 + checkInDate.getUTCMinutes();

  let isLate = false;
  if (expectedStart) {
    const parsed = parseTime(expectedStart);
    if (parsed) {
      const expectedStartMinutes = parsed.hours * 60 + parsed.minutes;
      isLate = checkInTime > expectedStartMinutes;
    }
  }

  if (expectedHours && workedHours > expectedHours) {
    // OVERTIME (also late if applicable — overtime takes precedence for status)
    return ATTENDANCE_STATUS.OVERTIME;
  }

  if (isLate) return ATTENDANCE_STATUS.LATE;

  if (expectedHours && workedHours < expectedHours * 0.5) {
    return ATTENDANCE_STATUS.HALF_DAY;
  }

  return ATTENDANCE_STATUS.PRESENT;
}

// ---------------------------------------------------------------------------
// SERVICE METHODS
// ---------------------------------------------------------------------------

/**
 * Check-in an employee.
 *
 * @param {object} params
 * @param {string} params.userId - Authenticated user ID (from req.user.id)
 * @param {string} [params.employeeId] - HR override: specific employee to check in
 * @param {string} [params.notes]
 * @param {string} params.createdBy - User UUID performing the action
 * @returns {Promise<object>} Created attendance record
 */
async function checkIn({ userId, employeeId, notes, createdBy }) {
  // Resolve employee
  let employee;
  if (employeeId) {
    employee = await getEmployeeWithSchedule(employeeId);
  } else {
    employee = await resolveEmployeeFromUser(userId);
  }

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

  // Get schedule for today
  const scheduleDay = getScheduleDayForDate(employee, now);

  // Check if there's already an attendance for today
  const { data: existing } = await db
    .from('attendance')
    .select('id, status, check_out')
    .eq('employee_id', employee.id)
    .eq('attendance_date', todayStr)
    .single();

  if (existing) {
    throw new AppError(
      'Attendance record already exists for today',
      409,
      ATTENDANCE_ERRORS.ALREADY_EXISTS
    );
  }

  // Snapshot expected schedule values
  const expectedStart = scheduleDay?.start_time || null;
  const expectedEnd = scheduleDay?.end_time || null;
  const breakMinutes = scheduleDay?.break_minutes || 0;

  // Calculate expected working hours from schedule
  let expectedHours = null;
  if (expectedStart && expectedEnd) {
    const start = parseTime(expectedStart);
    const end = parseTime(expectedEnd);
    if (start && end) {
      const totalMinutes = (end.hours * 60 + end.minutes) - (start.hours * 60 + start.minutes);
      expectedHours = Math.max(0, Math.round(((totalMinutes - breakMinutes) / 60) * 100) / 100);
    }
  }

  // Insert attendance row with status = MISSING_CHECKOUT (check_out not yet done)
  const { data, error } = await db
    .from('attendance')
    .insert([{
      employee_id: employee.id,
      attendance_date: todayStr,
      check_in: now.toISOString(),
      check_out: null,
      worked_hours: null,
      status: ATTENDANCE_STATUS.MISSING_CHECKOUT,
      expected_start: expectedStart,
      expected_end: expectedEnd,
      expected_hours: expectedHours,
      break_minutes: breakMinutes,
      overtime_hours: null,
      is_manual_edit: false,
      notes: notes || null,
      created_by: createdBy,
      updated_by: createdBy,
    }])
    .select('*, employees(first_name, last_name, employee_code)')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new AppError(
        'Attendance record already exists for today',
        409,
        ATTENDANCE_ERRORS.ALREADY_EXISTS
      );
    }
    throw new AppError(error.message, 500);
  }

  return data;
}

/**
 * Check-out an employee.
 * Finds the open attendance record (check_in set, check_out null) for today.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} [params.employeeId]
 * @param {string} [params.notes]
 * @param {string} params.updatedBy
 * @returns {Promise<object>} Updated attendance record
 */
async function checkOut({ userId, employeeId, notes, updatedBy }) {
  // Resolve employee
  let employee;
  if (employeeId) {
    employee = await getEmployeeWithSchedule(employeeId);
  } else {
    employee = await resolveEmployeeFromUser(userId);
  }

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // Find open session
  const { data: openRecord, error: fetchError } = await db
    .from('attendance')
    .select('*')
    .eq('employee_id', employee.id)
    .eq('attendance_date', todayStr)
    .is('check_out', null)
    .single();

  if (fetchError || !openRecord) {
    throw new AppError(
      'No open attendance session found for today. Please check in first.',
      404,
      ATTENDANCE_ERRORS.NO_OPEN_SESSION
    );
  }

  // Validate: check_out must be after check_in
  if (openRecord.check_in && now <= new Date(openRecord.check_in)) {
    throw new AppError(
      'Check-out time must be after check-in time',
      400,
      ATTENDANCE_ERRORS.INVALID_CHECKOUT_TIME
    );
  }

  // Calculate worked hours
  const workedHours = calculateWorkedHours(openRecord.check_in, now, openRecord.break_minutes || 0);

  // Calculate overtime
  let overtimeHours = null;
  if (openRecord.expected_hours != null && workedHours > openRecord.expected_hours) {
    overtimeHours = Math.round((workedHours - openRecord.expected_hours) * 100) / 100;
  }

  // Determine final status
  const status = determineStatus({
    checkIn: openRecord.check_in,
    workedHours,
    expectedStart: openRecord.expected_start,
    expectedHours: openRecord.expected_hours,
    isManualEdit: false,
  });

  // Update the record
  const { data, error } = await db
    .from('attendance')
    .update({
      check_out: now.toISOString(),
      worked_hours: workedHours,
      overtime_hours: overtimeHours,
      status,
      notes: notes || openRecord.notes,
      updated_by: updatedBy,
      updated_at: now.toISOString(),
    })
    .eq('id', openRecord.id)
    .select('*, employees(first_name, last_name, employee_code)')
    .single();

  if (error) throw new AppError(error.message, 500);

  return data;
}

/**
 * Correct an attendance record (HR/Admin only).
 * Any correction sets is_manual_edit = true and requires correction_reason.
 *
 * @param {object} params
 * @param {string} params.attendanceId
 * @param {object} params.corrections - Fields to correct
 * @param {string} params.updatedBy
 * @returns {Promise<object>} Updated attendance record
 */
async function correctAttendance({ attendanceId, corrections, updatedBy }) {
  const { data: existing, error: fetchError } = await db
    .from('attendance')
    .select('*')
    .eq('id', attendanceId)
    .single();

  if (fetchError || !existing) {
    throw new AppError('Attendance record not found', 404, ATTENDANCE_ERRORS.NOT_FOUND);
  }

  const checkIn = corrections.check_in !== undefined ? corrections.check_in : existing.check_in;
  const checkOut = corrections.check_out !== undefined ? corrections.check_out : existing.check_out;

  // Validate time range if both are provided
  if (checkIn && checkOut && new Date(checkOut) <= new Date(checkIn)) {
    throw new AppError(
      'check_out must be after check_in',
      400,
      ATTENDANCE_ERRORS.INVALID_CHECKOUT_TIME
    );
  }

  // Recalculate worked hours and status if times changed
  let workedHours = existing.worked_hours;
  let status = corrections.status || ATTENDANCE_STATUS.CORRECTED;
  let overtimeHours = existing.overtime_hours;

  if (checkIn && checkOut) {
    workedHours = calculateWorkedHours(checkIn, checkOut, existing.break_minutes || 0);

    if (existing.expected_hours != null && workedHours > existing.expected_hours) {
      overtimeHours = Math.round((workedHours - existing.expected_hours) * 100) / 100;
    } else {
      overtimeHours = null;
    }

    if (!corrections.status) {
      status = ATTENDANCE_STATUS.CORRECTED;
    }
  } else if (checkIn && !checkOut) {
    workedHours = null;
    status = ATTENDANCE_STATUS.MISSING_CHECKOUT;
    overtimeHours = null;
  }

  const { data, error } = await db
    .from('attendance')
    .update({
      ...(corrections.attendance_date && { attendance_date: corrections.attendance_date }),
      ...(checkIn !== undefined && { check_in: checkIn }),
      ...(checkOut !== undefined && { check_out: checkOut }),
      worked_hours: workedHours,
      overtime_hours: overtimeHours,
      status,
      is_manual_edit: true,
      correction_reason: corrections.correction_reason,
      notes: corrections.notes !== undefined ? corrections.notes : existing.notes,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', attendanceId)
    .select('*, employees(first_name, last_name, employee_code)')
    .single();

  if (error) throw new AppError(error.message, 500);

  return data;
}

/**
 * Get attendance records with filters and pagination.
 *
 * @param {object} filters
 * @param {string} [filters.employee_id]
 * @param {string} [filters.date_from]
 * @param {string} [filters.date_to]
 * @param {string} [filters.status]
 * @param {string} [filters.department_id]
 * @param {number} [filters.page=1]
 * @param {number} [filters.limit=20]
 * @returns {Promise<object>} Paginated attendance list
 */
async function getAttendance(filters = {}) {
  const { page = 1, limit = 20, employee_id, date_from, date_to, status, department_id } = filters;
  const offset = (page - 1) * limit;

  let query = db
    .from('attendance')
    .select(
      '*, employees!inner(id, first_name, last_name, employee_code, department_id)',
      { count: 'exact' }
    );

  if (employee_id) query = query.eq('employee_id', employee_id);
  if (date_from) query = query.gte('attendance_date', date_from);
  if (date_to) query = query.lte('attendance_date', date_to);
  if (status) query = query.eq('status', status);
  if (department_id) query = query.eq('employees.department_id', department_id);

  const { data, error, count } = await query
    .range(offset, offset + Number(limit) - 1)
    .order('attendance_date', { ascending: false })
    .order('check_in', { ascending: false });

  if (error) throw new AppError(error.message, 500);

  return {
    data,
    page: Number(page),
    limit: Number(limit),
    total: count,
    totalPages: Math.ceil(count / limit),
  };
}

/**
 * Get single attendance record by ID.
 */
async function getAttendanceById(id) {
  const { data, error } = await db
    .from('attendance')
    .select('*, employees(first_name, last_name, employee_code)')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new AppError('Attendance record not found', 404, ATTENDANCE_ERRORS.NOT_FOUND);
  }

  return data;
}

/**
 * Get attendance for a specific employee.
 */
async function getEmployeeAttendance(employeeId, filters = {}) {
  return getAttendance({ ...filters, employee_id: employeeId });
}

/**
 * Resolve the employee linked to a user.
 * Exported for use in controllers.
 */
async function getEmployeeByUserId(userId) {
  return resolveEmployeeFromUser(userId);
}

/**
 * Utility: determine if a given date is a working day for an employee.
 * Used by Time Off service for duration calculation.
 *
 * @param {object} scheduleDays - Array of working_schedule_days rows
 * @param {Date|string} date
 * @returns {boolean}
 */
function isWorkingDay(scheduleDays, date) {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const scheduleDay = scheduleDays.find((sd) => sd.day_of_week === dayOfWeek);
  return scheduleDay ? scheduleDay.is_working_day : false;
}

module.exports = {
  checkIn,
  checkOut,
  correctAttendance,
  getAttendance,
  getAttendanceById,
  getEmployeeAttendance,
  getEmployeeByUserId,
  isWorkingDay,
  // Exported for testing
  calculateWorkedHours,
  determineStatus,
  getScheduleDayForDate,
  parseTime,
};
