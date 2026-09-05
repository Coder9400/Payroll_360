/**
 * Working Schedule Service — Phase 4
 *
 * Requirements:
 * - working_schedules
 * - schedule_days (Monday - Sunday)
 * - employee_schedule_assignments
 * - Automatically calculate weekly expected working hours:
 *     daily_hours = ((end_time - start_time) - break_minutes) / 60
 *     weekly_hours = sum of all daily_hours for working days
 * - Assign schedule to employee
 */

const { supabaseAdmin, supabase, isConfigured } = require('../config/supabase');
const AppError = require('../utils/appError');
const config = require('../config/env');

const db = supabaseAdmin || supabase;

// In-memory mock stores for testing / non-DB environments
const mockSchedules = new Map();
const mockScheduleDays = new Map();
const mockAssignments = new Map();

/**
 * Calculates daily and weekly working hours automatically.
 * Supports start time, end time, break duration, midnight wrap-arounds.
 */
function calculateHours(days) {
  let totalWeeklyMinutes = 0;
  const processedDays = (days || []).map((d) => {
    let dailyMinutes = 0;
    const isWorking = Boolean(d.is_working_day ?? d.isWorkingDay ?? true);

    if (isWorking && (d.start_time || d.startTime) && (d.end_time || d.endTime)) {
      const startTime = d.start_time || d.startTime;
      const endTime = d.end_time || d.endTime;
      const breakMins = Number(d.break_minutes ?? d.breakDurationMins ?? d.breakMinutes ?? 60);

      const [sH, sM] = startTime.split(':').map(Number);
      const [eH, eM] = endTime.split(':').map(Number);

      let startTotal = sH * 60 + sM;
      let endTotal = eH * 60 + eM;
      if (endTotal < startTotal) endTotal += 24 * 60; // overnight shift

      const workedMins = endTotal - startTotal - breakMins;
      dailyMinutes = Math.max(0, workedMins);
    }

    const expectedHours = Number((dailyMinutes / 60).toFixed(2));
    totalWeeklyMinutes += dailyMinutes;

    return {
      day_of_week: d.day_of_week ?? d.dayOfWeek,
      is_working_day: isWorking,
      start_time: isWorking ? (d.start_time || d.startTime) : '00:00:00',
      end_time: isWorking ? (d.end_time || d.endTime) : '00:00:00',
      break_minutes: isWorking ? Number(d.break_minutes ?? d.breakDurationMins ?? 60) : 0,
      expected_hours: expectedHours,
    };
  });

  const weeklyExpectedHours = Number((totalWeeklyMinutes / 60).toFixed(2));
  return { processedDays, weeklyExpectedHours };
}

class ScheduleService {
  _useDB() {
    return isConfigured && db;
  }

  /**
   * List all working schedules
   */
  async listSchedules() {
    if (this._useDB()) {
      try {
        const { data, error } = await db
          .from('working_schedules')
          .select('*, working_schedule_days(*)')
          .order('name');

        if (error) {
          if (config.isProduction) throw new AppError(error.message, 500);
        } else if (data && data.length > 0) {
          return data;
        }
      } catch (err) {
        if (config.isProduction) throw err;
      }
    }

    return Array.from(mockSchedules.values());
  }

  /**
   * Get working schedule by ID
   */
  async getScheduleById(id) {
    if (mockSchedules.has(id)) {
      return mockSchedules.get(id);
    }

    if (this._useDB()) {
      try {
        const { data, error } = await db
          .from('working_schedules')
          .select('*, working_schedule_days(*)')
          .eq('id', id)
          .single();

        if (error) {
          if (config.isProduction) {
            if (error.code === 'PGRST116') throw new AppError('Working Schedule not found', 404);
            throw new AppError(error.message, 500);
          }
        } else if (data) {
          return data;
        }
      } catch (err) {
        if (config.isProduction) throw err;
      }
    }

    const sched = mockSchedules.get(id);
    if (!sched) throw new AppError('Working Schedule not found', 404);
    return sched;
  }

