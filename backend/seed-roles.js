/**
 * PeoplePay360 — Roles, Permissions & Demo Users Seed
 * Run from backend/: node seed-roles.js
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const client = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });

// ─── 1. Roles ─────────────────────────────────────────────────────────────────
const ROLES = [
  { name: 'Admin',              slug: 'admin',              description: 'Full system access and administration privileges', is_system: true },
  { name: 'HR Payroll Manager', slug: 'hr_payroll_manager', description: 'Full HR and Payroll management', is_system: true },
  { name: 'HR Payroll User',    slug: 'hr_payroll_user',    description: 'Payroll calculation and processing operations', is_system: true },
  { name: 'HR Manager',         slug: 'hr_manager',         description: 'Human Resources management', is_system: true },
  { name: 'Employee',           slug: 'employee',           description: 'Standard employee self-service portal access', is_system: true },
];

// ─── 2. Permissions ───────────────────────────────────────────────────────────
const PERMISSIONS = [
  // Employee
  { module: 'employee', action: 'read',     slug: 'employee:read',     description: 'View employee records' },
  { module: 'employee', action: 'read_own', slug: 'employee:read_own', description: 'View own employee profile' },
  { module: 'employee', action: 'create',   slug: 'employee:create',   description: 'Onboard new employees' },
  { module: 'employee', action: 'update',   slug: 'employee:update',   description: 'Update employee details' },
  { module: 'employee', action: 'delete',   slug: 'employee:delete',   description: 'Deactivate employee records' },
  // Attendance
  { module: 'attendance', action: 'read',     slug: 'attendance:read',     description: 'View company-wide attendance' },
  { module: 'attendance', action: 'read_own', slug: 'attendance:read_own', description: 'View own attendance history' },
  { module: 'attendance', action: 'create',   slug: 'attendance:create',   description: 'Clock in/out' },
  { module: 'attendance', action: 'update',   slug: 'attendance:update',   description: 'Edit attendance records' },
  { module: 'attendance', action: 'delete',   slug: 'attendance:delete',   description: 'Delete attendance records' },
  { module: 'attendance', action: 'approve',  slug: 'attendance:approve',  description: 'Approve regularization' },
  // Leave
  { module: 'leave', action: 'read',     slug: 'leave:read',     description: 'View company-wide leave' },
  { module: 'leave', action: 'read_own', slug: 'leave:read_own', description: 'View own leave' },
  { module: 'leave', action: 'create',   slug: 'leave:create',   description: 'Submit leave requests' },
  { module: 'leave', action: 'update',   slug: 'leave:update',   description: 'Edit leave requests' },
  { module: 'leave', action: 'delete',   slug: 'leave:delete',   description: 'Cancel leave requests' },
  { module: 'leave', action: 'approve',  slug: 'leave:approve',  description: 'Approve leave applications' },
  // Contract
  { module: 'contract', action: 'read',     slug: 'contract:read',     description: 'View contracts' },
  { module: 'contract', action: 'read_own', slug: 'contract:read_own', description: 'View own contract' },
  { module: 'contract', action: 'create',   slug: 'contract:create',   description: 'Create contracts' },
  { module: 'contract', action: 'update',   slug: 'contract:update',   description: 'Modify contracts' },
  { module: 'contract', action: 'delete',   slug: 'contract:delete',   description: 'Archive contracts' },
  // Payroll
  { module: 'payroll', action: 'read',    slug: 'payroll:read',    description: 'View payroll batches' },
  { module: 'payroll', action: 'process', slug: 'payroll:process', description: 'Execute payroll runs' },
  { module: 'payroll', action: 'approve', slug: 'payroll:approve', description: 'Approve payroll' },
  { module: 'payroll', action: 'lock',    slug: 'payroll:lock',    description: 'Lock payroll periods' },
  { module: 'payroll', action: 'export',  slug: 'payroll:export',  description: 'Export payroll' },
  // Payslip
  { module: 'payslip', action: 'read_own', slug: 'payslip:read_own', description: 'View own payslips' },
  { module: 'payslip', action: 'read_all', slug: 'payslip:read_all', description: 'View all payslips' },
  { module: 'payslip', action: 'generate', slug: 'payslip:generate', description: 'Generate payslips' },
  { module: 'payslip', action: 'download', slug: 'payslip:download', description: 'Download payslips' },
  // Salary
  { module: 'salary_structure', action: 'read',   slug: 'salary_structure:read',   description: 'View salary structures' },
  { module: 'salary_structure', action: 'manage', slug: 'salary_structure:manage', description: 'Manage salary structures' },
  { module: 'salary_rule', action: 'read',   slug: 'salary_rule:read',   description: 'View salary rules' },
  { module: 'salary_rule', action: 'manage', slug: 'salary_rule:manage', description: 'Manage salary rules' },
  // Admin
  { module: 'admin', action: 'all',      slug: 'admin:all',            description: 'Full admin access' },
  { module: 'admin', action: 'users',    slug: 'admin:users:manage',   description: 'Manage user accounts' },
  { module: 'admin', action: 'roles',    slug: 'admin:roles:manage',   description: 'Configure roles' },
  { module: 'admin', action: 'settings', slug: 'admin:settings:manage',description: 'Configure settings' },
];

// ─── 3. Role → Permission slug mapping ───────────────────────────────────────
const ROLE_PERMISSION_MAP = {
  admin: null, // all
  hr_payroll_manager: ['employee', 'attendance', 'leave', 'contract', 'payroll', 'payslip', 'salary_structure', 'salary_rule'],
  hr_payroll_user: [
    'payroll:read','payroll:process','payroll:export',
    'payslip:read_own','payslip:read_all','payslip:generate','payslip:download',
    'employee:read','attendance:read','contract:read',
    'salary_structure:read','salary_rule:read',
  ],
  hr_manager: null, // all employee/attendance/leave/contract + payslip:read_own
  employee: [
    'employee:read_own','attendance:read_own','attendance:create',
    'leave:read_own','leave:create','contract:read_own','payslip:read_own',
  ],
};

// ─── 4. Demo Auth users ───────────────────────────────────────────────────────
const DEMO_USERS = [
  { email: 'admin@peoplepay360.dev',       password: 'Admin@123456', role: 'admin',              firstName: 'System', lastName: 'Admin' },
  { email: 'hr.manager@peoplepay360.dev',  password: 'Admin@123456', role: 'hr_manager',          firstName: 'HR',     lastName: 'Manager' },
  { email: 'hr.payroll@peoplepay360.dev',  password: 'Admin@123456', role: 'hr_payroll_user',     firstName: 'HR',     lastName: 'Payroll' },
  { email: 'payroll.mgr@peoplepay360.dev', password: 'Admin@123456', role: 'hr_payroll_manager',  firstName: 'Payroll',lastName: 'Manager' },
  { email: 'employee@peoplepay360.dev',    password: 'Admin@123456', role: 'employee',             firstName: 'Demo',   lastName: 'Employee' },
];

function log(msg) { process.stdout.write(msg + '\n'); }
function ok(label) { log('  ✅ ' + label); }
function fail(label, err) { log('  ❌ ' + label + ': ' + (err?.message || String(err)).substring(0, 120)); }
function warn(label) { log('  ⚠️  ' + label); }

async function main() {
  log('\n' + '='.repeat(60));
  log('  PeoplePay360 — Seed: Roles, Permissions & Demo Users');
  log('='.repeat(60));

  // ── Step 1: Insert roles ────────────────────────────────────────
  log('\n📥 Step 1: Seeding roles...');
  const { error: rolesErr } = await client
    .from('roles')
    .upsert(ROLES, { onConflict: 'slug' });
  if (rolesErr) fail('Insert roles', rolesErr);
  else ok('5 roles upserted');

  // ── Step 2: Fetch roles (get IDs) ──────────────────────────────
  const { data: rolesData, error: rolesFetchErr } = await client
    .from('roles').select('id, slug');
  if (rolesFetchErr) { fail('Fetch roles', rolesFetchErr); process.exit(1); }
  const roleMap = Object.fromEntries(rolesData.map(r => [r.slug, r.id]));
  log('  Roles loaded: ' + Object.keys(roleMap).join(', '));

  // ── Step 3: Insert permissions ─────────────────────────────────
  log('\n📥 Step 2: Seeding permissions...');
  const { error: permsErr } = await client
    .from('permissions')
    .upsert(PERMISSIONS, { onConflict: 'slug' });
  if (permsErr) fail('Insert permissions', permsErr);
  else ok(`${PERMISSIONS.length} permissions upserted`);

  // ── Step 4: Fetch permissions (get IDs) ────────────────────────
  const { data: permsData, error: permsFetchErr } = await client
    .from('permissions').select('id, slug, module');
  if (permsFetchErr) { fail('Fetch permissions', permsFetchErr); process.exit(1); }
  const permMap = Object.fromEntries(permsData.map(p => [p.slug, p.id]));

  // ── Step 5: Map role → permissions ─────────────────────────────
  log('\n📥 Step 3: Mapping role → permissions...');
  for (const [roleSlug, filter] of Object.entries(ROLE_PERMISSION_MAP)) {
    const roleId = roleMap[roleSlug];
    if (!roleId) { warn(`Role not found: ${roleSlug}`); continue; }

    // Delete existing mappings for clean idempotent seed
    await client.from('role_permissions').delete().eq('role_id', roleId);

    let targetPerms;
    if (filter === null) {
      if (roleSlug === 'admin') {
        targetPerms = permsData.map(p => p.id);
      } else {
        // hr_manager: all employee/attendance/leave/contract modules + payslip:read_own
        targetPerms = permsData
          .filter(p => ['employee','attendance','leave','contract'].includes(p.module) || p.slug === 'payslip:read_own')
          .map(p => p.id);
      }
    } else if (Array.isArray(filter)) {
      // Slugs that contain ':' are direct slug matches; otherwise module matches
      targetPerms = permsData
        .filter(p => filter.some(f => f.includes(':') ? f === p.slug : f === p.module))
        .map(p => p.id);
    }

    const mappings = targetPerms.map(permId => ({ role_id: roleId, permission_id: permId }));
    if (mappings.length > 0) {
      const { error: mapErr } = await client.from('role_permissions').upsert(mappings, { onConflict: 'role_id,permission_id' });
      if (mapErr) fail(`Map ${roleSlug}`, mapErr);
      else ok(`${roleSlug}: ${mappings.length} permissions mapped`);
    }
  }

  // ── Step 6: Create demo auth users ─────────────────────────────
  log('\n📥 Step 4: Creating demo auth users...');
  for (const user of DEMO_USERS) {
    process.stdout.write(`  • ${user.email} ... `);

    // Try to create via admin API
    const { data: created, error: createErr } = await client.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { first_name: user.firstName, last_name: user.lastName },
    });

    let userId = created?.user?.id;

    if (createErr) {
      if (createErr.message?.includes('already been registered') || createErr.message?.includes('already exists')) {
        // User exists — find their ID
        const { data: { users } } = await client.auth.admin.listUsers();
        const existing = users?.find(u => u.email === user.email);
        userId = existing?.id;
        process.stdout.write('(already exists) ');
      } else {
        log(`❌ ${createErr.message}`);
        continue;
      }
    }

    if (!userId) { log('❌ No user ID'); continue; }

    // Upsert profile
    const { error: profileErr } = await client.from('profiles').upsert({
      id: userId,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      is_active: true,
    }, { onConflict: 'id' });
    if (profileErr) { log(`❌ Profile: ${profileErr.message}`); continue; }

    // Assign role
    const roleId = roleMap[user.role];
    if (!roleId) { log(`❌ Role not found: ${user.role}`); continue; }

    // Clear existing roles then assign
    await client.from('user_roles').delete().eq('user_id', userId);
    const { error: roleAssignErr } = await client.from('user_roles')
      .insert({ user_id: userId, role_id: roleId });
    if (roleAssignErr && !roleAssignErr.message?.includes('duplicate')) {
      log(`❌ Role assign: ${roleAssignErr.message}`); continue;
    }

    log(`✅ (role: ${user.role})`);
  }

  // ── Final verification ─────────────────────────────────────────
  log('\n📊 Final counts:');
  for (const table of ['roles', 'permissions', 'role_permissions', 'profiles', 'user_roles']) {
    const { count } = await client.from(table).select('*', { count: 'exact', head: true });
    log(`  ${table.padEnd(25)} → ${count ?? 0} rows`);
  }

  log('\n' + '='.repeat(60));
  log('  ✅ Seed complete!');
  log('');
  log('  Demo login credentials (all use password: Admin@123456):');
  DEMO_USERS.forEach(u => log(`  • ${u.email.padEnd(35)} → ${u.role}`));
  log('='.repeat(60) + '\n');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
