/**
 * Dashboard Controller
 * ────────────────────
 * Aggregated, role-aware statistics for the landing dashboard.
 * Admin/HR see organization-wide metrics; employees see their own snapshot.
 */

const { supabaseAdmin, supabase } = require('../config/supabase');
const { ROLES, PERMISSIONS } = require('../config/rbacConstants');
const { successResponse } = require('../utils/apiResponse');

const db = supabaseAdmin || supabase;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

async function getOrgStats() {
  const today = todayISO();

  const [
    { count: totalEmployees },
    { count: presentToday },
    { count: onLeaveToday },
    { count: pendingLeaveRequests },
    { data: latestPayrun },
  ] = await Promise.all([
    db.from('employees').select('*', { count: 'exact', head: true }).eq('employment_status', 'ACTIVE'),
    db.from('attendance').select('*', { count: 'exact', head: true }).eq('attendance_date', today)
      .in('status', ['PRESENT', 'LATE', 'OVERTIME', 'CORRECTED', 'HALF_DAY']),
    db.from('time_off_requests').select('*', { count: 'exact', head: true }).eq('status', 'APPROVED')
      .lte('start_date', today).gte('end_date', today),
    db.from('time_off_requests').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
    db.from('payruns').select('id, name, status, period_start, period_end, total_gross, total_deductions, total_net')
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  return {
    scope: 'organization',
    totalEmployees: totalEmployees ?? 0,
    presentToday: presentToday ?? 0,
    onLeaveToday: onLeaveToday ?? 0,
    pendingLeaveRequests: pendingLeaveRequests ?? 0,
    latestPayrun: latestPayrun ?? null,
  };
}

async function getEmployeeStats(employeeId) {
  const today = todayISO();

  const [
    { data: todayAttendance },
    { data: allocations },
    { data: latestPayslip },
  ] = await Promise.all([
    db.from('attendance').select('status, check_in, check_out, worked_hours')
      .eq('employee_id', employeeId).eq('attendance_date', today).maybeSingle(),
    db.from('time_off_allocations').select('time_off_type_id, allocated_amount, approved_amount, taken_amount, remaining_amount, time_off_types(name, code)')
      .eq('employee_id', employeeId).eq('status', 'APPROVED'),
    db.from('payslips').select('id, period_start, period_end, gross_amount, deduction_amount, net_amount, status')
      .eq('employee_id', employeeId).in('status', ['VALIDATED', 'PAID'])
      .order('period_end', { ascending: false }).limit(1).maybeSingle(),
  ]);

  return {
    scope: 'employee',
    todayAttendance: todayAttendance ?? null,
    leaveBalances: allocations ?? [],
    latestPayslip: latestPayslip ?? null,
  };
}

exports.getStats = async (req, res, next) => {
  try {
    const userRoles = req.user.roles || [];
    const isOrgViewer = userRoles.includes(ROLES.ADMIN) ||
      userRoles.includes(ROLES.HR_MANAGER) ||
      userRoles.includes(ROLES.HR_PAYROLL_MANAGER) ||
      userRoles.includes(ROLES.HR_PAYROLL_USER) ||
      (req.user.permissions || []).includes(PERMISSIONS.EMPLOYEE_READ);

    if (isOrgViewer) {
      const data = await getOrgStats();
      return successResponse(res, data);
    }

    if (!req.user.employee) {
      return successResponse(res, { scope: 'employee', todayAttendance: null, leaveBalances: [], latestPayslip: null });
    }

    const data = await getEmployeeStats(req.user.employee.id);
    return successResponse(res, data);
  } catch (error) {
    next(error);
  }
};