  /**
   * Create working schedule with automatic weekly hours calculation
   */
  async createSchedule(payload) {
    const { name, code, description, days } = payload;
    if (!name || !code) {
      throw new AppError('Both name and code are required for a working schedule', 400);
    }

    const { processedDays, weeklyExpectedHours } = calculateHours(days);

    const record = {
      name,
      code: code.toUpperCase().trim(),
      description: description || null,
      hours_week: weeklyExpectedHours,
      weekly_expected_hours: weeklyExpectedHours,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (this._useDB()) {
      try {
        const { data: schedule, error: schedErr } = await db
          .from('working_schedules')
          .insert([record])
          .select()
          .single();

        if (schedErr) {
          if (schedErr.code === '23505') throw new AppError('Schedule code already exists', 409);
          if (config.isProduction) throw new AppError(schedErr.message, 500);
        } else if (schedule) {
          if (processedDays.length > 0) {
            const daysToInsert = processedDays.map((d) => ({ ...d, schedule_id: schedule.id }));
            await db.from('working_schedule_days').insert(daysToInsert);
          }
          const result = { ...schedule, days: processedDays, working_schedule_days: processedDays };
          mockSchedules.set(schedule.id, result);
          return result;
        }
      } catch (err) {
        if (config.isProduction || err.statusCode === 409) throw err;
      }
    }

    const id = `f${Date.now().toString(16).slice(-7)}-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padStart(12, '0')}`;
    const result = { id, ...record, days: processedDays, working_schedule_days: processedDays };
    mockSchedules.set(id, result);
    return result;
  }

  /**
   * Update working schedule
   */
  async updateSchedule(id, updates) {
    const existing = await this.getScheduleById(id);

    let updatedDays = existing.days || existing.working_schedule_days || [];
    let weeklyExpectedHours = existing.hours_week || existing.weekly_expected_hours || 40.0;

    if (updates.days) {
      const calc = calculateHours(updates.days);
      updatedDays = calc.processedDays;
      weeklyExpectedHours = calc.weeklyExpectedHours;
    }

    const merged = {
      ...existing,
      ...updates,
      hours_week: weeklyExpectedHours,
      weekly_expected_hours: weeklyExpectedHours,
      days: updatedDays,
      working_schedule_days: updatedDays,
      updated_at: new Date().toISOString(),
    };

    if (this._useDB()) {
      try {
        const { data, error } = await db
          .from('working_schedules')
          .update({
            name: merged.name,
            hours_week: merged.hours_week,
            is_active: merged.is_active,
            updated_at: merged.updated_at,
          })
          .eq('id', id)
          .select()
          .single();

        if (error && config.isProduction) throw new AppError(error.message, 500);
        if (data) {
          mockSchedules.set(id, { ...data, days: updatedDays, working_schedule_days: updatedDays });
          return mockSchedules.get(id);
        }
      } catch (err) {
        if (config.isProduction) throw err;
      }
    }

    mockSchedules.set(id, merged);
    return merged;
  }

  /**
   * Assign a working schedule to an employee
   */
  async assignSchedule({ employeeId, employee_id, scheduleId, schedule_id, startDate, start_date, endDate, end_date }) {
    const empId = employeeId || employee_id;
    const schedId = scheduleId || schedule_id;
    const sDate = startDate || start_date;
    const eDate = endDate !== undefined ? endDate : (end_date !== undefined ? end_date : null);

    if (!empId) throw new AppError('employeeId is required', 400);
    if (!schedId) throw new AppError('scheduleId is required', 400);
    if (!sDate) throw new AppError('startDate is required', 400);
    if (eDate && new Date(eDate) < new Date(sDate)) {
      throw new AppError('endDate cannot be earlier than startDate', 400);
    }

    const assignment = {
      employee_id: empId,
      schedule_id: schedId,
      start_date: sDate,
      end_date: eDate,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (this._useDB()) {
      try {
        // Also update employees.working_schedule_id for compatibility
        await db.from('employees').update({ working_schedule_id: schedId }).eq('id', empId);

        const { data, error } = await db
          .from('employee_schedule_assignments')
          .insert([assignment])
          .select('*, working_schedules(*)')
          .single();

        if (error) {
          if (config.isProduction) throw new AppError(error.message, 500);
        } else if (data) {
          mockAssignments.set(data.id, data);
          return data;
        }
      } catch (err) {
        if (config.isProduction) throw err;
      }
    }

    const id = `a${Date.now().toString(16).slice(-7)}-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padStart(12, '0')}`;
    const created = { id, ...assignment };
    mockAssignments.set(id, created);
    return created;
  }

  /**
   * Get active schedule for employee on a given date
   */
  async getEmployeeSchedule(employeeId, date = new Date().toISOString().split('T')[0]) {
    if (!employeeId) throw new AppError('employeeId is required', 400);

    const targetDate = new Date(date);

    if (this._useDB()) {
      try {
        const { data, error } = await db
          .from('employee_schedule_assignments')
          .select('*, working_schedules(*, working_schedule_days(*))')
          .eq('employee_id', employeeId)
          .eq('is_active', true)
          .lte('start_date', date)
          .or(`end_date.gte.${date},end_date.is.null`)
          .order('start_date', { ascending: false })
          .limit(1)
          .single();

        if (data) return data;
      } catch (err) {
        // Fallback
      }
    }

    // Check mock assignments
    const assignments = Array.from(mockAssignments.values()).filter((a) => {
      if (a.employee_id !== employeeId || !a.is_active) return false;
      const s = new Date(a.start_date);
      const e = a.end_date ? new Date(a.end_date) : null;
      return targetDate >= s && (!e || targetDate <= e);
    });

    if (assignments.length > 0) {
      const match = assignments[0];
      const sched = mockSchedules.get(match.schedule_id);
      return { ...match, working_schedules: sched, schedule: sched };
    }

    throw new AppError(`No active working schedule assignment found for employee ${employeeId}`, 404);
  }

  _seedMock(schedulesArray) {
    mockSchedules.clear();
    for (const s of schedulesArray) {
      mockSchedules.set(s.id, s);
    }
  }
}

module.exports = new ScheduleService();
