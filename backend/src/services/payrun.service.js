/**
 * Payrun Service
 * ──────────────
 * Orchestrates the full payroll lifecycle:
 *   create → getEligibleEmployees → compute → validate → markAsPaid
 *
 * Key business rules enforced here:
 *   - Period-specific contract selection (errors on overlap)
 *   - Compute idempotency (upsert, not insert)
 *   - Payrun status machine
 *   - Payslip immutability after PAID
 *   - Attendance + approved time off consumed into payroll context
 *
 * Multi-tenancy: every exported function takes tenantId as its first
 * argument. computePayrun additionally intersects any client-supplied
 * employee_ids against the tenant-scoped employee set — a caller can never
 * pull another tenant's employees/wages into their own payrun, even by ID.
 */

'use strict';

const { supabaseAdmin, supabase } = require('../config/supabase');
const AppError = require('../utils/appError');
const { withTenant, withTenantId } = require('../utils/tenantScope');
const {
  PAYRUN_STATUS,
  PAYSLIP_STATUS,
  VALID_PAYRUN_TRANSITIONS,
  VALIDATION_SEVERITY,
  PAYROLL_ERRORS,
} = require('../config/payrollConstants');
const {
  buildPayrollContext,
  computePayslipFromRules,
  countWorkingDays,
  money,
} = require('./payrollEngine.service');

const db = supabaseAdmin || supabase;

// ─── Payrun CRUD ──────────────────────────────────────────────────────────────

exports.listPayruns = async (tenantId, { page = 1, limit = 20, status } = {}) => {
  const offset = (page - 1) * limit;

  let query = withTenant(
    db.from('payruns').select(`*, salary_structures(name, code), payslips(id)`, { count: 'exact' }),
    tenantId
  );

  if (status) query = query.eq('status', status);

  const { data, error, count } = await query
    .range(offset, offset + limit - 1)
    .order('period_start', { ascending: false });

  if (error) throw new AppError(error.message, 500);

  const payruns = (data || []).map(p => ({
    ...p,
    payslip_count: (p.payslips || []).length,
    payslips: undefined,
  }));

  return { payruns, total: count, page, limit };
};

exports.getPayrunById = async (tenantId, id) => {
  const { data, error } = await withTenant(
    db.from('payruns').select(`
      *,
      salary_structures(name, code),
      payslips(
        id, employee_id, status, worked_days, paid_days, gross_amount,
        deduction_amount, net_amount, contract_wage, warnings,
        employees(id, first_name, last_name, employee_code)
      )
    `).eq('id', id),
    tenantId
  ).single();

  if (error) {
    if (error.code === 'PGRST116') throw new AppError('Payrun not found', 404, PAYROLL_ERRORS.PAYRUN_NOT_FOUND);
    throw new AppError(error.message, 500);
  }

  return data;
};

exports.createPayrun = async (tenantId, body, createdByUserId) => {
  const { name, salary_structure_id, period_start, period_end } = body;

  // Verify salary structure exists, is active, and belongs to this tenant
  const { data: structure, error: sErr } = await withTenant(
    db.from('salary_structures').select('id, name, is_active').eq('id', salary_structure_id),
    tenantId
  ).single();

  if (sErr || !structure) {
    throw new AppError('Salary structure not found', 404, PAYROLL_ERRORS.STRUCTURE_NOT_FOUND);
  }
  if (!structure.is_active) {
    throw new AppError('Salary structure is inactive', 400, PAYROLL_ERRORS.STRUCTURE_INACTIVE);
  }

  const payrunName = name || `${structure.name} – ${period_start} to ${period_end}`;

  const payload = withTenantId({
    name: payrunName,
    salary_structure_id,
    period_start,
    period_end,
    status: PAYRUN_STATUS.DRAFT,
    created_by: createdByUserId,
  }, tenantId);

  const { data, error } = await db
    .from('payruns')
    .insert([payload])
    .select()
    .single();

  if (error) throw new AppError(error.message, 500);
  return data;
};

