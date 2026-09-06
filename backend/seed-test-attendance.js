/**
 * seed-test-attendance.js
 * 
 * Seeds a test attendance check-in record for today with the office coordinates
 * so we can verify the HR Attendance Map shows the pin correctly.
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

async function run() {
  const today = new Date().toISOString().slice(0, 10);

  // Get a few employees to add pins for
  const { data: employees, error: empErr } = await db
    .from('employees')
    .select('id, first_name, last_name, tenant_id')
    .limit(5);

  if (empErr || !employees?.length) {
    console.error('No employees found:', empErr?.message);
    return;
  }

  console.log(`Found ${employees.length} employees. Seeding attendance with Ahmedabad location...\n`);

  // Office location + small random offset to simulate different positions
  const OFFICE_LAT = 23.1935;
  const OFFICE_LNG = 72.6288;

  const offsets = [
    { lat: 0.0001, lng: 0.0002 },   // Very close to office
    { lat: 0.0003, lng: -0.0001 },  // Slightly north
    { lat: -0.0002, lng: 0.0003 },  // Slightly south
    { lat: 0.0000, lng: 0.0000 },   // Exactly at office
    { lat: 0.0002, lng: 0.0001 },   // Slightly east
  ];

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    const offset = offsets[i % offsets.length];

    const checkInTime = new Date();
    checkInTime.setHours(9, Math.floor(Math.random() * 30), 0, 0); // 9:00-9:30 AM

    // Check if already has attendance today
    const { data: existing } = await db
      .from('attendance')
      .select('id')
      .eq('employee_id', emp.id)
      .eq('attendance_date', today)
      .single();

    if (existing) {
      // Update with location data
      const { error } = await db
        .from('attendance')
        .update({
          check_in_lat: OFFICE_LAT + offset.lat,
          check_in_lng: OFFICE_LNG + offset.lng,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) {
        console.log(`  ⚠️  ${emp.first_name} ${emp.last_name} — update failed: ${error.message}`);
      } else {
        console.log(`  ✅ ${emp.first_name} ${emp.last_name} — updated with location (${OFFICE_LAT + offset.lat}, ${OFFICE_LNG + offset.lng})`);
      }
    } else {
      // Insert fresh record
      const { error } = await db.from('attendance').insert([{
        tenant_id: emp.tenant_id,
        employee_id: emp.id,
        attendance_date: today,
        check_in: checkInTime.toISOString(),
        check_in_lat: OFFICE_LAT + offset.lat,
        check_in_lng: OFFICE_LNG + offset.lng,
        status: 'PRESENT',
        expected_start: '09:00',
        expected_end: '18:00',
        expected_hours: 9,
        break_minutes: 60,
        is_manual_edit: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]);

      if (error) {
        console.log(`  ⚠️  ${emp.first_name} ${emp.last_name} — insert failed: ${error.message}`);
      } else {
        console.log(`  ✅ ${emp.first_name} ${emp.last_name} — check-in at 09:${Math.floor(Math.random()*30).toString().padStart(2,'0')} with location`);
      }
    }
  }

  console.log('\n🗺️  Done! Open HR → Attendance → Map View to see the pins.');
}

run();
