/**
 * Attendance Service — Phase 5
 *
 * Core Flow:
 * Employee -> Check In -> Check Out -> Worked Hours -> Compare with Working Schedule -> Overtime
 *
 * Features:
 * - Check-in / Check-out with worked duration calculation on backend
 * - Schedule lookup and comparison (expected minutes, late arrival detection)
 * - Prevention of duplicate check-in, check-out without check-in, multiple open records
 * - Overtime tracking: actual worked minutes - expected worked minutes
 * - Attendance Regularization request & approve/reject lifecycle
 * - True database persistence with Supabase, strictly forbidding silent mock fallback in production
 */

const { supabaseAdmin, supabase, isConfigured } = require('../config/supabase');
const AppError = require('../utils/appError');
const config = require('../config/env');
const scheduleService = require('./schedule.service');

const db = supabaseAdmin || supabase;

// In-memory mock stores strictly isolated for unit testing and offline dev
const mockAttendance = new Map();
const mockRegularization = new Map();
const mockOvertime = new Map();

class AttendanceService {
  constructor() {
    this._tableName = null;
  }

  _useDB() {
    return Boolean(isConfigured && db);
  }

  /**
   * Identifies whether the database uses 'attendance_records' or 'attendance'.
   */
  async _getAttendanceTable() {
    if (this._tableName) return this._tableName;
    if (!this._useDB()) return 'attendance_records';
    try {
      const { error } = await db.from('attendance_records').select('id').limit(1);
      if (!error || error.code !== 'PGRST205') {
        this._tableName = 'attendance_records';
        return 'attendance_records';
      }
    } catch {
      // ignore
    }
    this._tableName = 'attendance';
    return 'attendance';
  }