// ─── Eligible Employees ───────────────────────────────────────────────────────
/**
 * Return employees who have exactly one active contract covering the payroll period.
 * Flags employees with no contract or overlapping contracts.
 */
exports.getEligibleEmployees = async (tenantId, payrunId) => {
  // Load payrun
  const { data: payrun, error: prErr } = await withTenant(
    db.from('payruns').select('salary_structure_id, period_start, period_end').eq('id', payrunId),
    tenantId
  ).single();

  if (prErr) throw new AppError('Payrun not found', 404, PAYROLL_ERRORS.PAYRUN_NOT_FOUND);

  const { period_start, period_end } = payrun;

  // All active employees in this tenant
  const { data: employees, error: empErr } = await withTenant(
    db.from('employees').select(`
      id, first_name, last_name, employee_code, employment_status,
      departments!employees_department_id_fkey(name),
      job_positions(name)
    `).eq('employment_status', 'ACTIVE'),
    tenantId
  );

  if (empErr) throw new AppError(empErr.message, 500);

  // Load all potentially relevant contracts in one query. Not tenant-filtered
  // directly (contracts has no dedicated read path here) — safe because the
  // result is only ever consulted for employee ids already tenant-scoped
  // above; any other tenant's contract rows fetched here are never joined to
  // anything and never reach the response.
  const { data: contracts, error: cErr } = await db
    .from('contracts')
    .select('id, employee_id, start_date, end_date, wage, status, salary_structure_id')
    .eq('status', 'ACTIVE')
    .lte('start_date', period_end)
    .or(`end_date.gte.${period_start},end_date.is.null`);

  if (cErr) throw new AppError(cErr.message, 500);

  // Group contracts by employee
  const contractsByEmployee = {};
  for (const c of contracts || []) {
    if (!contractsByEmployee[c.employee_id]) {
      contractsByEmployee[c.employee_id] = [];
    }
    contractsByEmployee[c.employee_id].push(c);
  }

  // Enrich employees with eligibility info
  const result = (employees || []).map(emp => {
    const empContracts = contractsByEmployee[emp.id] || [];

    let status = 'ELIGIBLE';
    let issue  = null;

    if (empContracts.length === 0) {
      status = 'NO_CONTRACT';
      issue  = 'No active contract covers this payroll period';
    } else if (empContracts.length > 1) {
      status = 'CONTRACT_OVERLAP';
      issue  = `${empContracts.length} overlapping contracts found for this period`;
    }

    return {
      ...emp,
      contract:  empContracts[0] ?? null,
      eligibility: { status, issue },
    };
  });

  return result;
};

// ─── Compute Payrun ───────────────────────────────────────────────────────────
/**
 * Main computation function. For each selected employee:
 *   1. Select the applicable period contract (error if none or overlap)
 *   2. Load attendance for the period
 *   3. Load approved time off for the period
 *   4. Build payroll context
 *   5. Execute salary rules via engine
 *   6. UPSERT payslip + lines (idempotent)
 *   7. Update payrun totals
 *
 * @param {string}   tenantId
 * @param {string}   payrunId
 * @param {string[]} selectedEmployeeIds - IDs of employees to include (will be
 *   intersected against this tenant's employees — any foreign id is dropped).
 */
