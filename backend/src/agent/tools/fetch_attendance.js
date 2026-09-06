'use strict';

const { supabaseAdmin, supabase } = require('../../config/supabase');
const db = supabaseAdmin || supabase;

const PRESENT_STATUSES = ['PRESENT', 'LATE', 'OVERTIME', 'CORRECTED', 'HALF_DAY'];

/**
 * Tool: fetch_attendance
 * Fetches the employee's attendance records for the given period.
 */
async function fetchAttendance({ tenantId, employeeId, periodStart, periodEnd }) {
  const { data: records, error } = await db
    .from('attendance')
    .select('attendance_date, status, worked_hours, overtime_hours')
    .eq('tenant_id', tenantId)
    .eq('employee_id', employeeId)
    .gte('attendance_date', periodStart)
    .lte('attendance_date', periodEnd)
    .order('attendance_date');

  if (error) throw new Error(`fetch_attendance failed: ${error.message}`);

  const rows = records || [];
  const daysPresent = rows.filter(r => PRESENT_STATUSES.includes(r.status)).length;
  const daysAbsent = rows.filter(r => r.status === 'ABSENT').length;
  const daysOnLeave = rows.filter(r => r.status === 'ON_LEAVE').length;
  const totalHours = rows.reduce((sum, r) => sum + Number(r.worked_hours || 0), 0);
  const overtimeHours = rows.reduce((sum, r) => sum + Number(r.overtime_hours || 0), 0);
  const avgDailyHours = daysPresent > 0 ? Math.round((totalHours / daysPresent) * 10) / 10 : 0;

  const statusBreakdown = {};
  for (const r of rows) {
    statusBreakdown[r.status] = (statusBreakdown[r.status] || 0) + 1;
  }

  return {
    totalRecords: rows.length,
    daysPresent,
    daysAbsent,
    daysOnLeave,
    totalHoursWorked: Math.round(totalHours * 10) / 10,
    overtimeHours: Math.round(overtimeHours * 10) / 10,
    avgDailyHours,
    statusBreakdown,
    message: `Attendance loaded: ${daysPresent} days present, ${daysAbsent} absent, ${daysOnLeave} on leave out of ${rows.length} recorded days. Total hours: ${Math.round(totalHours)}.`,
  };
}

module.exports = fetchAttendance;
