/**
 * Phase 4 Test Suite: Contracts and Working Schedules
 *
 * Requirements Tested:
 * 1. historical contract (employee historical contracts tracking, chronological retrieval)
 * 2. active contract (resolving applicable active contract for a payroll period)
 * 3. expired contract (detecting expired contracts and returning 404 when no active contract covers payroll)
 * 4. overlapping contracts (preventing overlapping active contracts, detecting multiple overlaps -> 409 CONFLICT)
 * 5. schedule weekly-hours calculation (automatic daily & weekly hours calculation, overnight shifts, assignment)
 */

process.env.NODE_ENV = 'test';

const http = require('http');
const app = require('../src/app');
const contractService = require('../src/services/contract.service');
const scheduleService = require('../src/services/schedule.service');

let server;
const PORT = 5559;
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
  console.log('\n================================================================================');
  console.log(' PeoplePay360 Phase 4: Contracts and Working Schedules Test Suite             ');
  console.log('================================================================================\n');

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

  const adminToken = 'Bearer test-token-admin';
  const hrToken = 'Bearer test-token-hr_manager';

  try {
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(PORT, resolve);
    });

    // =========================================================================
    // 5. SCHEDULE WEEKLY-HOURS CALCULATION (UNIT & SERVICE & INTEGRATION)
    // =========================================================================
    console.log('\n--- 5. Schedule Weekly-Hours Automatic Calculation ---');

    // TEST 5.1: Standard 40h work week (Mon-Fri 09:00 - 18:00, 60min break = 8h/day * 5 = 40h)
    const scheduleData1 = {
      name: 'Standard 40-Hour Week',
      code: `SCHED-40H-${Date.now().toString(36).toUpperCase()}`,
      description: 'Standard 40 hours work schedule',
      days: [
        { day_of_week: 1, is_working_day: true, start_time: '09:00', end_time: '18:00', break_minutes: 60 },
        { day_of_week: 2, is_working_day: true, start_time: '09:00', end_time: '18:00', break_minutes: 60 },
        { day_of_week: 3, is_working_day: true, start_time: '09:00', end_time: '18:00', break_minutes: 60 },
        { day_of_week: 4, is_working_day: true, start_time: '09:00', end_time: '18:00', break_minutes: 60 },
        { day_of_week: 5, is_working_day: true, start_time: '09:00', end_time: '18:00', break_minutes: 60 },
        { day_of_week: 6, is_working_day: false, start_time: '00:00', end_time: '00:00', break_minutes: 0 },
        { day_of_week: 0, is_working_day: false, start_time: '00:00', end_time: '00:00', break_minutes: 0 },
      ],
    };

    const createdSchedule1 = await scheduleService.createSchedule(scheduleData1);
    const weeklyHours1 = createdSchedule1.hours_week || createdSchedule1.weekly_expected_hours;
    assert(
      weeklyHours1 === 40,
      'SCHED-1',
      'Mon-Fri 9:00-18:00 (60m break) auto-calculates to exactly 40.00 weekly hours',
      `Got: ${weeklyHours1}`
    );

    // TEST 5.2: 35-Hour Week (Mon-Fri 09:00 - 17:00, 60min break = 7h/day * 5 = 35h) via API POST
    const scheduleData2 = {
      name: '35-Hour Flexible Week',
      code: `SCHED-35H-${Date.now().toString(36).toUpperCase()}`,
      description: '35 hours per week',
      days: [
        { day_of_week: 1, is_working_day: true, start_time: '09:00', end_time: '17:00', break_minutes: 60 },
        { day_of_week: 2, is_working_day: true, start_time: '09:00', end_time: '17:00', break_minutes: 60 },
        { day_of_week: 3, is_working_day: true, start_time: '09:00', end_time: '17:00', break_minutes: 60 },
        { day_of_week: 4, is_working_day: true, start_time: '09:00', end_time: '17:00', break_minutes: 60 },
        { day_of_week: 5, is_working_day: true, start_time: '09:00', end_time: '17:00', break_minutes: 60 },
      ],
    };

    const resSchedApi = await request('/schedules', {
      method: 'POST',
      headers: { Authorization: adminToken },
      body: scheduleData2,
    });

    const createdSchedApi = resSchedApi.data?.data;
    const weeklyHours2 = createdSchedApi?.hours_week || createdSchedApi?.weekly_expected_hours;
    assert(
      resSchedApi.status === 201 && weeklyHours2 === 35,
      'SCHED-2',
      'POST /api/schedules automatically computes weekly expected hours (35.00 hrs) and returns HTTP 201',
      resSchedApi
    );

    // TEST 5.3: Overnight shift calculation (22:00 to 06:00, 60min break = 7h/day)
    const scheduleOvernight = {
      name: 'Night Shift Schedule',
      code: `SCHED-NIGHT-${Date.now().toString(36).toUpperCase()}`,
      days: [
        { day_of_week: 1, is_working_day: true, start_time: '22:00', end_time: '06:00', break_minutes: 60 },
        { day_of_week: 2, is_working_day: true, start_time: '22:00', end_time: '06:00', break_minutes: 60 },
        { day_of_week: 3, is_working_day: true, start_time: '22:00', end_time: '06:00', break_minutes: 60 },
        { day_of_week: 4, is_working_day: true, start_time: '22:00', end_time: '06:00', break_minutes: 60 },
      ],
    };
    const createdNightSched = await scheduleService.createSchedule(scheduleOvernight);
    const nightHours = createdNightSched.hours_week || createdNightSched.weekly_expected_hours;
    assert(
      nightHours === 28,
      'SCHED-3',
      'Overnight shifts across midnight (22:00-06:00 with 60m break = 7h * 4 days = 28h) correctly calculated',
      `Got: ${nightHours}`
    );

    // TEST 5.4: PUT /api/schedules/:id updates schedule and recalculates weekly hours
    const resSchedPut = await request(`/schedules/${createdSchedule1.id}`, {
      method: 'PUT',
      headers: { Authorization: adminToken },
      body: {
        name: 'Standard 40-Hour Week (Updated to 4-day 32h)',
        days: [
          { day_of_week: 1, is_working_day: true, start_time: '09:00', end_time: '18:00', break_minutes: 60 },
          { day_of_week: 2, is_working_day: true, start_time: '09:00', end_time: '18:00', break_minutes: 60 },
          { day_of_week: 3, is_working_day: true, start_time: '09:00', end_time: '18:00', break_minutes: 60 },
          { day_of_week: 4, is_working_day: true, start_time: '09:00', end_time: '18:00', break_minutes: 60 },
        ],
      },
    });
    const putWeeklyHours = resSchedPut.data?.data?.hours_week || resSchedPut.data?.data?.weekly_expected_hours;
    assert(
      resSchedPut.status === 200 && putWeeklyHours === 32,
      'SCHED-4',
      'PUT /api/schedules/:id automatically recalculates weekly expected hours (4 days * 8h = 32h)',
      resSchedPut
    );

    // TEST 5.5: Schedule Assignment to Employee
    const testEmployeeId = 'e1a8d3e2-1a4f-4b6c-8c1d-123456789001';
    const resAssign = await request('/schedules/assign', {
      method: 'POST',
      headers: { Authorization: adminToken },
      body: {
        employee_id: testEmployeeId,
        schedule_id: createdSchedule1.id,
        start_date: '2026-01-01',
      },
    });
    assert(
      resAssign.status === 201 && resAssign.data?.success === true,
      'SCHED-5',
      'POST /api/schedules/assign successfully assigns working schedule to employee',
      resAssign
    );

    // TEST 5.6: Fetch active employee schedule
    const resGetEmpSched = await request(`/schedules/employee/${testEmployeeId}?date=2026-09-01`, {
      headers: { Authorization: adminToken },
    });
    assert(
      resGetEmpSched.status === 200 && resGetEmpSched.data?.data?.schedule_id === createdSchedule1.id,
      'SCHED-6',
      'GET /api/schedules/employee/:employeeId returns assigned schedule for given date',
      resGetEmpSched
    );

    // =========================================================================
    // 1. HISTORICAL CONTRACTS
    // =========================================================================
    console.log('\n--- 1. Historical Contracts Support ---');

    const empHistId = 'e2b8d3e2-1a4f-4b6c-8c1d-123456789002';

    // Contract 1: Historical 2024
    const contract2024 = await contractService.createContract({
      employee_id: empHistId,
      contract_type: 'FULL_TIME',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      wage: 45000,
      salary_structure_id: 'b1a8d3e2-1a4f-4b6c-8c1d-123456789099',
      status: 'EXPIRED',
    });

    // Contract 2: Historical 2025
    const contract2025 = await contractService.createContract({
      employee_id: empHistId,
      contract_type: 'FULL_TIME',
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      wage: 52000,
      salary_structure_id: 'b1a8d3e2-1a4f-4b6c-8c1d-123456789099',
      status: 'EXPIRED',
    });

    // Contract 3: Current 2026
    const contract2026 = await contractService.createContract({
      employee_id: empHistId,
      contract_type: 'FULL_TIME',
      start_date: '2026-01-01',
      end_date: null,
      wage: 60000,
      salary_structure_id: 'b1a8d3e2-1a4f-4b6c-8c1d-123456789099',
      status: 'ACTIVE',
    });

    // Verify history service orders newest start_date first
    const history = await contractService.getEmployeeContractHistory(empHistId);
    assert(
      history.length >= 3 &&
      history[0].start_date === '2026-01-01' &&
      history[1].start_date === '2025-01-01' &&
      history[2].start_date === '2024-01-01',
      'HIST-1',
      'getEmployeeContractHistory returns all historical contracts ordered by start_date DESC',
      history.map((c) => ({ start: c.start_date, wage: c.wage, status: c.status }))
    );

    // Verify API endpoint for contract history
    const resHistApi = await request(`/contracts/employee/${empHistId}`, {
      headers: { Authorization: adminToken },
    });
    assert(
      resHistApi.status === 200 && resHistApi.data?.data?.length >= 3,
      'HIST-2',
      'GET /api/contracts/employee/:employeeId returns full contract history via API',
      resHistApi
    );

    // =========================================================================
    // 2. ACTIVE CONTRACT RESOLUTION (getApplicableContract)
    // =========================================================================
    console.log('\n--- 2. Active Contract Resolution ---');

    // Resolving for September 2026 payroll period (2026-09-01 to 2026-09-30)
    const applicableSep2026 = await contractService.getApplicableContract(
      empHistId,
      '2026-09-01',
      '2026-09-30'
    );
    assert(
      applicableSep2026 &&
      applicableSep2026.id === contract2026.id &&
      applicableSep2026.wage === 60000,
      'ACT-1',
      'getApplicableContract returns the active contract in effect for September 2026',
      applicableSep2026
    );

    // API endpoint for applicable contract
    const resAppApi = await request(
      `/contracts/applicable/${empHistId}?startDate=2026-09-01&endDate=2026-09-30`,
      { headers: { Authorization: adminToken } }
    );
    assert(
      resAppApi.status === 200 &&
      resAppApi.data?.data?.id === contract2026.id &&
      resAppApi.data?.data?.status === 'ACTIVE',
      'ACT-2',
      'GET /api/contracts/applicable/:employeeId returns active applicable contract with HTTP 200',
      resAppApi
    );

    // PUT /api/contracts/:id to update contract wage
    const resContractPut = await request(`/contracts/${contract2026.id}`, {
      method: 'PUT',
      headers: { Authorization: adminToken },
      body: { wage: 65000 },
    });
    assert(
      resContractPut.status === 200 && resContractPut.data?.data?.wage === 65000,
      'ACT-3',
      'PUT /api/contracts/:id updates contract details (e.g. wage bump to 65000) successfully',
      resContractPut
    );

    // =========================================================================
    // 3. EXPIRED CONTRACT HANDLING
    // =========================================================================
    console.log('\n--- 3. Expired Contract Handling ---');

    const empExpiredId = 'e3c8d3e2-1a4f-4b6c-8c1d-123456789003';

    // Create a contract that expired in August 2025
    await contractService.createContract({
      employee_id: empExpiredId,
      contract_type: 'FULL_TIME',
      start_date: '2025-01-01',
      end_date: '2025-08-31',
      wage: 40000,
      status: 'EXPIRED',
    });

    // Resolving for September 2026 payroll should reject with 404 (Contract expired)
    let expiredRejected = false;
    let expiredErrorCode = null;
    try {
      await contractService.getApplicableContract(empExpiredId, '2026-09-01', '2026-09-30');
    } catch (err) {
      expiredRejected = true;
      expiredErrorCode = err.statusCode;
    }
    assert(
      expiredRejected && expiredErrorCode === 404,
      'EXP-1',
      'getApplicableContract rejects expired contract with HTTP 404 (No active contract covers period)',
      `Status: ${expiredErrorCode}`
    );

    // Test via API route
    const resExpiredApi = await request(
      `/contracts/applicable/${empExpiredId}?startDate=2026-09-01&endDate=2026-09-30`,
      { headers: { Authorization: adminToken } }
    );
    assert(
      resExpiredApi.status === 404,
      'EXP-2',
      'GET /api/contracts/applicable/:employeeId returns HTTP 404 when contract is expired',
      resExpiredApi
    );

    // Employee with no contracts at all returns 404
    const nonExistentEmpId = 'e4d8d3e2-1a4f-4b6c-8c1d-123456789099';
    const resNoContract = await request(
      `/contracts/applicable/${nonExistentEmpId}?startDate=2026-09-01&endDate=2026-09-30`,
      { headers: { Authorization: adminToken } }
    );
    assert(
      resNoContract.status === 404,
      'EXP-3',
      'GET /api/contracts/applicable/:employeeId returns HTTP 404 when employee has no contracts',
      resNoContract
    );

    // =========================================================================
    // 4. OVERLAPPING CONTRACTS PREVENTION & DETECTION
    // =========================================================================
    console.log('\n--- 4. Overlapping Contracts Handling ---');

    const empOverlapId = 'e5e8d3e2-1a4f-4b6c-8c1d-123456789005';

    // Create First Active Contract: 2026-01-01 to 2026-12-31
    const baseContract = await contractService.createContract({
      employee_id: empOverlapId,
      contract_type: 'FULL_TIME',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      wage: 50000,
      status: 'ACTIVE',
    });
    assert(baseContract && baseContract.id, 'OVR-1', 'Initial active contract created successfully');

    // Attempting to create a SECOND active contract overlapping with the first (2026-06-01 to 2026-12-31)
    let overlapCreationRejected = false;
    let overlapStatusCode = null;
    try {
      await contractService.createContract({
        employee_id: empOverlapId,
        contract_type: 'FULL_TIME',
        start_date: '2026-06-01',
        end_date: '2026-12-31',
        wage: 55000,
        status: 'ACTIVE',
      });
    } catch (err) {
      overlapCreationRejected = true;
      overlapStatusCode = err.statusCode;
    }
    assert(
      overlapCreationRejected && overlapStatusCode === 409,
      'OVR-2',
      'createContract rejects overlapping active contract with HTTP 409 Conflict',
      `Status: ${overlapStatusCode}`
    );

    // Test overlap prevention via API POST /api/contracts
    const resOverlapApi = await request('/contracts', {
      method: 'POST',
      headers: { Authorization: adminToken },
      body: {
        employee_id: empOverlapId,
        contract_type: 'FULL_TIME',
        start_date: '2026-03-01',
        end_date: '2026-09-30',
        wage: 55000,
        status: 'ACTIVE',
      },
    });
    assert(
      resOverlapApi.status === 409,
      'OVR-3',
      'POST /api/contracts rejects overlapping contract with HTTP 409 CONFLICT',
      resOverlapApi
    );

    // =========================================================================
    // FINAL SUMMARY
    // =========================================================================
    console.log('\n================================================================================');
    console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during test execution:', err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
  }
};

runTests();
