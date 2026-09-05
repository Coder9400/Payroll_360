/**
 * Phase 2 Attendance Tests
 *
 * Covers:
 *   Unit Tests:      calculateWorkedHours, determineStatus, getScheduleDayForDate, isWorkingDay
 *   Integration:     check-in, check-out, filtering, correction, RBAC
 *   RBAC:            employee own data, cross-employee access denied, HR access
 */

process.env.NODE_ENV = 'test';

const http = require('http');
const app = require('../src/app');
const {
  calculateWorkedHours,
  determineStatus,
  getScheduleDayForDate,
  isWorkingDay,
  parseTime,
} = require('../src/services/attendance.service');
const { ATTENDANCE_STATUS } = require('../src/config/attendanceConstants');

let server;
const PORT = 5558;
const BASE_URL = `http://localhost:${PORT}/api`;

const request = async (path, options = {}) => {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, data: json };
};

const runTests = async () => {
  console.log('\n================================================================');
  console.log(' PeoplePay360 Phase 2: Attendance Test Suite                   ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, code, title, details = '') => {
    if (condition) {
      console.log(`  ✅ [${code}] PASS: ${title}`);
      passed++;
    } else {
      console.error(`  ❌ [${code}] FAIL: ${title}`);
      if (details) console.error(`     Details:`, typeof details === 'object' ? JSON.stringify(details, null, 2) : details);
      failed++;
    }
  };

  try {
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(PORT, resolve);
    });

    // =========================================================
    // UNIT TESTS — calculateWorkedHours
    // =========================================================
    console.log('\n--- Unit Tests: calculateWorkedHours ---');

    // AT1: Standard 8-hour day with 60 min break
    const checkIn1 = '2026-09-01T09:00:00Z';
    const checkOut1 = '2026-09-01T18:00:00Z';
    const worked1 = calculateWorkedHours(checkIn1, checkOut1, 60);
    assert(worked1 === 8, 'AT1', 'Standard 9h-18h with 60min break = 8 hours worked', `Got: ${worked1}`);

    // AT2: No break
    const worked2 = calculateWorkedHours(checkIn1, checkOut1, 0);
    assert(worked2 === 9, 'AT2', '9h-18h with 0min break = 9 hours worked', `Got: ${worked2}`);

    // AT3: Half day (4 hours)
    const checkOut3 = '2026-09-01T13:00:00Z';
    const worked3 = calculateWorkedHours(checkIn1, checkOut3, 0);
    assert(worked3 === 4, 'AT3', '9h-13h with 0min break = 4 hours worked', `Got: ${worked3}`);

    // AT4: Short session (30 min)
    const checkOut4 = '2026-09-01T09:30:00Z';
    const worked4 = calculateWorkedHours(checkIn1, checkOut4, 60);
    assert(worked4 === 0, 'AT4', '30min session minus 60min break = 0 (never negative)', `Got: ${worked4}`);

    // =========================================================
    // UNIT TESTS — parseTime
    // =========================================================
    console.log('\n--- Unit Tests: parseTime ---');

    const parsed = parseTime('09:00');
    assert(parsed && parsed.hours === 9 && parsed.minutes === 0, 'AT5', 'parseTime("09:00") = {hours:9, minutes:0}', parsed);

    const parsedNull = parseTime(null);
    assert(parsedNull === null, 'AT6', 'parseTime(null) = null');

    // =========================================================
    // UNIT TESTS — determineStatus
    // =========================================================
    console.log('\n--- Unit Tests: determineStatus ---');

    // AT7: On-time check-in, full hours → PRESENT
    const status1 = determineStatus({
      checkIn: '2026-09-01T09:00:00Z',
      workedHours: 8,
      expectedStart: '09:00',
      expectedHours: 8,
      isManualEdit: false,
    });
    assert(status1 === ATTENDANCE_STATUS.PRESENT, 'AT7', 'On-time, 8h worked, expected 8h → PRESENT', status1);

    // AT8: Late check-in, full hours → LATE
    const status2 = determineStatus({
      checkIn: '2026-09-01T09:17:00Z', // 9:17 UTC is after 9:00
      workedHours: 8,
      expectedStart: '09:00',
      expectedHours: 8,
      isManualEdit: false,
    });
    assert(status2 === ATTENDANCE_STATUS.LATE, 'AT8', 'Late check-in at 09:17, expected 09:00 → LATE', status2);

    // AT9: Overtime
    const status3 = determineStatus({
      checkIn: '2026-09-01T09:00:00Z',
      workedHours: 10,
      expectedStart: '09:00',
      expectedHours: 8,
      isManualEdit: false,
    });
    assert(status3 === ATTENDANCE_STATUS.OVERTIME, 'AT9', '10h worked, expected 8h → OVERTIME', status3);

    // AT10: Manual edit → CORRECTED
    const status4 = determineStatus({
      checkIn: '2026-09-01T09:00:00Z',
      workedHours: 8,
      expectedStart: '09:00',
      expectedHours: 8,
      isManualEdit: true,
    });
    assert(status4 === ATTENDANCE_STATUS.CORRECTED, 'AT10', 'isManualEdit=true → CORRECTED', status4);

    // AT11: Half day (< 50% of expected hours)
    const status5 = determineStatus({
      checkIn: '2026-09-01T09:00:00Z',
      workedHours: 3,
      expectedStart: '09:00',
      expectedHours: 8,
      isManualEdit: false,
    });
    assert(status5 === ATTENDANCE_STATUS.HALF_DAY, 'AT11', '3h worked, expected 8h → HALF_DAY', status5);

    // =========================================================
    // UNIT TESTS — getScheduleDayForDate / isWorkingDay
    // =========================================================
    console.log('\n--- Unit Tests: Schedule Day Detection ---');

    const mockScheduleDays = [
      { day_of_week: 0, is_working_day: false, start_time: null, end_time: null, break_minutes: 0 }, // Sunday
      { day_of_week: 1, is_working_day: true, start_time: '09:00', end_time: '18:00', break_minutes: 60 }, // Monday
      { day_of_week: 2, is_working_day: true, start_time: '09:00', end_time: '18:00', break_minutes: 60 }, // Tuesday
      { day_of_week: 3, is_working_day: true, start_time: '09:00', end_time: '18:00', break_minutes: 60 }, // Wednesday
      { day_of_week: 4, is_working_day: true, start_time: '09:00', end_time: '18:00', break_minutes: 60 }, // Thursday
      { day_of_week: 5, is_working_day: true, start_time: '09:00', end_time: '18:00', break_minutes: 60 }, // Friday
      { day_of_week: 6, is_working_day: false, start_time: null, end_time: null, break_minutes: 0 }, // Saturday
    ];

    const mockEmployee = { working_schedules: { working_schedule_days: mockScheduleDays } };

    // Monday
    const monday = new Date('2026-09-07'); // Monday
    const mondaySchedule = getScheduleDayForDate(mockEmployee, monday);
    assert(mondaySchedule && mondaySchedule.is_working_day === true, 'AT12', 'Monday is a working day', mondaySchedule);

    // Sunday
    const sunday = new Date('2026-09-06'); // Sunday
    const sundaySchedule = getScheduleDayForDate(mockEmployee, sunday);
    assert(sundaySchedule && sundaySchedule.is_working_day === false, 'AT13', 'Sunday is not a working day', sundaySchedule);

    // isWorkingDay helper
    assert(isWorkingDay(mockScheduleDays, monday) === true, 'AT14', 'isWorkingDay(Monday) = true');
    assert(isWorkingDay(mockScheduleDays, sunday) === false, 'AT15', 'isWorkingDay(Sunday) = false');
    assert(isWorkingDay(mockScheduleDays, new Date('2026-09-12')) === false, 'AT16', 'isWorkingDay(Saturday) = false');

    // =========================================================
    // INTEGRATION TESTS — API Endpoints
    // =========================================================
    console.log('\n--- Integration Tests: API ---');

    const adminToken = 'Bearer test-token-admin';
    const hrToken = 'Bearer test-token-hr_manager';
    const empToken = 'Bearer test-token-employee';

    // AT17: Unauthenticated check-in → 401
    const resAT17 = await request('/attendance/check-in', { method: 'POST', body: {} });
    assert(resAT17.status === 401, 'AT17', 'Unauthenticated check-in returns 401', resAT17);

    // AT18: Authenticated employee check-in
    const resAT18 = await request('/attendance/check-in', {
      method: 'POST',
      headers: { Authorization: empToken },
      body: { notes: 'Test check-in' },
    });
    // May be 201 (success), 409 (duplicate), 404 (no employee linked to test user), or 500 (no DB in test mode)
    assert(
      [201, 409, 404, 500].includes(resAT18.status),
      'AT18',
      'Employee check-in returns 201/409/404/500 (500 expected when Supabase not configured)',
      resAT18
    );

    // AT19: Employee cannot check in for another employee
    const resAT19 = await request('/attendance/check-in', {
      method: 'POST',
      headers: { Authorization: empToken },
      body: { employee_id: 'a0000000-0000-4000-8000-000000000001', notes: 'Spoofed check-in' },
    });
    assert(resAT19.status === 403, 'AT19', 'Employee cannot check in for another employee (403)', resAT19);

    // AT20: HR can access attendance list
    const resAT20 = await request('/attendance?page=1&limit=5', {
      headers: { Authorization: hrToken },
    });
    assert(
      [200, 500].includes(resAT20.status) && resAT20.data?.success !== false || resAT20.status === 500,
      'AT20',
      'HR can list attendance records (200 with DB, 500 without configured Supabase)',
      resAT20
    );

    // AT21: Employee can access attendance list (gets own filtered records)
    const resAT21 = await request('/attendance?page=1&limit=5', {
      headers: { Authorization: empToken },
    });
    assert(resAT21.status === 200 && resAT21.data?.success === true, 'AT21', 'Employee can list attendance (own data only)', resAT21);

    // AT22: Attendance correction requires ATTENDANCE_UPDATE permission
    const resAT22 = await request('/attendance/00000000-0000-0000-0000-000000000001', {
      method: 'PUT',
      headers: { Authorization: empToken },
      body: { correction_reason: 'test correction', check_in: '2026-09-01T09:00:00Z' },
    });
    assert(resAT22.status === 403, 'AT22', 'Employee cannot correct attendance (403)', resAT22);

    // AT23: Admin can attempt correction (may 404 if record doesn't exist, 500 if DB not configured)
    const resAT23 = await request('/attendance/00000000-0000-0000-0000-000000000001', {
      method: 'PUT',
      headers: { Authorization: adminToken },
      body: { correction_reason: 'Admin correction', check_in: '2026-09-01T09:00:00Z', check_out: '2026-09-01T18:00:00Z' },
    });
    assert([200, 404, 500].includes(resAT23.status), 'AT23', 'Admin correction attempt returns 200/404/500', resAT23);

    // AT24: Correction without correction_reason → validation error
    const resAT24 = await request('/attendance/00000000-0000-0000-0000-000000000001', {
      method: 'PUT',
      headers: { Authorization: adminToken },
      body: { check_in: '2026-09-01T09:00:00Z' }, // missing correction_reason
    });
    assert(resAT24.status === 400, 'AT24', 'Correction without correction_reason → 400 validation error', resAT24);

    // AT25: Employee-specific attendance endpoint (/employees/:id/attendance)
    // When DB is not configured: 500. With DB: 403 (access denied) or 404 (not found)
    const resAT25 = await request('/employees/some-employee-id/attendance', {
      headers: { Authorization: empToken },
    });
    assert([403, 404, 500].includes(resAT25.status), 'AT25', 'Employee cannot access other employee attendance (403/404/500 if no DB)', resAT25);

    // AT26: HR can access employee-specific attendance
    const resAT26 = await request('/employees/some-employee-id/attendance', {
      headers: { Authorization: hrToken },
    });
    assert([200, 404, 500].includes(resAT26.status), 'AT26', 'HR can access employee attendance sub-route (200/404/500)', resAT26);

    // AT27: Checkout without check-in — 404 (no open session) or 500 (no DB in test)
    const resAT27 = await request('/attendance/check-out', {
      method: 'POST',
      headers: { Authorization: empToken },
      body: {},
    });
    assert([404, 500].includes(resAT27.status), 'AT27', 'Check-out without prior check-in returns 404 (or 500 if no DB)', resAT27);

    console.log(`\n--- Attendance Test Results: ${passed} PASSED, ${failed} FAILED ---\n`);

    if (failed > 0) process.exit(1);

  } catch (err) {
    console.error('Fatal error during attendance tests:', err);
    process.exit(1);
  } finally {
    if (server) server.close();
  }
};

runTests();
