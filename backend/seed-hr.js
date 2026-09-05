require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Seeding HR Master Data...');

  // 1. Departments
  const { data: dept1, error: e1 } = await supabase.from('departments').insert({
    name: 'Engineering',
    code: 'ENG',
    is_active: true
  }).select().single();

  const { data: dept2, error: e2 } = await supabase.from('departments').insert({
    name: 'Human Resources',
    code: 'HR',
    is_active: true
  }).select().single();

  if (e1 || e2) console.error('Error seeding departments:', e1?.message || e2?.message);
  else console.log('✅ Departments seeded');

  // 2. Job Positions
  if (dept1 && dept2) {
    const { error: p1 } = await supabase.from('job_positions').insert([
      { name: 'Software Engineer', code: 'SWE', department_id: dept1.id, is_active: true },
      { name: 'Senior Developer', code: 'SRDEV', department_id: dept1.id, is_active: true },
      { name: 'HR Manager', code: 'HRM', department_id: dept2.id, is_active: true },
      { name: 'Recruiter', code: 'REC', department_id: dept2.id, is_active: true },
    ]);
    if (p1) console.error('Error seeding positions:', p1.message);
    else console.log('✅ Job Positions seeded');
  }

  // 3. Working Schedules
  const { data: sched, error: s1 } = await supabase.from('working_schedules').insert({
    name: 'Standard 40H',
    code: 'STD-40',
    hours_week: 40
  }).select().single();

  if (s1) console.error('Error seeding schedule:', s1.message);
  else {
    const days = [];
    for (let i = 1; i <= 5; i++) {
      days.push({
        schedule_id: sched.id,
        day_of_week: i,
        is_working_day: true,
        start_time: '09:00',
        end_time: '18:00',
        break_minutes: 60
      });
    }
    // Saturday & Sunday
    days.push({ schedule_id: sched.id, day_of_week: 6, is_working_day: false, break_minutes: 0 });
    days.push({ schedule_id: sched.id, day_of_week: 0, is_working_day: false, break_minutes: 0 });
    
    const { error: s2 } = await supabase.from('working_schedule_days').insert(days);
    if (s2) console.error('Error seeding schedule days:', s2.message);
    else console.log('✅ Working Schedule seeded');
  }

  // 4. Time Off Types
  const { error: t1 } = await supabase.from('time_off_types').insert([
    { name: 'Paid Time Off', code: 'PTO', requires_allocation: true, is_active: true },
    { name: 'Sick Leave', code: 'SICK', requires_allocation: true, is_active: true }
  ]);
  
  if (t1) console.error('Error seeding time off types:', t1.message);
  else console.log('✅ Time Off Types seeded');

  console.log('Seeding complete!');
}

seed().catch(console.error);