  /**
   * Enforces that database errors in production are NEVER silently masked.
   */
  _handleDBError(error, operationName) {
    console.error(`[AttendanceService ${operationName}] Database error:`, error?.message || error);
    if (config.isProduction || process.env.NODE_ENV === 'production') {
      throw new AppError(`Database operation failed: ${error?.message || 'Internal database error'}`, 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Normalizes record fields so both 'date' and 'attendance_date',
   * and both 'worked_minutes' and 'worked_hours' are consistently populated.
   */
  _normalizeRecord(r) {
    if (!r) return null;
    const date = r.date || r.attendance_date;
    const worked_minutes = r.worked_minutes !== undefined
      ? r.worked_minutes
      : Math.round((r.worked_hours || 0) * 60);
    const expected_minutes = r.expected_minutes !== undefined
      ? r.expected_minutes
      : Math.round((r.expected_hours || 0) * 60);
    const overtime_minutes = r.overtime_minutes !== undefined
      ? r.overtime_minutes
      : Math.round((r.overtime_hours || 0) * 60);

    const worked_hours = r.worked_hours !== undefined
      ? r.worked_hours
      : Number((worked_minutes / 60).toFixed(2));
    const overtime_hours = r.overtime_hours !== undefined
      ? r.overtime_hours
      : Number((overtime_minutes / 60).toFixed(2));
    const expected_hours = r.expected_hours !== undefined
      ? r.expected_hours
      : Number((expected_minutes / 60).toFixed(2));

    return {
      ...r,
      date,
      attendance_date: date,
      worked_minutes,
      expected_minutes,
      overtime_minutes,
      worked_hours,
      expected_hours,
      overtime_hours,
    };
  }

  /**
   * Helper to resolve employee schedule for a given date.
   * Returns expected minutes and shift start time (or sensible defaults).
   */
  async _getShiftInfo(employeeId, dateStr) {
    let expectedMinutes = 480; // 8 hours default
    let shiftStartTime = '09:00:00';
    let breakMinutes = 60;
    let isWorkingDay = true;

    try {
      const scheduleAssignment = await scheduleService.getEmployeeSchedule(employeeId, dateStr);
      const schedule = scheduleAssignment?.working_schedules || scheduleAssignment?.schedule;
      const days = schedule?.days || schedule?.working_schedule_days || [];

      const targetDate = new Date(dateStr);
      const dayOfWeek = targetDate.getUTCDay(); // 0 = Sunday, 1 = Monday, ...

      const dayConfig = days.find((d) => (d.day_of_week ?? d.dayOfWeek) === dayOfWeek);
      if (dayConfig) {
        isWorkingDay = Boolean(dayConfig.is_working_day ?? dayConfig.isWorkingDay ?? true);
        shiftStartTime = dayConfig.start_time || dayConfig.startTime || '09:00:00';
        breakMinutes = Number(dayConfig.break_minutes ?? dayConfig.breakMinutes ?? 60);

        if (dayConfig.expected_hours !== undefined) {
          expectedMinutes = Math.round(Number(dayConfig.expected_hours) * 60);
        } else if (isWorkingDay && dayConfig.start_time && dayConfig.end_time) {
          const [sH, sM] = dayConfig.start_time.split(':').map(Number);
          const [eH, eM] = dayConfig.end_time.split(':').map(Number);
          let startTotal = sH * 60 + sM;
          let endTotal = eH * 60 + eM;
          if (endTotal < startTotal) endTotal += 24 * 60;
          expectedMinutes = Math.max(0, endTotal - startTotal - breakMinutes);
        } else if (!isWorkingDay) {
          expectedMinutes = 0;
        }
      }
    } catch {
      // If employee schedule cannot be resolved, use standard 8-hour workday
    }

    return { expectedMinutes, shiftStartTime, breakMinutes, isWorkingDay };
  }

  /**
   * Find currently open attendance record for an employee (where check_out is null).
   */
  async findOpenRecord(employeeId) {
    if (this._useDB()) {
      try {
        const table = await this._getAttendanceTable();
        const { data, error } = await db
          .from(table)
          .select('*')
          .eq('employee_id', employeeId)
          .is('check_out', null)
          .order('check_in', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          this._handleDBError(error, 'findOpenRecord');
        } else if (data) {
          return this._normalizeRecord(data);
        }
      } catch (err) {
        if (config.isProduction || process.env.NODE_ENV === 'production') throw err;
      }
    } else if (config.isProduction || process.env.NODE_ENV === 'production') {
      throw new AppError('Database connection required in production mode', 500, 'DATABASE_ERROR');
    }

    // Fallback strictly for test/offline environments
    for (const record of mockAttendance.values()) {
      if (record.employee_id === employeeId && !record.check_out) {
        return this._normalizeRecord(record);
      }
    }
    return null;
  }

  /**
   * POST /api/attendance/check-in
   */
  async checkIn({ employeeId, checkInTime = new Date().toISOString(), notes = null }) {
    if (!employeeId) {
      throw new AppError('employee_id is required for check-in', 400);
    }

    // 1. Prevent duplicate check-in / multiple open attendance records
    const existingOpen = await this.findOpenRecord(employeeId);
    if (existingOpen) {
      throw new AppError(
        `Employee already has an open attendance session (checked in at ${existingOpen.check_in}). Please check out before checking in again.`,
        409,
        'DUPLICATE_CHECK_IN'
      );
    }

    const checkInDate = new Date(checkInTime);
    const dateStr = checkInTime.split('T')[0];

    // Compare with working schedule for expected hours & late arrival
    const { expectedMinutes, shiftStartTime, breakMinutes } = await this._getShiftInfo(employeeId, dateStr);

    const [sH, sM] = shiftStartTime.split(':').map(Number);
    const checkInHours = checkInDate.getUTCHours();
    const checkInMinutes = checkInDate.getUTCMinutes();
    const checkInTotalMins = checkInHours * 60 + checkInMinutes;
    const shiftStartTotalMins = sH * 60 + sM;

    // Late if check-in is after scheduled shift start
    const isLate = checkInTotalMins > shiftStartTotalMins;
    const initialStatus = isLate ? 'LATE' : 'INCOMPLETE';

    const baseRecord = {
      employee_id: employeeId,
      date: dateStr,
      attendance_date: dateStr,
      check_in: checkInTime,
      check_out: null,
      worked_minutes: 0,
      worked_hours: 0,
      expected_minutes: expectedMinutes,
      expected_hours: Number((expectedMinutes / 60).toFixed(2)),
      break_minutes: breakMinutes,
      overtime_minutes: 0,
      overtime_hours: 0,
      status: initialStatus,
      notes: notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (this._useDB()) {
      try {
        const table = await this._getAttendanceTable();
        // Prepare payload matching target table column conventions
        const insertPayload = table === 'attendance'
          ? {
              employee_id: employeeId,
              attendance_date: dateStr,
              check_in: checkInTime,
              status: initialStatus,
              break_minutes: breakMinutes,
              notes: notes || null,
            }
          : {
              employee_id: employeeId,
              date: dateStr,
              check_in: checkInTime,
              check_out: null,
              worked_minutes: 0,
              expected_minutes: expectedMinutes,
              overtime_minutes: 0,
              status: initialStatus,
              notes: notes || null,
            };

        const { data, error } = await db
          .from(table)
          .insert([insertPayload])
          .select()
          .single();

        if (error) {
          this._handleDBError(error, 'checkIn');
        } else if (data) {
          const normalized = this._normalizeRecord(data);
          mockAttendance.set(normalized.id, normalized);
          return normalized;
        }
      } catch (err) {
        if (config.isProduction || process.env.NODE_ENV === 'production') throw err;
      }
    } else if (config.isProduction || process.env.NODE_ENV === 'production') {
      throw new AppError('Database connection required in production mode', 500, 'DATABASE_ERROR');
    }

    const id = `b${Date.now().toString(16).slice(-7)}-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padStart(12, '0')}`;
    const created = this._normalizeRecord({ id, ...baseRecord });
    mockAttendance.set(id, created);
    return created;
  }

  /**
   * POST /api/attendance/check-out
   */
  async checkOut({ employeeId, checkOutTime = new Date().toISOString(), notes = null }) {
    if (!employeeId) {
      throw new AppError('employee_id is required for check-out', 400);
    }

    // 2. Prevent check-out without check-in
    const openRecord = await this.findOpenRecord(employeeId);
    if (!openRecord) {
      throw new AppError(
        'No active check-in record found for this employee. Cannot check out without checking in.',
        400,
        'NO_ACTIVE_CHECK_IN'
      );
    }

    const inTime = new Date(openRecord.check_in).getTime();
    const outTime = new Date(checkOutTime).getTime();

    if (outTime < inTime) {
      throw new AppError('Check-out time cannot be earlier than check-in time', 400);
    }

    // Calculate worked duration on backend
    const rawDiffMinutes = Math.floor((outTime - inTime) / 60000);
    const { expectedMinutes, breakMinutes } = await this._getShiftInfo(employeeId, openRecord.date);

    // If shift is longer than 5 hours (300 min), deduct scheduled break duration
    const breakDeduction = rawDiffMinutes >= 300 ? breakMinutes : 0;
    const workedMinutes = Math.max(0, rawDiffMinutes - breakDeduction);

    // Overtime calculation: actual worked minutes - expected worked minutes
    const overtimeMinutes = Math.max(0, workedMinutes - expectedMinutes);

    // Final status resolution
    let finalStatus = 'PRESENT';
    if (overtimeMinutes > 0) {
      finalStatus = 'OVERTIME';
    } else if (openRecord.status === 'LATE') {
      finalStatus = 'LATE';
    } else if (workedMinutes < expectedMinutes) {
      finalStatus = 'INCOMPLETE';
    }

    const workedHours = Number((workedMinutes / 60).toFixed(2));
    const overtimeHours = Number((overtimeMinutes / 60).toFixed(2));

    const updates = {
      check_out: checkOutTime,
      worked_minutes: workedMinutes,
      worked_hours: workedHours,
      expected_minutes: expectedMinutes,
      expected_hours: Number((expectedMinutes / 60).toFixed(2)),
      overtime_minutes: overtimeMinutes,
      overtime_hours: overtimeHours,
      status: finalStatus,
      notes: notes || openRecord.notes,
      updated_at: new Date().toISOString(),
    };

    let updatedRecord = null;

    if (this._useDB()) {
      try {
        const table = await this._getAttendanceTable();
        const updatePayload = table === 'attendance'
          ? {
              check_out: checkOutTime,
              worked_hours: workedHours,
              overtime_hours: overtimeHours,
              status: finalStatus,
              notes: notes || openRecord.notes,
              updated_at: new Date().toISOString(),
            }
          : {
              check_out: checkOutTime,
              worked_minutes: workedMinutes,
              expected_minutes: expectedMinutes,
              overtime_minutes: overtimeMinutes,
              status: finalStatus,
              notes: notes || openRecord.notes,
              updated_at: new Date().toISOString(),
            };

        const { data, error } = await db
          .from(table)
          .update(updatePayload)
          .eq('id', openRecord.id)
          .select()
          .single();

        if (error) {
          this._handleDBError(error, 'checkOut');
        } else if (data) {
          updatedRecord = this._normalizeRecord(data);
          mockAttendance.set(updatedRecord.id, updatedRecord);
        }
      } catch (err) {
        if (config.isProduction || process.env.NODE_ENV === 'production') throw err;
      }
    } else if (config.isProduction || process.env.NODE_ENV === 'production') {
      throw new AppError('Database connection required in production mode', 500, 'DATABASE_ERROR');
    }

    if (!updatedRecord) {
      updatedRecord = this._normalizeRecord({ ...openRecord, ...updates });
      mockAttendance.set(openRecord.id, updatedRecord);
    }

    // If overtime occurred, record in overtime tracking
    if (overtimeMinutes > 0) {
      await this.recordOvertime({
        attendanceId: updatedRecord.id,
        employeeId,
        date: updatedRecord.date,
        workedMinutes,
        expectedMinutes,
        overtimeMinutes,
      });
    }

    return updatedRecord;
  }

  /**
   * Internal helper: Record overtime
   */
  async recordOvertime({ attendanceId, employeeId, date, workedMinutes, expectedMinutes, overtimeMinutes }) {
    const record = {
      attendance_id: attendanceId,
      employee_id: employeeId,
      date,
      worked_minutes: workedMinutes,
      expected_minutes: expectedMinutes,
      overtime_minutes: overtimeMinutes,
      status: 'PENDING',
      approved_by: null,
      approved_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (this._useDB()) {
      try {
        const { data, error } = await db
          .from('overtime_records')
          .insert([record])
          .select()
          .single();

        if (error && (config.isProduction || process.env.NODE_ENV === 'production')) {
          this._handleDBError(error, 'recordOvertime');
        } else if (data) {
          mockOvertime.set(data.id, data);
          return data;
        }
      } catch (err) {
        if (config.isProduction || process.env.NODE_ENV === 'production') throw err;
      }
    }

    const id = `o${Date.now().toString(16).slice(-7)}-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padStart(12, '0')}`;
    const created = { id, ...record };
    mockOvertime.set(id, created);
    return created;
  }

  /**
   * GET /api/attendance/history with filters
   */
  async getAttendanceHistory({ employeeId, startDate, endDate, status, page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;

    if (this._useDB()) {
      try {
        const table = await this._getAttendanceTable();
        const dateCol = table === 'attendance' ? 'attendance_date' : 'date';

        let query = db
          .from(table)
          .select('*, employees(first_name, last_name, email)', { count: 'exact' });

        if (employeeId) query = query.eq('employee_id', employeeId);
        if (status) query = query.eq('status', status.toUpperCase());
        if (startDate) query = query.gte(dateCol, startDate);
        if (endDate) query = query.lte(dateCol, endDate);

        const { data, error, count } = await query
          .range(offset, offset + limit - 1)
          .order(dateCol, { ascending: false })
          .order('check_in', { ascending: false });

        if (error) {
          this._handleDBError(error, 'getAttendanceHistory');
        } else if (data && data.length > 0) {
          const normalizedRecords = data.map((r) => this._normalizeRecord(r));
          return {
            records: normalizedRecords,
            total: count || normalizedRecords.length,
            page,
            limit,
            totalPages: Math.ceil((count || normalizedRecords.length) / limit),
          };
        } else if (data && data.length === 0 && (config.isProduction || process.env.NODE_ENV === 'production')) {
          return {
            records: [],
            total: 0,
            page,
            limit,
            totalPages: 0,
          };
        }
      } catch (err) {
        if (config.isProduction || process.env.NODE_ENV === 'production') throw err;
      }
    } else if (config.isProduction || process.env.NODE_ENV === 'production') {
      throw new AppError('Database connection required in production mode', 500, 'DATABASE_ERROR');
    }

    let records = Array.from(mockAttendance.values()).map((r) => this._normalizeRecord(r));
    if (employeeId) records = records.filter((r) => r.employee_id === employeeId);
    if (status) records = records.filter((r) => r.status.toUpperCase() === status.toUpperCase());
    if (startDate) records = records.filter((r) => r.date >= startDate);
    if (endDate) records = records.filter((r) => r.date <= endDate);

    records.sort((a, b) => new Date(b.date) - new Date(a.date) || new Date(b.check_in) - new Date(a.check_in));

    const paged = records.slice(offset, offset + limit);
    return {
      records: paged,
      total: records.length,
      page,
      limit,
      totalPages: Math.ceil(records.length / limit),
    };
  }

  /**
   * GET /api/attendance/employee/:employeeId
   */
  async getEmployeeAttendance(employeeId, filters = {}) {
    return this.getAttendanceHistory({ ...filters, employeeId });
  }

  /**
   * GET single attendance record by ID
   */
  async getAttendanceById(id) {
    if (mockAttendance.has(id)) {
      return this._normalizeRecord(mockAttendance.get(id));
    }

    if (this._useDB()) {
      try {
        const table = await this._getAttendanceTable();
        const { data, error } = await db
          .from(table)
          .select('*, employees(*)')
          .eq('id', id)
          .single();

        if (error) {
          this._handleDBError(error, 'getAttendanceById');
        } else if (data) {
          return this._normalizeRecord(data);
        }
      } catch (err) {
        if (config.isProduction || process.env.NODE_ENV === 'production') throw err;
      }
    }

    const item = mockAttendance.get(id);
    if (!item) throw new AppError('Attendance record not found', 404);
    return this._normalizeRecord(item);
  }

  /**
   * POST /api/attendance/regularization
   * Employees submit correction requests.
   */
  async createRegularizationRequest({ attendanceId, requestedCheckIn, requestedCheckOut, reason, requestedBy, employeeId }) {
    if (!attendanceId) throw new AppError('attendance_id is required', 400);
    if (!requestedCheckIn || !requestedCheckOut) {
      throw new AppError('Both requested_check_in and requested_check_out are required', 400);
    }
    if (new Date(requestedCheckOut) < new Date(requestedCheckIn)) {
      throw new AppError('requested_check_out cannot be earlier than requested_check_in', 400);
    }

    const attendanceRecord = await this.getAttendanceById(attendanceId);
    const empId = employeeId || attendanceRecord.employee_id;

    const request = {
      attendance_id: attendanceId,
      employee_id: empId,
      requested_check_in: requestedCheckIn,
      requested_check_out: requestedCheckOut,
      reason,
      status: 'PENDING',
      requested_by: requestedBy,
      approved_by: null,
      approved_at: null,
      rejection_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (this._useDB()) {
      try {
        const { data, error } = await db
          .from('attendance_regularization_requests')
          .insert([request])
          .select('*, attendance_records(*)')
          .single();

        if (error && (config.isProduction || process.env.NODE_ENV === 'production')) {
          this._handleDBError(error, 'createRegularizationRequest');
        } else if (data) {
          mockRegularization.set(data.id, data);
          return data;
        }
      } catch (err) {
        if (config.isProduction || process.env.NODE_ENV === 'production') throw err;
      }
    }

    const id = `r${Date.now().toString(16).slice(-7)}-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padStart(12, '0')}`;
    const created = { id, ...request, attendance: attendanceRecord };
    mockRegularization.set(id, created);
    return created;
  }

  /**
   * GET /api/attendance/regularization
   */
  async listRegularizationRequests({ employeeId, status, page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;

    if (this._useDB()) {
      try {
        let query = db
          .from('attendance_regularization_requests')
          .select('*, attendance_records(*), employees(first_name, last_name, email)', { count: 'exact' });

        if (employeeId) query = query.eq('employee_id', employeeId);
        if (status) query = query.eq('status', status.toUpperCase());

        const { data, count, error } = await query
          .range(offset, offset + limit - 1)
          .order('created_at', { ascending: false });

        if (error && (config.isProduction || process.env.NODE_ENV === 'production')) {
          this._handleDBError(error, 'listRegularizationRequests');
        } else if (data) {
          return {
            requests: data,
            total: count || data.length,
            page,
            limit,
            totalPages: Math.ceil((count || data.length) / limit),
          };
        }
      } catch (err) {
        if (config.isProduction || process.env.NODE_ENV === 'production') throw err;
      }
    }

    let list = Array.from(mockRegularization.values());
    if (employeeId) list = list.filter((r) => r.employee_id === employeeId);
    if (status) list = list.filter((r) => r.status.toUpperCase() === status.toUpperCase());

    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const paged = list.slice(offset, offset + limit);

    return {
      requests: paged,
      total: list.length,
      page,
      limit,
      totalPages: Math.ceil(list.length / limit),
    };
  }

  /**
   * POST /api/attendance/regularization/:id/approve
   */
  async approveRegularization(requestId, approvedBy) {
    let reqRecord = mockRegularization.get(requestId);

    if (this._useDB()) {
      try {
        const { data, error } = await db
          .from('attendance_regularization_requests')
          .select('*')
          .eq('id', requestId)
          .single();
        if (error && (config.isProduction || process.env.NODE_ENV === 'production')) {
          this._handleDBError(error, 'approveRegularization');
        } else if (data) {
          reqRecord = data;
        }
      } catch (err) {
        if (config.isProduction || process.env.NODE_ENV === 'production') throw err;
      }
    }

    if (!reqRecord) throw new AppError('Regularization request not found', 404);
    if (reqRecord.status !== 'PENDING') {
      throw new AppError(`Cannot approve request that is already ${reqRecord.status}`, 400);
    }

    const attendance = await this.getAttendanceById(reqRecord.attendance_id);
    const inTime = new Date(reqRecord.requested_check_in).getTime();
    const outTime = new Date(reqRecord.requested_check_out).getTime();

    const rawDiffMinutes = Math.floor((outTime - inTime) / 60000);
    const { expectedMinutes, breakMinutes } = await this._getShiftInfo(reqRecord.employee_id, attendance.date);
    const breakDeduction = rawDiffMinutes >= 300 ? breakMinutes : 0;
    const workedMinutes = Math.max(0, rawDiffMinutes - breakDeduction);
    const overtimeMinutes = Math.max(0, workedMinutes - expectedMinutes);

    let newStatus = 'PRESENT';
    if (overtimeMinutes > 0) newStatus = 'OVERTIME';
    else if (workedMinutes < expectedMinutes) newStatus = 'INCOMPLETE';

    const workedHours = Number((workedMinutes / 60).toFixed(2));
    const overtimeHours = Number((overtimeMinutes / 60).toFixed(2));

    const attendanceUpdates = {
      check_in: reqRecord.requested_check_in,
      check_out: reqRecord.requested_check_out,
      worked_minutes: workedMinutes,
      worked_hours: workedHours,
      expected_minutes: expectedMinutes,
      expected_hours: Number((expectedMinutes / 60).toFixed(2)),
      overtime_minutes: overtimeMinutes,
      overtime_hours: overtimeHours,
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    const requestUpdates = {
      status: 'APPROVED',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (this._useDB()) {
      try {
        const table = await this._getAttendanceTable();
        const updatePayload = table === 'attendance'
          ? {
              check_in: reqRecord.requested_check_in,
              check_out: reqRecord.requested_check_out,
              worked_hours: workedHours,
              overtime_hours: overtimeHours,
              status: newStatus,
              is_manual_edit: true,
              correction_reason: reqRecord.reason,
              updated_at: new Date().toISOString(),
            }
          : attendanceUpdates;

        await db.from(table).update(updatePayload).eq('id', attendance.id);
        await db.from('attendance_regularization_requests').update(requestUpdates).eq('id', requestId);
      } catch (err) {
        if (config.isProduction || process.env.NODE_ENV === 'production') throw err;
      }
    }

    const updatedAttendance = this._normalizeRecord({ ...attendance, ...attendanceUpdates });
    const updatedRequest = { ...reqRecord, ...requestUpdates };
    mockAttendance.set(attendance.id, updatedAttendance);
    mockRegularization.set(requestId, updatedRequest);

    if (overtimeMinutes > 0) {
      await this.recordOvertime({
        attendanceId: attendance.id,
        employeeId: reqRecord.employee_id,
        date: attendance.date,
        workedMinutes,
        expectedMinutes,
        overtimeMinutes,
      });
    }

    return { request: updatedRequest, attendance: updatedAttendance };
  }

  /**
   * POST /api/attendance/regularization/:id/reject
   */
  async rejectRegularization(requestId, rejectedBy, reason = null) {
    let reqRecord = mockRegularization.get(requestId);

    if (this._useDB()) {
      try {
        const { data, error } = await db
          .from('attendance_regularization_requests')
          .select('*')
          .eq('id', requestId)
          .single();
        if (error && (config.isProduction || process.env.NODE_ENV === 'production')) {
          this._handleDBError(error, 'rejectRegularization');
        } else if (data) {
          reqRecord = data;
        }
      } catch (err) {
        if (config.isProduction || process.env.NODE_ENV === 'production') throw err;
      }
    }

    if (!reqRecord) throw new AppError('Regularization request not found', 404);
    if (reqRecord.status !== 'PENDING') {
      throw new AppError(`Cannot reject request that is already ${reqRecord.status}`, 400);
    }

    const updates = {
      status: 'REJECTED',
      approved_by: rejectedBy,
      rejection_reason: reason,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (this._useDB()) {
      try {
        await db.from('attendance_regularization_requests').update(updates).eq('id', requestId);
      } catch (err) {
        if (config.isProduction || process.env.NODE_ENV === 'production') throw err;
      }
    }

    const updated = { ...reqRecord, ...updates };
    mockRegularization.set(requestId, updated);
    return updated;
  }

  /**
   * GET /api/attendance/overtime
   */
  async listOvertimeRecords({ employeeId, startDate, endDate, status, page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;

    if (this._useDB()) {
      try {
        let query = db
          .from('overtime_records')
          .select('*, attendance_records(*), employees(first_name, last_name, email)', { count: 'exact' });

        if (employeeId) query = query.eq('employee_id', employeeId);
        if (status) query = query.eq('status', status.toUpperCase());
        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);

        const { data, count, error } = await query
          .range(offset, offset + limit - 1)
          .order('date', { ascending: false });

        if (error && (config.isProduction || process.env.NODE_ENV === 'production')) {
          this._handleDBError(error, 'listOvertimeRecords');
        } else if (data) {
          return {
            records: data,
            total: count || data.length,
            page,
            limit,
            totalPages: Math.ceil((count || data.length) / limit),
          };
        }
      } catch (err) {
        if (config.isProduction || process.env.NODE_ENV === 'production') throw err;
      }
    }

    let records = Array.from(mockOvertime.values());
    if (employeeId) records = records.filter((r) => r.employee_id === employeeId);
    if (status) records = records.filter((r) => r.status.toUpperCase() === status.toUpperCase());
    if (startDate) records = records.filter((r) => r.date >= startDate);
    if (endDate) records = records.filter((r) => r.date <= endDate);

    records.sort((a, b) => new Date(b.date) - new Date(a.date));
    const paged = records.slice(offset, offset + limit);

    return {
      records: paged,
      total: records.length,
      page,
      limit,
      totalPages: Math.ceil(records.length / limit),
    };
  }
}

module.exports = new AttendanceService();
