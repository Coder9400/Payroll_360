/**
 * Phase 5 Attendance Test Suite: Attendance, Regularization & Overtime
 *
 * Requirements Tested:
 * 1. normal attendance (check-in on time, checkout after full shift -> status = PRESENT, worked = expected)
 * 2. late arrival (check-in after scheduled shift start -> status = LATE)
 * 3. incomplete checkout (active check-in without check-out -> status = INCOMPLETE)
 * 4. overtime (worked minutes > expected minutes -> status = OVERTIME, overtime record generated)
 * 5. duplicate check-in & check-out without check-in (prevents multiple open records -> 409, 400)
 * 6. regularization approval (employee submits correction, manager approves, attendance updated)
 */

process.env.NODE_ENV = 'test';

const http = require('http');
const app = require('../src/app');
const attendanceService = require('../src/services/attendance.service');
const scheduleService = require('../src/services/schedule.service');

let server;
const PORT = 5560;
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
  console.log(' PeoplePay360 Phase 5: Attendance, Regularization & Overtime Test Suite        ');
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
  const empToken = 'Bearer test-token-employee';

  try {
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(PORT, resolve);
    });

    // Seed a standard working schedule (Mon-Fri 09:00 - 18:00, 60m break = 8h expected)
    const testSched = await scheduleService.createSchedule({
      name: 'Standard Phase 5 Schedule',
      code: `P5-SCHED-${Date.now().toString(36).toUpperCase()}`,
      days: [
        { day_of_week: 1, is_working_day: true, start_time: '09:00', end_time: '18:00', break_minutes: 60 },
        { day_of_week: 2, is_working_day: true, start_time: '09:00', end_time: '18:00', break_minutes: 60 },
        { day_of_week: 3, is_working_day: true, start_time: '09:00', end_time: '18:00', break_minutes: 60 },
        { day_of_week: 4, is_working_day: true, start_time: '09:00', end_time: '18:00', break_minutes: 60 },
        { day_of_week: 5, is_working_day: true, start_time: '09:00', end_time: '18:00', break_minutes: 60 },
        { day_of_week: 6, is_working_day: false, start_time: '00:00', end_time: '00:00', break_minutes: 0 },
        { day_of_week: 0, is_working_day: false, start_time: '00:00', end_time: '00:00', break_minutes: 0 },
      ],
    });

    // =========================================================================
    // 1. NORMAL ATTENDANCE (Check-in on time, Check-out after 8h -> PRESENT)
    // =========================================================================
    console.log('\n--- 1. Normal Attendance ---');

    const empNormalId = 'a1a8d3e2-1a4f-4b6c-8c1d-123456789101';
    await scheduleService.assignSchedule({
      employee_id: empNormalId,
      schedule_id: testSched.id,
      start_date: '2026-01-01',
    });

    // On-time check-in at 09:00
    const resNormalIn = await request('/attendance/check-in', {
      method: 'POST',
      headers: { Authorization: adminToken },
      body: {
        employee_id: empNormalId,
        check_in: '2026-09-07T09:00:00.000Z',
        notes: 'Morning shift start',
      },
    });
    assert(
      resNormalIn.status === 201 && resNormalIn.data?.data?.status === 'INCOMPLETE',
      'NORM-1',
      'On-time check-in recorded successfully with status INCOMPLETE',
      resNormalIn
    );

    // Check-out at 18:00 (9 hours elapsed - 1 hour break = 8 hours = 480 worked minutes)
    const resNormalOut = await request('/attendance/check-out', {
      method: 'POST',
      headers: { Authorization: adminToken },
      body: {
        employee_id: empNormalId,
        check_out: '2026-09-07T18:00:00.000Z',
        notes: 'End of normal day',
      },
    });
    const normalRecord = resNormalOut.data?.data;
    assert(
      resNormalOut.status === 200 &&
      normalRecord?.worked_minutes === 480 &&
      normalRecord?.expected_minutes === 480 &&
      normalRecord?.overtime_minutes === 0 &&
      normalRecord?.status === 'PRESENT',
      'NORM-2',
      'Normal check-out calculates 480 worked minutes, 0 overtime, and status PRESENT',
      normalRecord
    );

    // =========================================================================
    // 2. LATE ARRIVAL (Check-in after 09:00 -> LATE)
    // =========================================================================
    console.log('\n--- 2. Late Arrival ---');

    const empLateId = 'a2b8d3e2-1a4f-4b6c-8c1d-123456789102';
    await scheduleService.assignSchedule({
      employee_id: empLateId,
      schedule_id: testSched.id,
      start_date: '2026-01-01',
    });

    // Check in at 09:35 (35 minutes late for a 09:00 shift)
    const resLateIn = await request('/attendance/check-in', {
      method: 'POST',
      headers: { Authorization: adminToken },
      body: {
        employee_id: empLateId,
        check_in: '2026-09-07T09:35:00.000Z',
        notes: 'Traffic delay',
      },
    });
    assert(
      resLateIn.status === 201 && resLateIn.data?.data?.status === 'LATE',
      'LATE-1',
      'Late check-in (09:35) is automatically detected and marked as LATE',
      resLateIn
    );

    // Check out at 18:35
    const resLateOut = await request('/attendance/check-out', {
      method: 'POST',
      headers: { Authorization: adminToken },
      body: {
        employee_id: empLateId,
        check_out: '2026-09-07T18:35:00.000Z',
      },
    });
    assert(
      resLateOut.status === 200 && resLateOut.data?.data?.status === 'LATE',
      'LATE-2',
      'Check-out maintains LATE status when late arrival occurred',
      resLateOut.data?.data
    );

    // =========================================================================
    // 3. INCOMPLETE CHECKOUT (Active check-in without check-out)
    // =========================================================================
    console.log('\n--- 3. Incomplete Checkout ---');

    const empIncompleteId = 'a3c8d3e2-1a4f-4b6c-8c1d-123456789103';

    // Check in but do not check out
    const resIncompIn = await request('/attendance/check-in', {
      method: 'POST',
      headers: { Authorization: adminToken },
      body: {
        employee_id: empIncompleteId,
        check_in: '2026-09-08T09:00:00.000Z',
      },
    });
    const incompleteRec = resIncompIn.data?.data;
    assert(
      resIncompIn.status === 201 &&
      incompleteRec?.check_out === null &&
      incompleteRec?.worked_minutes === 0 &&
      incompleteRec?.status === 'INCOMPLETE',
      'INCOMP-1',
      'Active session without checkout has check_out null, worked_minutes 0, and status INCOMPLETE',
      incompleteRec
    );

    // =========================================================================
    // 4. OVERTIME (Worked minutes > expected minutes)
    // =========================================================================
    console.log('\n--- 4. Overtime Calculation ---');

    const empOvertimeId = 'a4d8d3e2-1a4f-4b6c-8c1d-123456789104';
    await scheduleService.assignSchedule({
      employee_id: empOvertimeId,
      schedule_id: testSched.id,
      start_date: '2026-01-01',
    });

    // Check in at 09:00
    await request('/attendance/check-in', {
      method: 'POST',
      headers: { Authorization: adminToken },
      body: {
        employee_id: empOvertimeId,
        check_in: '2026-09-07T09:00:00.000Z',
      },
    });

    // Check out at 20:00 (11 hours raw - 1 hour break = 10 hours = 600 min worked; expected = 480 min)
    // Overtime = 600 - 480 = 120 minutes (2 hours)
    const resOvertimeOut = await request('/attendance/check-out', {
      method: 'POST',
      headers: { Authorization: adminToken },
      body: {
        employee_id: empOvertimeId,
        check_out: '2026-09-07T20:00:00.000Z',
        notes: 'Project release overtime',
      },
    });
    const otRec = resOvertimeOut.data?.data;
    assert(
      resOvertimeOut.status === 200 &&
      otRec?.worked_minutes === 600 &&
      otRec?.expected_minutes === 480 &&
      otRec?.overtime_minutes === 120 &&
      otRec?.status === 'OVERTIME',
      'OT-1',
      'Check-out with extra hours computes 120 overtime minutes and sets status OVERTIME',
      otRec
    );

    // Verify overtime record is recorded and accessible via GET /api/attendance/overtime
    const resOtList = await request(`/attendance/overtime?employee_id=${empOvertimeId}`, {
      headers: { Authorization: adminToken },
    });
    assert(
      resOtList.status === 200 &&
      resOtList.data?.data?.length >= 1 &&
      resOtList.data?.data[0]?.overtime_minutes === 120,
      'OT-2',
      'GET /api/attendance/overtime returns the calculated overtime record',
      resOtList.data
    );

    // =========================================================================
    // 5. DUPLICATE CHECK-IN & INVALID CHECKOUT PREVENTION
    // =========================================================================
    console.log('\n--- 5. Duplicate Check-in & Invalid Checkout Prevention ---');

    const empDupId = 'a5e8d3e2-1a4f-4b6c-8c1d-123456789105';

    // Initial check in
    await request('/attendance/check-in', {
      method: 'POST',
      headers: { Authorization: adminToken },
      body: {
        employee_id: empDupId,
        check_in: '2026-09-08T09:00:00.000Z',
      },
    });

    // Attempting SECOND check in while first session is still open -> 409 Conflict
    const resDup = await request('/attendance/check-in', {
      method: 'POST',
      headers: { Authorization: adminToken },
      body: {
        employee_id: empDupId,
        check_in: '2026-09-08T09:30:00.000Z',
      },
    });
    assert(
      resDup.status === 409,
      'PREV-1',
      'Duplicate check-in while session is open is rejected with HTTP 409 CONFLICT',
      resDup
    );

    // Attempting check-out for an employee with NO open check-in -> 400 Bad Request
    const empNoCheckinId = 'a6f8d3e2-1a4f-4b6c-8c1d-123456789106';
    const resNoCheckinOut = await request('/attendance/check-out', {
      method: 'POST',
      headers: { Authorization: adminToken },
      body: {
        employee_id: empNoCheckinId,
        check_out: '2026-09-08T18:00:00.000Z',
      },
    });
    assert(
      resNoCheckinOut.status === 400,
      'PREV-2',
      'Check-out without active check-in is rejected with HTTP 400 BAD_REQUEST',
      resNoCheckinOut
    );

    // =========================================================================
    // 6. REGULARIZATION REQUEST & APPROVAL LIFECYCLE
    // =========================================================================
    console.log('\n--- 6. Regularization Request & Approval Lifecycle ---');

    // Use the incomplete record from earlier (empIncompleteId)
    const attIdToRegularize = incompleteRec.id;

    // Submit regularization request for missed checkout
    const resRegSubmit = await request('/attendance/regularization', {
      method: 'POST',
      headers: { Authorization: adminToken },
      body: {
        attendance_id: attIdToRegularize,
        employee_id: empIncompleteId,
        requested_check_in: '2026-09-08T09:00:00.000Z',
        requested_check_out: '2026-09-08T18:00:00.000Z',
        reason: 'Forgot to punch out due to client meeting offsite',
      },
    });
    const regRequest = resRegSubmit.data?.data;
    assert(
      resRegSubmit.status === 201 && regRequest?.status === 'PENDING',
      'REG-1',
      'Employee submits regularization request with status PENDING',
      regRequest
    );

    // List regularization requests
    const resRegList = await request('/attendance/regularization', {
      headers: { Authorization: adminToken },
    });
    assert(
      resRegList.status === 200 && resRegList.data?.data?.length >= 1,
      'REG-2',
      'GET /api/attendance/regularization lists pending requests for HR/managers',
      resRegList.data
    );

    // Approve regularization request
    const resRegApprove = await request(`/attendance/regularization/${regRequest.id}/approve`, {
      method: 'POST',
      headers: { Authorization: hrToken },
      body: {},
    });
    const approvedData = resRegApprove.data?.data;
    assert(
      resRegApprove.status === 200 &&
      approvedData?.request?.status === 'APPROVED' &&
      approvedData?.attendance?.status === 'PRESENT' &&
      approvedData?.attendance?.worked_minutes === 480,
      'REG-3',
      'Approving regularization updates request to APPROVED and recalculates attendance to PRESENT (480 mins)',
      approvedData
    );

    // Test rejection lifecycle on a second request
    const empRejectId = 'a7a8d3e2-1a4f-4b6c-8c1d-123456789107';
    const checkinForReject = await attendanceService.checkIn({
      employeeId: empRejectId,
      checkInTime: '2026-09-08T09:00:00.000Z',
    });
    const regToReject = await attendanceService.createRegularizationRequest({
      attendanceId: checkinForReject.id,
      employeeId: empRejectId,
      requestedCheckIn: '2026-09-08T09:00:00.000Z',
      requestedCheckOut: '2026-09-08T18:00:00.000Z',
      reason: 'No evidence of work',
      requestedBy: 'a0000000-0000-4000-8000-000000000005',
    });
    const resRegReject = await request(`/attendance/regularization/${regToReject.id}/reject`, {
      method: 'POST',
      headers: { Authorization: hrToken },
      body: { rejection_reason: 'Invalid request proof' },
    });
    assert(
      resRegReject.status === 200 && resRegReject.data?.data?.status === 'REJECTED',
      'REG-4',
      'Rejecting regularization updates request status to REJECTED',
      resRegReject.data?.data
    );

    // =========================================================================
    // 7. ATTENDANCE HISTORY & EMPLOYEE SUB-ROUTE
    // =========================================================================
    console.log('\n--- 7. Attendance History & Employee Sub-Route ---');

    const resHistory = await request('/attendance/history?limit=10', {
      headers: { Authorization: adminToken },
    });
    assert(
      resHistory.status === 200 && resHistory.data?.data?.length >= 3,
      'HIST-1',
      'GET /api/attendance/history returns list of attendance records',
      resHistory.data
    );

    const resEmpSubroute = await request(`/employees/${empNormalId}/attendance`, {
      headers: { Authorization: adminToken },
    });
    assert(
      resEmpSubroute.status === 200 && resEmpSubroute.data?.data?.length >= 1,
      'HIST-2',
      'GET /api/employees/:id/attendance returns attendance history for employee',
      resEmpSubroute.data
    );

    // =========================================================================
    // 8. SECURITY & IDOR PROTECTION (Required Phase 5 Security Scenarios)
    // =========================================================================
    console.log('\n--- 8. Security & IDOR Protection Tests ---');

    // TEST 1: Employee self-service check-in succeeds
    const resEmpSelfIn = await request('/attendance/check-in', {
      method: 'POST',
      headers: { Authorization: empToken },
      body: {
        check_in: '2026-09-09T09:00:00.000Z',
        notes: 'Employee self check-in',
      },
    });
    assert(
      resEmpSelfIn.status === 201 && resEmpSelfIn.data?.data?.status === 'INCOMPLETE',
      'SEC-1',
      'Employee self-service check-in succeeds using verified authenticated identity',
      resEmpSelfIn.data
    );

    // TEST 2: Employee attempts IDOR check-in using another employee ID -> 403 Forbidden
    const resIdorIn = await request('/attendance/check-in', {
      method: 'POST',
      headers: { Authorization: empToken },
      body: {
        employee_id: empNormalId, // Target different employee
        check_in: '2026-09-09T09:00:00.000Z',
      },
    });
    assert(
      resIdorIn.status === 403,
      'SEC-2',
      'Employee attempting to check in on behalf of another employee is rejected with HTTP 403 FORBIDDEN',
      resIdorIn
    );

    // TEST 3: Employee attempts to read another employee attendance history -> 403 Forbidden
    const resIdorHistory = await request(`/attendance/history?employee_id=${empNormalId}`, {
      headers: { Authorization: empToken },
    });
    assert(
      resIdorHistory.status === 403,
      'SEC-3',
      'Employee requesting another employee attendance history is rejected with HTTP 403 FORBIDDEN',
      resIdorHistory
    );

    // TEST 4: Employee requests own history without params -> 200 OK scoped strictly to own records
    const resOwnHistory = await request('/attendance/history', {
      headers: { Authorization: empToken },
    });
    const ownRecords = resOwnHistory.data?.data || [];
    const containsOtherEmployee = ownRecords.some((r) => r.employee_id === empNormalId);
    assert(
      resOwnHistory.status === 200 && !containsOtherEmployee,
      'SEC-4',
      'Employee requests own attendance history and receives only their own records (no cross-employee leakage)',
      { count: ownRecords.length, containsOtherEmployee }
    );

    // TEST 5: Employee attempts check-out for another employee -> 403 Forbidden
    const resIdorOut = await request('/attendance/check-out', {
      method: 'POST',
      headers: { Authorization: empToken },
      body: {
        employee_id: empNormalId,
        check_out: '2026-09-09T18:00:00.000Z',
      },
    });
    assert(
      resIdorOut.status === 403,
      'SEC-5',
      'Employee attempting to check out for another employee is rejected with HTTP 403 FORBIDDEN',
      resIdorOut
    );

    // TEST 6: Unauthorized request without bearer token -> 401 Unauthorized
    const resUnauth = await request('/attendance/history');
    assert(
      resUnauth.status === 401,
      'SEC-6',
      'Unauthenticated request without token is rejected with HTTP 401 UNAUTHORIZED',
      resUnauth
    );

    // TEST 7: Authenticated user with insufficient permissions -> 403 Forbidden
    // (Employee attempting to approve regularization)
    const resInsuffPerm = await request(`/attendance/regularization/${regRequest.id}/approve`, {
      method: 'POST',
      headers: { Authorization: empToken },
      body: {},
    });
    assert(
      resInsuffPerm.status === 403,
      'SEC-7',
      'Employee attempting manager approval is rejected with HTTP 403 FORBIDDEN (RBAC enforcement)',
      resInsuffPerm
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
