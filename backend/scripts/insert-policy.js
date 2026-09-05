require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function insertPolicy() {
  try {
    // Fetch a tenant id to attach to the policy
    const { data: tenants, error: tenantErr } = await supabaseAdmin.from('tenants').select('id').limit(1);
    
    if (tenantErr || !tenants || tenants.length === 0) {
      console.error('Failed to fetch a tenant:', tenantErr);
      process.exit(1);
    }

    const tenantId = tenants[0].id;

    // Check if policy already exists
    const { data: existing } = await supabaseAdmin.from('company_policies').select('id').eq('title', 'Leave & Payroll Deductions Policy').eq('tenant_id', tenantId).limit(1);
    
    if (existing && existing.length > 0) {
      console.log('Policy already exists in database. Skipping insert.');
      return;
    }

    // Insert policy
    const { error: insertErr } = await supabaseAdmin.from('company_policies').insert({
      tenant_id: tenantId,
      title: 'Leave & Payroll Deductions Policy',
      description: 'Official company policy regarding PTO, sick leave, and salary deductions for unauthorized absences.',
      pdf_url: '/Leave_and_Deductions_Policy.pdf',
      version: '1.0'
    });

    if (insertErr) {
      console.error('Failed to insert policy:', insertErr);
      process.exit(1);
    }

    console.log('Policy successfully inserted into the database!');
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

insertPolicy();