exports.computePayrun = async (tenantId, payrunId, selectedEmployeeIds) => {
  // 1. Load payrun
  const { data: payrun, error: prErr } = await withTenant(
    db.from('payruns').select('*, salary_structures(*)').eq('id', payrunId),
    tenantId
  ).single();

  if (prErr) throw new AppError('Payrun not found', 404, PAYROLL_ERRORS.PAYRUN_NOT_FOUND);

  // Block if already PAID
  if (payrun.status === PAYRUN_STATUS.PAID) {
    throw new AppError('Payrun is already paid and cannot be recomputed', 409, PAYROLL_ERRORS.PAYRUN_ALREADY_PAID);
  }

  if (!selectedEmployeeIds || selectedEmployeeIds.length === 0) {
    throw new AppError('No employees selected for computation', 400, PAYROLL_ERRORS.PAYRUN_NO_EMPLOYEES);
  }

  // Security: never trust client-supplied employee ids verbatim — intersect
  // against this tenant's actual employees so a foreign id can't be smuggled
  // into a payrun (which would otherwise expose that employee's wage/contract
  // data across tenants).
  const { data: tenantEmployees, error: teErr } = await withTenant(
    db.from('employees').select('id'),
    tenantId
  ).in('id', selectedEmployeeIds);
  if (teErr) throw new AppError(teErr.message, 500);
  const validEmployeeIds = (tenantEmployees || []).map(e => e.id);

  if (validEmployeeIds.length === 0) {
    throw new AppError('No valid employees selected for computation', 400, PAYROLL_ERRORS.PAYRUN_NO_EMPLOYEES);
  }

  // 2. Load salary rules for this structure (ordered by sequence)
  const { data: rules, error: rErr } = await db
    .from('salary_rules')
    .select('*')
    .eq('salary_structure_id', payrun.salary_structure_id)
    .eq('is_active', true)
    .order('sequence');

  if (rErr) throw new AppError(rErr.message, 500);

  if (!rules || rules.length === 0) {
    throw new AppError(
      'Salary structure has no active rules. Add salary rules before computing.',
      400,
      PAYROLL_ERRORS.STRUCTURE_NO_RULES
    );
  }

  // Mark payrun as COMPUTING
  await db.from('payruns').update({
    status: PAYRUN_STATUS.COMPUTING,
    updated_at: new Date().toISOString(),
  }).eq('id', payrunId);

  const { period_start, period_end, salary_structure_id } = payrun;
  const workingDays = countWorkingDays(period_start, period_end);

  const summaryTotals = {
    total_employees:  0,
    total_gross:      0,
    total_deductions: 0,
    total_net:        0,
  };

  // 3. Process each selected employee
  for (const employeeId of validEmployeeIds) {
    await _processEmployeePayslip({
      employeeId,
      payrun,
      rules,
      workingDays,
      period_start,
      period_end,
      salary_structure_id,
      summaryTotals,
    });
  }

  // 4. Update payrun status and totals
  await db.from('payruns').update({
    status:           PAYRUN_STATUS.COMPUTED,
    total_employees:  summaryTotals.total_employees,
    total_gross:      money(summaryTotals.total_gross),
    total_deductions: money(summaryTotals.total_deductions),
    total_net:        money(summaryTotals.total_net),
    computed_at:      new Date().toISOString(),
    updated_at:       new Date().toISOString(),
  }).eq('id', payrunId);

  return exports.getPayrunById(tenantId, payrunId);
};

