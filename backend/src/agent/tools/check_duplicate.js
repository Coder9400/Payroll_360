'use strict';

const { supabaseAdmin, supabase } = require('../../config/supabase');
const db = supabaseAdmin || supabase;

/**
 * Tool: check_duplicate
 * Guards against creating a payslip that already exists for the given
 * employee + period. Must be the first tool called in the agent loop.
 */
async function checkDuplicate({ tenantId, employeeId, periodStart, periodEnd }) {
  const { data, error } = await db
    .from('payslips')
    .select('id, payrun_id, status')
    .eq('tenant_id', tenantId)
    .eq('employee_id', employeeId)
    .eq('period_start', periodStart)
    .eq('period_end', periodEnd)
    .maybeSingle();

  if (error) throw new Error(`check_duplicate failed: ${error.message}`);

  if (data) {
    return {
      isDuplicate: true,
      existingPayslipId: data.id,
      existingPayrunId: data.payrun_id,
      existingStatus: data.status,
      message: `A payslip already exists for this employee and period (status: ${data.status}). Cannot create a duplicate.`,
    };
  }

  return {
    isDuplicate: false,
    existingPayslipId: null,
    existingPayrunId: null,
    message: 'No duplicate found. Safe to proceed with payroll computation.',
  };
}

module.exports = checkDuplicate;
