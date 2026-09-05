/**
 * PeoplePay360 — Full Database Verification Script
 * Run from backend/: node verify-db.js
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env');
  process.exit(1);
}

const client = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });

const EXPECTED_TABLES = [
  'profiles',
  'roles',
  'permissions',
  'role_permissions',
  'user_roles',
  'departments',
  'job_positions',
  'working_schedules',
  'working_schedule_days',
  'employees',
  'contracts',
  'time_off_types',
  'attendance',
  'time_off_allocations',
  'time_off_requests',
];

function pad(str, len) { return String(str).padEnd(len, ' '); }

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  PeoplePay360 — Supabase Database Verification');
  console.log('  Project: ' + SUPABASE_URL);
  console.log('='.repeat(60));

  // ── 1. Table existence ────────────────────────────────────────
  console.log('\n📋 TABLE VERIFICATION\n');
  console.log(pad('Table', 30) + pad('Status', 10) + 'Row Count');
  console.log('-'.repeat(55));

  let tableFails = 0;
  for (const table of EXPECTED_TABLES) {
    const { data, error, count } = await client
      .from(table)
      .select('*', { count: 'exact', head: false })
      .limit(0);

    if (error) {
      console.log(pad(table, 30) + pad('❌ FAIL', 10) + error.message.substring(0, 50));
      tableFails++;
    } else {
      // Get actual count
      const { count: c } = await client.from(table).select('*', { count: 'exact', head: true });
      console.log(pad(table, 30) + pad('✅ OK', 10) + (c ?? 0));
    }
  }

  // ── 2. Roles check ────────────────────────────────────────────
  console.log('\n\n🔑 ROLES IN DATABASE\n');
  const { data: roles, error: rolesErr } = await client.from('roles').select('name, slug');
  if (rolesErr) {
    console.log('❌ Cannot read roles:', rolesErr.message);
  } else if (!roles || roles.length === 0) {
    console.log('⚠️  No roles found — seed not yet applied (run seed 002)');
  } else {
    roles.forEach(r => console.log(`  • ${pad(r.slug, 25)} → ${r.name}`));
  }

  // ── 3. Permissions check ─────────────────────────────────────
  console.log('\n\n🛡️  PERMISSIONS SUMMARY\n');
  const { data: perms, error: permsErr } = await client
    .from('permissions')
    .select('module', { count: 'exact' });
  if (permsErr) {
    console.log('❌ Cannot read permissions:', permsErr.message);
  } else {
    const { count: totalPerms } = await client
      .from('permissions')
      .select('*', { count: 'exact', head: true });
    console.log(`  Total permissions: ${totalPerms ?? 0}`);

    const { count: rpCount } = await client
      .from('role_permissions')
      .select('*', { count: 'exact', head: true });
    console.log(`  Role-permission mappings: ${rpCount ?? 0}`);
  }

  // ── 4. Auth users check ───────────────────────────────────────
  console.log('\n\n👤 SUPABASE AUTH USERS\n');
  try {
    const { data: { users }, error: usersErr } = await client.auth.admin.listUsers();
    if (usersErr) {
      console.log('⚠️  Cannot list auth users:', usersErr.message);
    } else if (!users || users.length === 0) {
      console.log('⚠️  No auth users found — create demo users in Supabase dashboard → Authentication → Users');
    } else {
      users.forEach(u => {
        console.log(`  • ${pad(u.email, 35)} confirmed: ${u.email_confirmed_at ? '✅' : '❌'}`);
      });
    }
  } catch (e) {
    console.log('⚠️  Auth admin API not available:', e.message);
  }

  // ── 5. Profiles check ─────────────────────────────────────────
  console.log('\n\n👥 PROFILES & USER ROLES\n');
  const { data: profiles, error: profilesErr } = await client
    .from('profiles')
    .select('email, is_active');
  if (profilesErr) {
    console.log('❌ Cannot read profiles:', profilesErr.message);
  } else if (!profiles || profiles.length === 0) {
    console.log('⚠️  No profiles yet — will be auto-created on first login');
  } else {
    profiles.forEach(p => console.log(`  • ${p.email} (active: ${p.is_active})`));
  }

  // ── 6. Final summary ──────────────────────────────────────────
  console.log('\n\n' + '='.repeat(60));
  if (tableFails === 0) {
    console.log('  ✅ ALL ' + EXPECTED_TABLES.length + ' TABLES EXIST — Database ready!');
  } else {
    console.log(`  ❌ ${tableFails} TABLE(S) MISSING — Run missing migrations`);
  }

  const expectedRoles = ['admin', 'hr_payroll_manager', 'hr_payroll_user', 'hr_manager', 'employee'];
  const foundSlugs = (roles || []).map(r => r.slug);
  const missingRoles = expectedRoles.filter(r => !foundSlugs.includes(r));
  if (missingRoles.length > 0) {
    console.log(`  ⚠️  MISSING ROLES: ${missingRoles.join(', ')} — Run seed 002`);
  } else if (!rolesErr && roles?.length > 0) {
    console.log('  ✅ ALL 5 ROLES SEEDED');
  }
  console.log('='.repeat(60) + '\n');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