/** Internal: process one employee's payslip within a payrun */
async function _processEmployeePayslip({
  employeeId, payrun, rules, workingDays,
  period_start, period_end, salary_structure_id, summaryTotals,
}) {
  const payslipWarnings = [];

  // ── Contract selection ──────────────────────────────────────────────────
  // Not tenant-filtered directly — safe because employeeId is already
  // guaranteed tenant-scoped (validEmployeeIds, computed above) before this
  // function is ever called.
  const { data: contracts, error: cErr } = await db
    .from('contracts')
    .select('id, wage, start_date, end_date, status')
    .eq('employee_id', employeeId)
    .eq('status', 'ACTIVE')
    .lte('start_date', period_end)
    .or(`end_date.gte.${period_start},end_date.is.null`);

  if (cErr) throw new AppError(cErr.message, 500);

  if (!contracts || contracts.length === 0) {
    payslipWarnings.push({
      severity: VALIDATION_SEVERITY.ERROR,
      code:     PAYROLL_ERRORS.CONTRACT_NOT_FOUND,
      message:  'No active contract found for this payroll period',
    });
    // Cannot compute without contract — skip
    return;
  }

  if (contracts.length > 1) {
    payslipWarnings.push({
      severity: VALIDATION_SEVERITY.ERROR,
      code:     PAYROLL_ERRORS.CONTRACT_OVERLAP,
      message:  'Multiple overlapping active contracts found. Resolve before computing.',
    });
    return;
  }

  const contract = contracts[0];

  // ── Attendance data for period ──────────────────────────────────────────
  const { data: attendanceRows } = await db
    .from('attendance')
    .select('status, worked_hours, overtime_hours, attendance_date')
    .eq('employee_id', employeeId)
    .gte('attendance_date', period_start)
    .lte('attendance_date', period_end);

  const attendance = attendanceRows || [];
  const presentStatuses = ['PRESENT', 'LATE', 'OVERTIME', 'CORRECTED', 'HALF_DAY'];
  const workedDays    = attendance.filter(a => presentStatuses.includes(a.status)).length;
  const overtimeHours = money(
    attendance.reduce((s, a) => s + Number(a.overtime_hours || 0), 0)
  );

  // ── Approved time off for period ────────────────────────────────────────
  const { data: timeOffRows } = await db
    .from('time_off_requests')
    .select('duration, unit, time_off_types(payroll_integration)')
    .eq('employee_id', employeeId)
    .eq('status', 'APPROVED')
    .gte('start_date', period_start)
    .lte('end_date', period_end);

  let paidLeaveDays   = 0;
  let unpaidLeaveDays = 0;

  for (const req of timeOffRows || []) {
    const days = req.unit === 'HOURS' ? 0 : Number(req.duration || 0);
    if (req.time_off_types?.payroll_integration) {
      paidLeaveDays = money(paidLeaveDays + days);
    } else {
      unpaidLeaveDays = money(unpaidLeaveDays + days);
    }
  }

  // ── Build context and run engine ────────────────────────────────────────
  const context = buildPayrollContext({
    contract,
    periodAttendance: { workedDays, overtimeHours },
    periodTimeOff:    { paidLeaveDays, unpaidLeaveDays },
    workingDays,
  });

  const { lines, gross, deductions, net } = computePayslipFromRules(context, rules);

  if (net < 0) {
    payslipWarnings.push({
      severity: VALIDATION_SEVERITY.WARNING,
      code:     PAYROLL_ERRORS.NEGATIVE_NET,
      message:  `Net salary is negative (${net}). Check deduction rules.`,
    });
  }

  // ── UPSERT payslip (idempotent — safe to recompute) ─────────────────────
  const payslipPayload = {
    tenant_id:           payrun.tenant_id,
    payrun_id:           payrun.id,
    employee_id:         employeeId,
    contract_id:         contract.id,
    salary_structure_id,
    period_start,
    period_end,
    working_days:        workingDays,
    worked_days:         workedDays,
    paid_days:           context.paid_days,
    unpaid_leave_days:   unpaidLeaveDays,
    paid_leave_days:     paidLeaveDays,
    overtime_hours:      overtimeHours,
    contract_wage:       money(contract.wage),
    gross_amount:        gross,
    deduction_amount:    deductions,
    net_amount:          net,
    status:              PAYSLIP_STATUS.COMPUTED,
    warnings:            payslipWarnings.length > 0 ? payslipWarnings : null,
    computed_at:         new Date().toISOString(),
    updated_at:          new Date().toISOString(),
  };

  // Try update first; insert if not found
  const { data: existingPayslip } = await db
    .from('payslips')
    .select('id, status')
    .eq('payrun_id', payrun.id)
    .eq('employee_id', employeeId)
    .maybeSingle();

  let payslipId;

  if (existingPayslip) {
    if (existingPayslip.status === PAYSLIP_STATUS.PAID) {
      // Cannot overwrite a paid payslip
      return;
    }
    await db.from('payslips').update(payslipPayload).eq('id', existingPayslip.id);
    payslipId = existingPayslip.id;
  } else {
    const { data: newPayslip, error: psErr } = await db
      .from('payslips')
      .insert([payslipPayload])
      .select('id')
      .single();
    if (psErr) throw new AppError(psErr.message, 500);
    payslipId = newPayslip.id;
  }

  // ── UPSERT payslip lines ────────────────────────────────────────────────
  // Delete old lines first, then insert fresh ones (simplest idempotent strategy)
  await db.from('payslip_lines').delete().eq('payslip_id', payslipId);

  const lineInserts = lines.map(l => ({
    payslip_id:     payslipId,
    salary_rule_id: l.salary_rule_id,
    code:           l.code,
    name:           l.name,
    category:       l.category,
    sequence:       l.sequence,
    quantity:       l.quantity,
    rate:           l.rate,
    amount:         l.amount,
  }));

  if (lineInserts.length > 0) {
    const { error: lErr } = await db.from('payslip_lines').insert(lineInserts);
    if (lErr) throw new AppError(lErr.message, 500);
  }

  // Accumulate totals
  summaryTotals.total_employees++;
  summaryTotals.total_gross      = money(summaryTotals.total_gross + gross);
  summaryTotals.total_deductions = money(summaryTotals.total_deductions + deductions);
  summaryTotals.total_net        = money(summaryTotals.total_net + net);
}

