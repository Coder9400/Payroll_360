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

async function upsertAuthUser(emp) {
  const { data: created, error: createErr } = await client.auth.admin.createUser({
    email: emp.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { first_name: emp.first_name, last_name: emp.last_name },
  });

  let userId = created?.user?.id;

  if (createErr) {
    if (createErr.message?.includes('already been registered') || createErr.message?.includes('already exists')) {
      const { data: { users } } = await client.auth.admin.listUsers();
      const existing = users?.find(u => u.email === emp.email);
      userId = existing?.id;
    } else {
      throw createErr;
    }
  }
  if (!userId) throw new Error('No user ID resolved for ' + emp.email);

  await client.from('profiles').upsert({
    id: userId,
    email: emp.email,
    first_name: emp.first_name,
    last_name: emp.last_name,
    is_active: true,
    tenant_id: emp.tenant_id
  }, { onConflict: 'id' });

  return userId;
}

async function main() {
  console.log('Generating Auth Accounts for the 200 mass-seeded employees...');

  // 1. Fetch employee role ID
  const { data: rolesData, error: rolesFetchErr } = await client.from('roles').select('id, slug');
  if (rolesFetchErr) { console.error('Fetch roles', rolesFetchErr); process.exit(1); }
  const roleId = rolesData.find(r => r.slug === 'employee')?.id;
  
  if (!roleId) {
    console.error('Employee role not found');
    process.exit(1);
  }

  // 2. Fetch the 200 employees
  const { data: emps, error: fetchErr } = await client
    .from('employees')
    .select('*')
    .like('employee_code', 'EMP-M-%')
    .is('user_id', null);

  if (fetchErr) {
    console.error('Failed to fetch employees', fetchErr);
    return;
  }
  
  if (!emps || emps.length === 0) {
    console.log('All mass-seeded employees already have accounts, or none were found.');
    return;
  }

  console.log(`Creating accounts for ${emps.length} employees...`);

  let count = 0;
  for (const emp of emps) {
    try {
      const userId = await upsertAuthUser(emp);
      
      // Assign Role
      await client.from('user_roles').delete().eq('user_id', userId).eq('role_id', roleId);
      await client.from('user_roles').insert({ user_id: userId, role_id: roleId, tenant_id: emp.tenant_id });

      // Link Employee
      await client.from('employees').update({ user_id: userId }).eq('id', emp.id);

      count++;
      if (count % 20 === 0) process.stdout.write(`...${count}`);
    } catch (e) {
      console.error(`\nFailed for ${emp.email}: ${e.message}`);
    }
  }

  console.log(`\n✅ Created ${count} auth accounts successfully!`);
}

main().catch(console.error);
