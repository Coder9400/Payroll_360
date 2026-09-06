require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

async function run() {
  console.log('Fetching employees...');
  const { data: employees, error: empErr } = await supabase
    .from('employees')
    .select('id, tenant_id, department_id, job_position_id, working_schedule_id, employee_type');

  if (empErr) {
    console.error('Failed to fetch employees:', empErr);
    process.exit(1);
  }

  console.log(`Found ${employees.length} employees.`);

  const { data: existingContracts, error: contractErr } = await supabase
    .from('contracts')
    .select('employee_id');

  if (contractErr) {
    console.error('Failed to fetch contracts:', contractErr);
    process.exit(1);
  }

  const employeesWithContract = new Set(existingContracts.map(c => c.employee_id));
  const employeesNeedContract = employees.filter(e => !employeesWithContract.has(e.id));

  console.log(`${employeesNeedContract.length} employees need a contract.`);

  if (employeesNeedContract.length === 0) {
    console.log('All employees have contracts.');
    process.exit(0);
  }

  // Need to get salary_structure_id
  const { data: structures } = await supabase.from('salary_structures').select('id, tenant_id').limit(1);
  const salaryStructureId = structures && structures.length > 0 ? structures[0].id : null;

  const newContracts = employeesNeedContract.map((emp, index) => {
    // Generate a random wage based on position or type (simulated)
    const baseWage = emp.employee_type === 'Full Time' ? 50000 : 25000;
    const wage = baseWage + Math.floor(Math.random() * 20000);

    return {
      tenant_id: emp.tenant_id,
      employee_id: emp.id,
      contract_number: `CTR-${Math.floor(Date.now() / 1000)}-${index}`,
      start_date: '2023-01-01',
      status: 'ACTIVE',
      department_id: emp.department_id,
      job_position_id: emp.job_position_id,
      working_schedule_id: emp.working_schedule_id,
      wage: wage,
      employment_type: emp.employee_type || 'Full Time',
      salary_structure_id: salaryStructureId
    };
  });

  const { error: insertErr } = await supabase
    .from('contracts')
    .insert(newContracts);

  if (insertErr) {
    console.error('Failed to insert contracts:', insertErr);
    process.exit(1);
  }

  console.log(`Successfully created ${newContracts.length} contracts.`);
  process.exit(0);
}

run();