// ─── Validate Payrun ──────────────────────────────────────────────────────────
exports.validatePayrun = async (tenantId, payrunId) => {
  const { data: payrun, error: prErr } = await withTenant(
    db.from('payruns').select(`*, payslips(id, status, employee_id, warnings, net_amount, contract_id)`).eq('id', payrunId),
    tenantId
  ).single();

  if (prErr) throw new AppError('Payrun not found', 404, PAYROLL_ERRORS.PAYRUN_NOT_FOUND);

  if (payrun.status === PAYRUN_STATUS.PAID) {
    throw new AppError('Payrun is already paid', 409, PAYROLL_ERRORS.PAYRUN_ALREADY_PAID);
  }

  if (payrun.status !== PAYRUN_STATUS.COMPUTED) {
    throw new AppError(
      `Payrun must be COMPUTED before validation. Current status: ${payrun.status}`,
      409,
      PAYROLL_ERRORS.PAYRUN_INVALID_TRANSITION
    );
  }

  const allWarnings = [];
  let hasBlockingErrors = false;

  // Check each payslip
  for (const ps of payrun.payslips || []) {
    if (ps.warnings) {
      for (const w of ps.warnings) {
        allWarnings.push({ ...w, employee_id: ps.employee_id });
        if (w.severity === VALIDATION_SEVERITY.ERROR) hasBlockingErrors = true;
      }
    }
    if (ps.net_amount < 0) {
      allWarnings.push({
        severity:    VALIDATION_SEVERITY.ERROR,
        code:        PAYROLL_ERRORS.NEGATIVE_NET,
        message:     'Net salary is negative',
        employee_id: ps.employee_id,
      });
      hasBlockingErrors = true;
    }
  }

  if (hasBlockingErrors) {
    throw new AppError(
      `Payrun has blocking validation errors. Resolve them before validating. Errors: ${allWarnings.filter(w => w.severity === 'ERROR').map(w => w.message).join('; ')}`,
      422
    );
  }

  // Mark all payslips as VALIDATED
  const payslipIds = (payrun.payslips || []).map(p => p.id);
  if (payslipIds.length > 0) {
    await db.from('payslips')
      .update({ status: PAYSLIP_STATUS.VALIDATED, validated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .in('id', payslipIds);
  }

  // Mark payrun as VALIDATED
  await db.from('payruns').update({
    status:       PAYRUN_STATUS.VALIDATED,
    validated_at: new Date().toISOString(),
    updated_at:   new Date().toISOString(),
  }).eq('id', payrunId);

  return { validated: true, warnings: allWarnings };
};

// ─── Mark as Paid ─────────────────────────────────────────────────────────────
exports.markAsPaid = async (tenantId, payrunId) => {
  const { data: payrun, error: prErr } = await withTenant(
    db.from('payruns').select('id, status, payslips(id)').eq('id', payrunId),
    tenantId
  ).single();

  if (prErr) throw new AppError('Payrun not found', 404, PAYROLL_ERRORS.PAYRUN_NOT_FOUND);

  if (payrun.status === PAYRUN_STATUS.PAID) {
    throw new AppError('Payrun is already paid', 409, PAYROLL_ERRORS.PAYRUN_ALREADY_PAID);
  }

  if (payrun.status !== PAYRUN_STATUS.VALIDATED) {
    throw new AppError(
      `Payrun must be VALIDATED before marking as paid. Current: ${payrun.status}`,
      409,
      PAYROLL_ERRORS.PAYRUN_INVALID_TRANSITION
    );
  }

  const now = new Date().toISOString();
  const payslipIds = (payrun.payslips || []).map(p => p.id);

  // Mark all payslips as PAID
  if (payslipIds.length > 0) {
    await db.from('payslips')
      .update({ status: PAYSLIP_STATUS.PAID, paid_at: now, updated_at: now })
      .in('id', payslipIds);
  }

  // Mark payrun as PAID
  await db.from('payruns').update({
    status:     PAYRUN_STATUS.PAID,
    paid_at:    now,
    updated_at: now,
  }).eq('id', payrunId);

  return exports.getPayrunById(tenantId, payrunId);
};

// ─── Payslips ─────────────────────────────────────────────────────────────────

exports.listPayslips = async (tenantId, { page = 1, limit = 20, payrun_id, employee_id, status } = {}) => {
  const offset = (page - 1) * limit;

  let query = withTenant(
    db.from('payslips').select(
      `*, employees(id, first_name, last_name, employee_code), payruns(name, period_start, period_end, status)`,
      { count: 'exact' }
    ),
    tenantId
  );

  if (payrun_id)   query = query.eq('payrun_id', payrun_id);
  if (employee_id) query = query.eq('employee_id', employee_id);
  if (status)      query = query.eq('status', status);

  const { data, error, count } = await query
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });

  if (error) throw new AppError(error.message, 500);

  return { payslips: data || [], total: count, page, limit };
};

