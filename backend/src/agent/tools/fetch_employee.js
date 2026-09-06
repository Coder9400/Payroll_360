'use strict';

const { supabaseAdmin, supabase } = require('../../config/supabase');
const db = supabaseAdmin || supabase;

/**
 * Tool: fetch_employee
 * Fetches complete employee profile including active contract for the period.
 */
async function fetchEmployee({ tenantId, employeeId, periodStart, periodEnd }) {
  const { data: emp, error: empErr } = await db
    .from('employees')
    .select(`
      id, first_name, last_name, employee_code, employment_status, user_id,
      departments!employees_department_id_fkey(name),
      job_positions(name)
    `)
    .eq('tenant_id', tenantId)
    .eq('id', employeeId)
    .maybeSingle();

  if (empErr) throw new Error(`fetch_employee query failed: ${empErr.message}`);
  if (!emp) throw new Error(`Employee not found: ${employeeId}`);

  // Find active contract covering the period
  const { data: contracts, error: cErr } = await db
    .from('contracts')
    .select('id, wage, employment_type, start_date, end_date, status, salary_structure_id')
    .eq('tenant_id', tenantId)
    .eq('employee_id', employeeId)
    .eq('status', 'ACTIVE')
    .lte('start_date', periodEnd)
    .or(`end_date.gte.${periodStart},end_date.is.null`);

  if (cErr) throw new Error(`fetch_employee contracts failed: ${cErr.message}`);

  const activeContracts = contracts || [];

  return {
    employeeId: emp.id,
    name: `${emp.first_name} ${emp.last_name}`,
    code: emp.employee_code,
    employmentStatus: emp.employment_status,
    userId: emp.user_id,
    department: emp.departments?.name || 'N/A',
    jobTitle: emp.job_positions?.name || 'N/A',
    contractCount: activeContracts.length,
    contract: activeContracts.length === 1 ? activeContracts[0] : null,
    contractWage: activeContracts.length === 1 ? Number(activeContracts[0].wage) : 0,
    contractType: activeContracts.length === 1 ? activeContracts[0].employment_type : null,
    salaryStructureId: activeContracts.length === 1 ? activeContracts[0].salary_structure_id : null,
    message: activeContracts.length === 0
      ? 'WARNING: No active contract found for this period. Cannot compute payroll.'
      : activeContracts.length > 1
      ? 'WARNING: Multiple overlapping contracts found. Resolve before computing.'
      : `Employee found with contract wage of ${activeContracts[0].wage}.`,
  };
}

module.exports = fetchEmployee;
