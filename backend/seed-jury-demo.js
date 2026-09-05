/**
 * PeoplePay360 — Jury Demo Story Seed
 * Run from backend/: node seed-jury-demo.js
 *
 * Builds a complete, interconnected demo story on top of whatever
 * seed-roles.js / seed-hr.js have already created:
 *   - 1 Admin (auth user only, no employee record)
 *   - 1 HR Manager (auth user + employee record)
 *   - 5 Employees: Aarav, Priya, Rahul, Neha, Dev (auth users + employee records)
 *   - Departments / job positions / working schedule (idempotent upserts)
 *   - Contracts for every employee
 *   - September 2026 attendance history
 *   - Time off types, allocations, and a mix of approved/pending requests
 *   - A "Software Engineer Monthly" salary structure with FIXED/PERCENTAGE/FORMULA rules
 *
 * Safe to re-run: everything is looked up by unique code/slug/email first.
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SECRET_KEY in backend/.env');
  process.exit(1);
}

const client = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });

const DEMO_PASSWORD = 'Demo@123456';

function log(msg) { process.stdout.write(msg + '\n'); }
function ok(label) { log('  ✅ ' + label); }
function fail(label, err) { log('  ❌ ' + label + ': ' + (err?.message || String(err)).substring(0, 200)); }
function warn(label) { log('  ⚠️  ' + label); }

// ─── Roles this script depends on (minimal upsert so it works standalone) ────
const ROLES_NEEDED = [
  { name: 'Admin',      slug: 'admin',      description: 'Full system access and administration privileges', is_system: true },
  { name: 'HR Manager', slug: 'hr_manager', description: 'Human Resources management',                        is_system: true },
  { name: 'Employee',   slug: 'employee',   description: 'Standard employee self-service portal access',      is_system: true },
];

// ─── Departments ──────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  { name: 'Engineering',     code: 'ENG', description: 'Product Engineering' },
  { name: 'Human Resources', code: 'HR',  description: 'HR & Payroll Department' },
  { name: 'Sales',           code: 'SLS', description: 'Sales Department' },
  { name: 'Marketing',       code: 'MKT', description: 'Marketing Department' },
];

// ─── Job Positions (code -> department code) ──────────────────────────────────
const JOB_POSITIONS = [
  { name: 'Software Engineer',    code: 'SE',        deptCode: 'ENG' },
  { name: 'HR Manager',           code: 'HR-MGR',    deptCode: 'HR' },
  { name: 'Sales Representative', code: 'SALES-REP', deptCode: 'SLS' },
  { name: 'Marketing Executive',  code: 'MKT-EXEC',  deptCode: 'MKT' },
];

// ─── Working Schedule ──────────────────────────────────────────────────────────
const SCHEDULE = { name: 'Standard 40 Hours', code: 'STD-40', hours_week: 40 };

// ─── People ────────────────────────────────────────────────────────────────────
// HR Manager is created first so employees can report to them.
const HR_MANAGER = {
  firstName: 'Ananya', lastName: 'Iyer', email: 'ananya.iyer@peoplepay360.dev',
  employeeCode: 'EMP-HR-001', deptCode: 'HR', posCode: 'HR-MGR',
  wage: 90000, role: 'hr_manager',
};

const ADMIN_USER = {
  firstName: 'Vikram', lastName: 'Shah', email: 'admin@peoplepay360.dev', role: 'admin',
};

const EMPLOYEES = [
  { firstName: 'Aarav',  lastName: 'Mehta',     email: 'aarav.mehta@peoplepay360.dev',     employeeCode: 'EMP-001', deptCode: 'ENG', posCode: 'SE',        wage: 65000, useSalaryStructure: true },
  { firstName: 'Priya',  lastName: 'Sharma',    email: 'priya.sharma@peoplepay360.dev',    employeeCode: 'EMP-002', deptCode: 'ENG', posCode: 'SE',        wage: 70000, useSalaryStructure: true },
  { firstName: 'Rahul',  lastName: 'Verma',     email: 'rahul.verma@peoplepay360.dev',     employeeCode: 'EMP-003', deptCode: 'SLS', posCode: 'SALES-REP', wage: 48000, useSalaryStructure: false },
  { firstName: 'Neha',   lastName: 'Gupta',     email: 'neha.gupta@peoplepay360.dev',      employeeCode: 'EMP-004', deptCode: 'MKT', posCode: 'MKT-EXEC',  wage: 52000, useSalaryStructure: false },
  { firstName: 'Dev',    lastName: 'Malhotra',  email: 'dev.malhotra@peoplepay360.dev',    employeeCode: 'EMP-005', deptCode: 'ENG', posCode: 'SE',        wage: 60000, useSalaryStructure: true },
];

// ─── Salary Structure ──────────────────────────────────────────────────────────
const SALARY_STRUCTURE = { name: 'Software Engineer Monthly', code: 'SWE-MONTHLY', description: 'Monthly salary structure for Software Engineers' };
const SALARY_RULES = [
  { code: 'BASIC', name: 'Basic Salary',       category: 'BASIC',      sequence: 10, computation_type: 'PERCENTAGE', fixed_amount: null, percentage_base: 'prorated_wage', percentage_value: 100 },
  { code: 'HRA',   name: 'House Rent Allowance', category: 'ALLOWANCE', sequence: 20, computation_type: 'PERCENTAGE', percentage_base: 'BASIC', percentage_value: 40 },
  { code: 'PF',    name: 'Provident Fund',     category: 'DEDUCTION',  sequence: 30, computation_type: 'FORMULA',    formula: '(BASIC + HRA) * 0.12' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function upsertAuthUser({ firstName, lastName, email }) {
  const { data: created, error: createErr } = await client.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  });

  let userId = created?.user?.id;

  if (createErr) {
    if (createErr.message?.includes('already been registered') || createErr.message?.includes('already exists')) {
      const { data: { users } } = await client.auth.admin.listUsers();
      const existing = users?.find(u => u.email === email);
      userId = existing?.id;
    } else {
      throw createErr;
    }
  }
  if (!userId) throw new Error('No user ID resolved for ' + email);

  await client.from('profiles').upsert({
    id: userId, email, first_name: firstName, last_name: lastName, is_active: true,
  }, { onConflict: 'id' });

  return userId;
}

async function assignRole(userId, roleId) {
  await client.from('user_roles').delete().eq('user_id', userId).eq('role_id', roleId);
  const { error } = await client.from('user_roles').insert({ user_id: userId, role_id: roleId });
  if (error && !error.message?.includes('duplicate')) throw error;
}

async function main() {
  log('\n' + '='.repeat(64));
  log('  PeoplePay360 — Jury Demo Story Seed');
  log('='.repeat(64));

  // ── Preflight: verify payroll tables exist ─────────────────────────────
  const preflight = await client.from('salary_structures').select('id').limit(1);
  if (preflight.error) {
    log('\n❌ Payroll tables are missing (salary_structures not found).');
    log('   Apply database/migrations/005_payroll_schema.sql in the Supabase SQL');
    log('   Editor first, then re-run this script.');
    log('   Error: ' + preflight.error.message);
    process.exit(1);
  }
  ok('Payroll schema detected — proceeding');

  // ── Step 1: Roles ───────────────────────────────────────────────────────
  log('\n📥 Step 1: Ensuring required roles exist...');
  const { error: rolesErr } = await client.from('roles').upsert(ROLES_NEEDED, { onConflict: 'slug' });
  if (rolesErr) fail('Upsert roles', rolesErr); else ok('Roles ensured (admin, hr_manager, employee)');

  const { data: rolesData, error: rolesFetchErr } = await client.from('roles').select('id, slug');
  if (rolesFetchErr) { fail('Fetch roles', rolesFetchErr); process.exit(1); }
  const roleMap = Object.fromEntries(rolesData.map(r => [r.slug, r.id]));

  const { count: permCount } = await client.from('role_permissions').select('*', { count: 'exact', head: true });
  if (!permCount) {
    warn('role_permissions table is empty — run `node seed-roles.js` first so hr_manager/employee logins have working permissions (admin bypasses this check).');
  }

  // ── Step 2: Departments ─────────────────────────────────────────────────
  log('\n📥 Step 2: Seeding departments...');
  const { error: deptErr } = await client.from('departments').upsert(
    DEPARTMENTS.map(d => ({ name: d.name, code: d.code, description: d.description, is_active: true })),
    { onConflict: 'code' }
  );
  if (deptErr) fail('Upsert departments', deptErr); else ok(`${DEPARTMENTS.length} departments ensured`);

  const { data: deptRows } = await client.from('departments').select('id, code');
  const deptMap = Object.fromEntries(deptRows.map(d => [d.code, d.id]));

  // ── Step 3: Job Positions ───────────────────────────────────────────────
  log('\n📥 Step 3: Seeding job positions...');
  const { error: posErr } = await client.from('job_positions').upsert(
    JOB_POSITIONS.map(p => ({ name: p.name, code: p.code, department_id: deptMap[p.deptCode], is_active: true })),
    { onConflict: 'code' }
  );
  if (posErr) fail('Upsert job positions', posErr); else ok(`${JOB_POSITIONS.length} job positions ensured`);

  const { data: posRows } = await client.from('job_positions').select('id, code');
  const posMap = Object.fromEntries(posRows.map(p => [p.code, p.id]));

  // ── Step 4: Working Schedule ────────────────────────────────────────────
  log('\n📥 Step 4: Seeding working schedule...');
  let { data: schedRow } = await client.from('working_schedules').select('id').eq('code', SCHEDULE.code).maybeSingle();
  if (!schedRow) {
    const { data: newSched, error: schedErr } = await client.from('working_schedules').insert(SCHEDULE).select().single();
    if (schedErr) { fail('Insert schedule', schedErr); process.exit(1); }
    schedRow = newSched;
    const days = [];
    for (let i = 1; i <= 5; i++) days.push({ schedule_id: schedRow.id, day_of_week: i, is_working_day: true, start_time: '09:00', end_time: '18:00', break_minutes: 60 });
    days.push({ schedule_id: schedRow.id, day_of_week: 6, is_working_day: false, break_minutes: 0 });
    days.push({ schedule_id: schedRow.id, day_of_week: 0, is_working_day: false, break_minutes: 0 });
    await client.from('working_schedule_days').insert(days);
    ok('Working schedule created (STD-40)');
  } else {
    ok('Working schedule already exists (STD-40)');
  }
  const scheduleId = schedRow.id;

  // ── Step 5: Time Off Types ───────────────────────────────────────────────
  log('\n📥 Step 5: Seeding time off types...');
  const TIME_OFF_TYPES = [
    { name: 'Paid Time Off', code: 'PTO', unit: 'DAYS', requires_allocation: true, requires_approval: true, payroll_integration: true, is_active: true },
    { name: 'Sick Leave',    code: 'SICK', unit: 'DAYS', requires_allocation: true, requires_approval: true, payroll_integration: true, is_active: true },
  ];
  const { error: totErr } = await client.from('time_off_types').upsert(TIME_OFF_TYPES, { onConflict: 'code' });
  if (totErr) fail('Upsert time off types', totErr); else ok('Time off types ensured (PTO, SICK)');

  const { data: totRows } = await client.from('time_off_types').select('id, code');
  const totMap = Object.fromEntries(totRows.map(t => [t.code, t.id]));

  // ── Step 6: HR Manager ───────────────────────────────────────────────────
  log('\n📥 Step 6: Creating HR Manager...');
  const hrUserId = await upsertAuthUser(HR_MANAGER);
  await assignRole(hrUserId, roleMap['hr_manager']);

  let { data: hrEmp } = await client.from('employees').select('id').eq('employee_code', HR_MANAGER.employeeCode).maybeSingle();
  const hrEmpPayload = {
    employee_code: HR_MANAGER.employeeCode,
    user_id: hrUserId,
    first_name: HR_MANAGER.firstName,
    last_name: HR_MANAGER.lastName,
    email: HR_MANAGER.email,
    date_of_joining: '2024-01-15',
    department_id: deptMap[HR_MANAGER.deptCode],
    job_position_id: posMap[HR_MANAGER.posCode],
    working_schedule_id: scheduleId,
    employee_type: 'FULL_TIME',
    employment_status: 'ACTIVE',
  };
  if (hrEmp) {
    await client.from('employees').update(hrEmpPayload).eq('id', hrEmp.id);
  } else {
    const { data: newHrEmp, error: hrEmpErr } = await client.from('employees').insert(hrEmpPayload).select().single();
    if (hrEmpErr) { fail('Insert HR Manager employee', hrEmpErr); process.exit(1); }
    hrEmp = newHrEmp;
  }
  ok(`HR Manager ready: ${HR_MANAGER.email}`);
  const hrManagerEmployeeId = hrEmp.id;

  // Set HR department's manager to the HR Manager employee
  await client.from('departments').update({ manager_id: hrManagerEmployeeId }).eq('code', 'HR');

  // ── Step 7: Admin (auth user only, no employee record) ──────────────────
  log('\n📥 Step 7: Creating Admin...');
  const adminUserId = await upsertAuthUser(ADMIN_USER);
  await assignRole(adminUserId, roleMap['admin']);
  ok(`Admin ready: ${ADMIN_USER.email}`);

  // ── Step 8: Salary Structure + Rules ─────────────────────────────────────
  log('\n📥 Step 8: Creating salary structure...');
  let { data: structRow } = await client.from('salary_structures').select('id').eq('code', SALARY_STRUCTURE.code).maybeSingle();
  if (!structRow) {
    const { data: newStruct, error: structErr } = await client.from('salary_structures').insert({ ...SALARY_STRUCTURE, is_active: true }).select().single();
    if (structErr) { fail('Insert salary structure', structErr); process.exit(1); }
    structRow = newStruct;
  }
  const salaryStructureId = structRow.id;

  for (const rule of SALARY_RULES) {
    const { data: existingRule } = await client.from('salary_rules').select('id').eq('salary_structure_id', salaryStructureId).eq('code', rule.code).maybeSingle();
    const payload = { ...rule, salary_structure_id: salaryStructureId, is_active: true };
    if (existingRule) {
      await client.from('salary_rules').update(payload).eq('id', existingRule.id);
    } else {
      const { error: ruleErr } = await client.from('salary_rules').insert(payload);
      if (ruleErr) fail(`Insert rule ${rule.code}`, ruleErr);
    }
  }
  ok(`Salary structure "${SALARY_STRUCTURE.name}" ready with ${SALARY_RULES.length} rules (FIXED, PERCENTAGE, FORMULA)`);

  // ── Step 9: Employees, contracts, attendance, leave ─────────────────────
  log('\n📥 Step 9: Creating employees, contracts, attendance & leave...');

  // September 2026 weekdays for attendance (today: 2026-09-05)
  const attendanceDates = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04']
    .filter(d => { const dow = new Date(d + 'T00:00:00Z').getUTCDay(); return dow !== 0 && dow !== 6; });

  const createdEmployees = [];

  for (const emp of EMPLOYEES) {
    const userId = await upsertAuthUser(emp);
    await assignRole(userId, roleMap['employee']);

    let { data: empRow } = await client.from('employees').select('id').eq('employee_code', emp.employeeCode).maybeSingle();
    const empPayload = {
      employee_code: emp.employeeCode,
      user_id: userId,
      first_name: emp.firstName,
      last_name: emp.lastName,
      email: emp.email,
      date_of_joining: '2025-02-01',
      department_id: deptMap[emp.deptCode],
      job_position_id: posMap[emp.posCode],
      manager_id: hrManagerEmployeeId,
      working_schedule_id: scheduleId,
      employee_type: 'FULL_TIME',
      employment_status: 'ACTIVE',
    };
    if (empRow) {
      await client.from('employees').update(empPayload).eq('id', empRow.id);
    } else {
      const { data: newEmp, error: empErr } = await client.from('employees').insert(empPayload).select().single();
      if (empErr) { fail(`Insert employee ${emp.email}`, empErr); continue; }
      empRow = newEmp;
    }
    const employeeId = empRow.id;
    createdEmployees.push({ ...emp, id: employeeId });

    // Contract
    const contractNumber = `CTR-${emp.employeeCode}`;
    let { data: contractRow } = await client.from('contracts').select('id').eq('contract_number', contractNumber).maybeSingle();
    const contractPayload = {
      employee_id: employeeId,
      contract_number: contractNumber,
      start_date: '2025-02-01',
      status: 'ACTIVE',
      department_id: deptMap[emp.deptCode],
      job_position_id: posMap[emp.posCode],
      working_schedule_id: scheduleId,
      wage: emp.wage,
      currency: 'USD',
      employment_type: 'FULL_TIME',
      salary_structure_id: emp.useSalaryStructure ? salaryStructureId : null,
    };
    if (contractRow) {
      await client.from('contracts').update(contractPayload).eq('id', contractRow.id);
    } else {
      const { error: contractErr } = await client.from('contracts').insert(contractPayload);
      if (contractErr) fail(`Insert contract for ${emp.email}`, contractErr);
    }

    // Attendance: vary status per employee/day for realism
    const attendanceRows = attendanceDates.map((date, i) => {
      const seed = (i + createdEmployees.length) % 4;
      if (seed === 0) {
        return { employee_id: employeeId, attendance_date: date, check_in: `${date}T03:30:00Z`, check_out: `${date}T12:30:00Z`, worked_hours: 8.00, status: 'PRESENT', expected_start: '09:00', expected_end: '18:00', expected_hours: 8.00, break_minutes: 60, is_manual_edit: false };
      }
      if (seed === 1) {
        return { employee_id: employeeId, attendance_date: date, check_in: `${date}T03:47:00Z`, check_out: `${date}T12:30:00Z`, worked_hours: 7.72, status: 'LATE', expected_start: '09:00', expected_end: '18:00', expected_hours: 8.00, break_minutes: 60, is_manual_edit: false, notes: 'Arrived 17 minutes late' };
      }
      if (seed === 2) {
        return { employee_id: employeeId, attendance_date: date, check_in: `${date}T03:30:00Z`, check_out: `${date}T14:30:00Z`, worked_hours: 10.00, status: 'OVERTIME', expected_start: '09:00', expected_end: '18:00', expected_hours: 8.00, break_minutes: 60, overtime_hours: 2.00, is_manual_edit: false, notes: 'Stayed late for a deadline' };
      }
      return { employee_id: employeeId, attendance_date: date, check_in: `${date}T03:30:00Z`, check_out: `${date}T12:30:00Z`, worked_hours: 8.00, status: 'PRESENT', expected_start: '09:00', expected_end: '18:00', expected_hours: 8.00, break_minutes: 60, is_manual_edit: false };
    });
    // First employee gets one MISSING_CHECKOUT example on the last date instead of PRESENT
    if (createdEmployees.length === 1 && attendanceRows.length > 0) {
      const last = attendanceRows[attendanceRows.length - 1];
      last.check_out = null;
      last.worked_hours = null;
      last.status = 'MISSING_CHECKOUT';
      last.notes = 'Employee forgot to check out';
    }

    for (const row of attendanceRows) {
      const { data: existingAtt } = await client.from('attendance').select('id').eq('employee_id', employeeId).eq('attendance_date', row.attendance_date).maybeSingle();
      if (existingAtt) {
        await client.from('attendance').update(row).eq('id', existingAtt.id);
      } else {
        const { error: attErr } = await client.from('attendance').insert(row);
        if (attErr) fail(`Insert attendance ${emp.email} ${row.attendance_date}`, attErr);
      }
    }

    // Time off allocation: 20 days PTO, some taken
    const taken = createdEmployees.length === 1 ? 3 : 0;
    const allocPayload = {
      employee_id: employeeId,
      time_off_type_id: totMap['PTO'],
      allocated_amount: 20, approved_amount: 20, taken_amount: taken, remaining_amount: 20 - taken,
      valid_from: '2026-01-01', valid_to: '2026-12-31', status: 'APPROVED',
    };
    const { data: existingAlloc } = await client.from('time_off_allocations').select('id').eq('employee_id', employeeId).eq('time_off_type_id', totMap['PTO']).eq('valid_from', '2026-01-01').maybeSingle();
    if (existingAlloc) {
      await client.from('time_off_allocations').update(allocPayload).eq('id', existingAlloc.id);
    } else {
      const { error: allocErr } = await client.from('time_off_allocations').insert(allocPayload);
      if (allocErr) fail(`Insert PTO allocation for ${emp.email}`, allocErr);
    }

    // Sick leave allocation (unused)
    const sickAllocPayload = {
      employee_id: employeeId,
      time_off_type_id: totMap['SICK'],
      allocated_amount: 10, approved_amount: 10, taken_amount: 0, remaining_amount: 10,
      valid_from: '2026-01-01', valid_to: '2026-12-31', status: 'APPROVED',
    };
    const { data: existingSickAlloc } = await client.from('time_off_allocations').select('id').eq('employee_id', employeeId).eq('time_off_type_id', totMap['SICK']).eq('valid_from', '2026-01-01').maybeSingle();
    if (existingSickAlloc) {
      await client.from('time_off_allocations').update(sickAllocPayload).eq('id', existingSickAlloc.id);
    } else {
      await client.from('time_off_allocations').insert(sickAllocPayload);
    }

    // Leave requests: first employee has an approved past request consuming the 3 taken days;
    // second employee has a pending request awaiting HR approval.
    if (createdEmployees.length === 1) {
      const reqPayload = {
        employee_id: employeeId, time_off_type_id: totMap['PTO'],
        start_date: '2026-08-24', end_date: '2026-08-26', duration: 3, unit: 'DAYS',
        reason: 'Family event', status: 'APPROVED',
      };
      const { data: existingReq } = await client.from('time_off_requests').select('id').eq('employee_id', employeeId).eq('start_date', '2026-08-24').maybeSingle();
      if (!existingReq) await client.from('time_off_requests').insert(reqPayload);
    }
    if (createdEmployees.length === 2) {
      const reqPayload = {
        employee_id: employeeId, time_off_type_id: totMap['SICK'],
        start_date: '2026-09-14', end_date: '2026-09-14', duration: 1, unit: 'DAYS',
        reason: 'Medical appointment', status: 'PENDING',
      };
      const { data: existingReq } = await client.from('time_off_requests').select('id').eq('employee_id', employeeId).eq('start_date', '2026-09-14').maybeSingle();
      if (!existingReq) await client.from('time_off_requests').insert(reqPayload);
    }

    ok(`${emp.firstName} ${emp.lastName} (${emp.employeeCode}) ready — dept ${emp.deptCode}, wage ${emp.wage}`);
  }

  // ── Final Summary ─────────────────────────────────────────────────────
  log('\n📊 Final row counts:');
  const tables = ['departments', 'job_positions', 'working_schedules', 'employees', 'contracts', 'attendance', 'time_off_types', 'time_off_allocations', 'time_off_requests', 'salary_structures', 'salary_rules'];
  for (const table of tables) {
    const { count } = await client.from(table).select('*', { count: 'exact', head: true });
    log(`  ${table.padEnd(25)} → ${count ?? 0} rows`);
  }

  log('\n' + '='.repeat(64));
  log('  ✅ Jury demo seed complete!');
  log('');
  log(`  Demo login credentials (all use password: ${DEMO_PASSWORD}):`);
  log(`  • ${ADMIN_USER.email.padEnd(35)} → admin`);
  log(`  • ${HR_MANAGER.email.padEnd(35)} → hr_manager`);
  EMPLOYEES.forEach(e => log(`  • ${e.email.padEnd(35)} → employee (${e.firstName} ${e.lastName}, ${e.deptCode})`));
  log('='.repeat(64) + '\n');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
