'use strict';

const { supabaseAdmin, supabase } = require('../../config/supabase');
const db = supabaseAdmin || supabase;

/**
 * Tool: fetch_paid_leaves
 * Fetches approved (paid) time off requests for the employee in the period.
 */
async function fetchPaidLeaves({ tenantId, employeeId, periodStart, periodEnd }) {
  const { data: requests, error } = await db
    .from('time_off_requests')
    .select(`
      id, start_date, end_date, duration, unit, status,
      time_off_types(name, payroll_integration)
    `)
    .eq('tenant_id', tenantId)
    .eq('employee_id', employeeId)
    .in('status', ['APPROVED', 'validate', 'validate1'])
    .gte('start_date', periodStart)
    .lte('end_date', periodEnd);

  if (error) throw new Error(`fetch_paid_leaves failed: ${error.message}`);

  const rows = requests || [];
  let totalPaidDays = 0;
  let totalUnpaidDays = 0;
  const breakdown = [];

  for (const req of rows) {
    const days = req.unit === 'HOURS' ? 0 : Number(req.duration || 0);
    const isPaid = req.time_off_types?.payroll_integration === true;

    breakdown.push({
      leaveType: req.time_off_types?.name || 'Unknown',
      days,
      isPaid,
      startDate: req.start_date,
      endDate: req.end_date,
    });

    if (isPaid) {
      totalPaidDays += days;
    } else {
      totalUnpaidDays += days;
    }
  }

  return {
    totalApprovedRequests: rows.length,
    totalPaidLeaveDays: totalPaidDays,
    totalApprovedUnpaidLeaveDays: totalUnpaidDays,
    breakdown,
    message: rows.length === 0
      ? 'No approved leave requests found for this period.'
      : `${rows.length} approved leave request(s): ${totalPaidDays} paid days, ${totalUnpaidDays} approved unpaid days.`,
  };
}

module.exports = fetchPaidLeaves;
