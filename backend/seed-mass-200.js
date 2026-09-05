require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SECRET_KEY in backend/.env');
  process.exit(1);
}

const client = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });

// ── Realistic Indian Names ──
const firstNames = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 'Shaurya', 'Atharv', 'Advik', 'Pranav', 'Kabir', 'Ritvik', 'Anaya', 'Diya', 'Suhana', 'Kavya', 'Priya', 'Riya', 'Neha', 'Sneha', 'Tanya', 'Kiara', 'Aisha', 'Myra', 'Anika', 'Aarohi'];
const lastNames = ['Sharma', 'Verma', 'Gupta', 'Malhotra', 'Singh', 'Patel', 'Kumar', 'Reddy', 'Rao', 'Das', 'Bose', 'Chowdhury', 'Sen', 'Nair', 'Menon', 'Pillai', 'Iyer', 'Desai', 'Joshi', 'Kulkarni'];

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log('Generating 200 Employees & August Attendance...');

  // 1. Get base data
  const { data: depts } = await client.from('departments').select('id, code, tenant_id');
  const { data: positions } = await client.from('job_positions').select('id, code, department_id');
  const { data: schedRow } = await client.from('working_schedules').select('id').eq('code', 'STD-40').maybeSingle();
  const { data: structRow } = await client.from('salary_structures').select('id').eq('code', 'SWE-MONTHLY').maybeSingle();
  const { data: totRows } = await client.from('time_off_types').select('id, code');

  if (!depts?.length || !positions?.length || !schedRow) {
    console.error('Missing core HR data (departments/positions/schedules). Please run seed-jury-demo.js first.');
    process.exit(1);
  }

  const tenantId = depts[0].tenant_id;
  const scheduleId = schedRow.id;
  const salaryStructureId = structRow?.id;
  const ptoId = totRows?.find(t => t.code === 'PTO')?.id;

  // August 2026 Working Dates (exclude Sat/Sun)
  const augDates = [];
  for (let i = 1; i <= 31; i++) {
    const d = new Date(Date.UTC(2026, 7, i)); // month 7 is August
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      augDates.push(`2026-08-${String(i).padStart(2, '0')}`);
    }
  }

  // Generate 200 profiles
  const employeesToCreate = [];
  const generatedCodes = new Set();
  const generatedEmails = new Set();

  for (let i = 1; i <= 200; i++) {
    const fn = firstNames[getRandomInt(0, firstNames.length - 1)];
    const ln = lastNames[getRandomInt(0, lastNames.length - 1)];
    let email = `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@peoplepay360.dev`;
    let code = `EMP-M-${String(i).padStart(3, '0')}`;

    const dept = depts[getRandomInt(0, depts.length - 1)];
    const posOpts = positions.filter(p => p.department_id === dept.id);
    const pos = posOpts.length > 0 ? posOpts[getRandomInt(0, posOpts.length - 1)] : positions[getRandomInt(0, positions.length - 1)];

    employeesToCreate.push({
      tenant_id: tenantId,
      employee_code: code,
      first_name: fn,
      last_name: ln,
      email: email,
      date_of_joining: '2026-01-10', // Join before August
      department_id: dept.id,
      job_position_id: pos.id,
      working_schedule_id: scheduleId,
      employee_type: 'FULL_TIME',
      employment_status: 'ACTIVE',
      // user_id is left null since we're generating stub records
    });
  }

  // Batch insert employees
  console.log('Inserting employees...');
  const { data: createdEmps, error: empErr } = await client.from('employees').insert(employeesToCreate).select('id, employee_code, department_id, job_position_id');
  if (empErr) {
    console.error('Failed to insert employees:', empErr);
    process.exit(1);
  }

  console.log(`Created ${createdEmps.length} employees.`);

  // Create Contracts
  console.log('Creating contracts...');
  const contracts = createdEmps.map(emp => ({
    tenant_id: tenantId,
    employee_id: emp.id,
    contract_number: `CTR-${emp.employee_code}`,
    start_date: '2026-01-10',
    status: 'ACTIVE',
    department_id: emp.department_id,
    job_position_id: emp.job_position_id,
    working_schedule_id: scheduleId,
    wage: getRandomInt(45, 120) * 1000,
    currency: 'USD',
    employment_type: 'FULL_TIME',
    salary_structure_id: salaryStructureId,
  }));

  // Chunk insert to avoid Payload too large
  for(let i = 0; i < contracts.length; i+=50) {
    await client.from('contracts').insert(contracts.slice(i, i+50));
  }

  // Create PTO Allocations
  console.log('Creating PTO allocations...');
  if (ptoId) {
    const allocations = createdEmps.map(emp => ({
      tenant_id: tenantId,
      employee_id: emp.id,
      time_off_type_id: ptoId,
      allocated_amount: 20,
      approved_amount: 20,
      taken_amount: 0,
      remaining_amount: 20,
      valid_from: '2026-01-01',
      valid_to: '2026-12-31',
      status: 'APPROVED',
    }));
    for(let i = 0; i < allocations.length; i+=50) {
      await client.from('time_off_allocations').insert(allocations.slice(i, i+50));
    }
  }

  // Create Attendance
  console.log('Creating August Attendance (this might take a moment)...');
  const attendanceRows = [];
  
  for (const emp of createdEmps) {
    for (const date of augDates) {
      // 80% Present, 10% Late, 5% Overtime, 5% Missing checkout
      const rand = Math.random();
      let status = 'PRESENT';
      let checkIn = `${date}T03:30:00Z`; // 9 AM IST
      let checkOut = `${date}T12:30:00Z`; // 6 PM IST
      let worked = 8.0;
      let ot = null;
      let notes = null;

      if (rand > 0.95) {
        status = 'MISSING_CHECKOUT';
        checkOut = null;
        worked = null;
        notes = 'Missed checkout punch';
      } else if (rand > 0.90) {
        status = 'OVERTIME';
        checkOut = `${date}T14:30:00Z`; // 8 PM IST
        worked = 10.0;
        ot = 2.0;
      } else if (rand > 0.80) {
        status = 'LATE';
        checkIn = `${date}T04:15:00Z`; // 9:45 AM
        worked = 7.25;
      }

      attendanceRows.push({
        tenant_id: tenantId,
        employee_id: emp.id,
        attendance_date: date,
        check_in: checkIn,
        check_out: checkOut,
        worked_hours: worked,
        status: status,
        expected_start: '09:00',
        expected_end: '18:00',
        expected_hours: 8.00,
        break_minutes: 60,
        overtime_hours: ot,
        notes: notes,
        is_manual_edit: false
      });
    }
  }

  // Chunk insert attendance
  console.log(`Inserting ${attendanceRows.length} attendance records...`);
  for(let i = 0; i < attendanceRows.length; i+=500) {
    const chunk = attendanceRows.slice(i, i+500);
    const { error: attErr } = await client.from('attendance').insert(chunk);
    if (attErr) console.error('Error inserting chunk:', attErr.message);
    process.stdout.write(`...${i + chunk.length} `);
  }

  console.log('\n✅ Mass seeding completed successfully!');
}

main().catch(console.error);
