/**
 * seed-missing-contracts.js
 * 
 * Creates contracts for any employees that don't have one.
 * Matches the exact schema of existing contracts.
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

const SALARY_STRUCTURE_ID = '423b1211-3e19-43aa-ae89-cbc090928db7';
const SCHEDULE_ID_STD = '7773b7b8-1946-460e-9e22-5fd1179d90ed'; // Standard 40H

// Realistic Indian salaries (monthly, INR)
const WAGES = [65000, 72000, 78000, 85000, 92000, 98000, 105000, 112000, 120000, 125000];
const EMPLOYMENT_TYPES = ['FULL_TIME', 'FULL_TIME', 'FULL_TIME', 'PART_TIME', 'CONTRACT'];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function run() {
  // Get all employees
  const { data: allEmployees, error: empErr } = await db
    .from('employees')
    .select('id, first_name, last_name, tenant_id, department_id, job_position_id, working_schedule_id');

  if (empErr) { console.error('Error:', empErr.message); return; }

  // Get existing contracted employee IDs
  const { data: allContracts } = await db.from('contracts').select('employee_id, contract_number');
  const contractedIds = new Set(allContracts.map(c => c.employee_id));
  
  // Get highest existing contract number
  const contractNumbers = allContracts
    .map(c => parseInt(c.contract_number?.replace('CTR-EMP-M-', '') || '0'))
    .filter(n => !isNaN(n));
  let nextNum = contractNumbers.length > 0 ? Math.max(...contractNumbers) + 1 : 1;

  const withoutContract = allEmployees.filter(e => !contractedIds.has(e.id));
  console.log(`\nFound ${withoutContract.length} employees without contracts:\n`);
  withoutContract.forEach(e => console.log(` - ${e.first_name} ${e.last_name} (${e.id})`));

  if (withoutContract.length === 0) {
    console.log('\n✅ All employees already have contracts!');
    return;
  }

  const contractsToInsert = withoutContract.map((emp) => {
    const wage = randomItem(WAGES);
    const empType = randomItem(EMPLOYMENT_TYPES);
    const num = String(nextNum++).padStart(3, '0');

    return {
      tenant_id: emp.tenant_id,
      employee_id: emp.id,
      contract_number: `CTR-EMP-M-${num}`,
      start_date: '2025-01-01',
      end_date: null,
      status: 'ACTIVE',
      department_id: emp.department_id,
      job_position_id: emp.job_position_id,
      working_schedule_id: emp.working_schedule_id || SCHEDULE_ID_STD,
      wage: wage,
      currency: 'INR',
      employment_type: empType,
      salary_structure_id: SALARY_STRUCTURE_ID,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  const { data: inserted, error: insertErr } = await db
    .from('contracts')
    .insert(contractsToInsert)
    .select('id, contract_number, employee_id, wage, employment_type');

  if (insertErr) {
    console.error('\n❌ Insert error:', insertErr.message);
    return;
  }

  console.log(`\n✅ Created ${inserted.length} new contracts:`);
  inserted.forEach(c => {
    const emp = withoutContract.find(e => e.id === c.employee_id);
    console.log(`  ${c.contract_number} → ${emp?.first_name} ${emp?.last_name} | ₹${c.wage.toLocaleString()}/mo | ${c.employment_type}`);
  });

  // Final verification
  const { count: total } = await db.from('contracts').select('id', { count: 'exact', head: true });
  const { count: empCount } = await db.from('employees').select('id', { count: 'exact', head: true });
  console.log(`\n📊 Summary: ${total} contracts for ${empCount} employees`);
  if (total >= empCount) {
    console.log('✅ All employees now have contracts!');
  } else {
    console.log(`⚠️  Still ${empCount - total} employees without contracts.`);
  }
}

run();