exports.getPayslipById = async (tenantId, id, requestingUser) => {
  const { data, error } = await withTenant(
    db.from('payslips').select(`
      *,
      employees(id, first_name, last_name, employee_code, email, departments!employees_department_id_fkey(name), job_positions(name)),
      payruns(id, name, period_start, period_end, status),
      contracts(wage, employment_type, start_date, end_date),
      salary_structures(name, code),
      payslip_lines(*)
    `).eq('id', id),
    tenantId
  ).single();

  if (error) {
    if (error.code === 'PGRST116') throw new AppError('Payslip not found', 404, PAYROLL_ERRORS.PAYSLIP_NOT_FOUND);
    throw new AppError(error.message, 500);
  }

  // Employee can only see their own payslip
  if (
    requestingUser &&
    requestingUser.employee &&
    !requestingUser.roles?.includes('admin') &&
    !requestingUser.roles?.includes('hr_payroll_manager') &&
    !requestingUser.roles?.includes('hr_payroll_user') &&
    data.employee_id !== requestingUser.employee.id
  ) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  if (data.payslip_lines) {
    data.payslip_lines.sort((a, b) => a.sequence - b.sequence);
  }

  return data;
};

exports.getMyPayslips = async (tenantId, employeeId, { page = 1, limit = 10 } = {}) => {
  if (!employeeId) throw new AppError('Employee record not found for this user', 404);

  const offset = (page - 1) * limit;

  const { data, error, count } = await withTenant(
    db.from('payslips').select(
      `*, payruns(name, period_start, period_end), salary_structures(name)`,
      { count: 'exact' }
    ).eq('employee_id', employeeId),
    tenantId
  )
    .range(offset, offset + limit - 1)
    .order('period_start', { ascending: false });

  if (error) throw new AppError(error.message, 500);

  return { payslips: data || [], total: count, page, limit };
};
