require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SECRET_KEY in backend/.env');
  process.exit(1);
}

const client = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString().split('T')[0];
}

async function main() {
  console.log('Fixing data for the 200 mass-seeded employees...');

  // 1. Fetch the 200 employees (code starts with EMP-M-)
  const { data: emps, error: fetchErr } = await client
    .from('employees')
    .select('id, employee_code')
    .like('employee_code', 'EMP-M-%');

  if (fetchErr) {
    console.error('Failed to fetch employees', fetchErr);
    return;
  }
  
  if (!emps || emps.length === 0) {
    console.log('No mass-seeded employees found to update.');
    return;
  }

  console.log(`Updating ${emps.length} employees...`);

  const types = ['FULL_TIME', 'PART_TIME', 'CONTRACTOR'];
  const typeWeights = [0.7, 0.2, 0.1];
  
  function getRandomType() {
    const r = Math.random();
    if (r < typeWeights[0]) return types[0];
    if (r < typeWeights[0] + typeWeights[1]) return types[1];
    return types[2];
  }

  let count = 0;
  for (const emp of emps) {
    const doj = getRandomDate(new Date(2020, 0, 1), new Date(2026, 6, 31)); // Join before Aug 2026
    const type = getRandomType();

    // Update Employee
    await client.from('employees').update({
      date_of_joining: doj,
      employee_type: type
    }).eq('id', emp.id);

    // Update Contract
    await client.from('contracts').update({
      start_date: doj,
      employment_type: type
    }).eq('employee_id', emp.id);

    count++;
    if (count % 20 === 0) process.stdout.write(`...${count}`);
  }

  console.log('\n✅ Data fixed successfully!');
}

main().catch(console.error);
