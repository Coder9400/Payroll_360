require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

async function setOfficeLocation() {
  // Get all tenants
  const { data: tenants, error: tErr } = await db.from('tenants').select('id, name');
  if (tErr) { console.error('Error fetching tenants:', tErr.message); return; }
  
  console.log('Found tenants:', tenants.map(t => `${t.name} (${t.id})`).join(', '));
  
  const tenantIds = tenants.map(t => t.id);

  // Update ALL tenants with the office location
  const { data, error } = await db
    .from('tenants')
    .update({
      office_lat: 23.1935,
      office_lng: 72.6288,
      geofence_radius: 500,  // 500 meter radius
      updated_at: new Date().toISOString(),
    })
    .in('id', tenantIds)
    .select('id, name, office_lat, office_lng, geofence_radius');

  if (error) {
    console.error('Error updating geofence:', error.message);
    return;
  }

  console.log('\n✅ Office location set successfully:');
  data.forEach(t => {
    console.log(`  Tenant: ${t.name}`);
    console.log(`  Lat: ${t.office_lat}, Lng: ${t.office_lng}`);
    console.log(`  Radius: ${t.geofence_radius}m`);
  });
}

setOfficeLocation();
