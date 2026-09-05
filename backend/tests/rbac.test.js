/**
 * Comprehensive Automated RBAC & Auth Test Suite
 * Tests all role boundaries, token validation, 401 unauthenticated, and 403 forbidden responses.
 * Also covers Phase 3: Employee & Organization Management API integration.
 */

process.env.NODE_ENV = 'test';

const http = require('http');
const app = require('../src/app');

let server;
const PORT = 5555;
const BASE_URL = `http://localhost:${PORT}/api`;

const request = async (path, options = {}) => {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const json = await res.json().catch(() => null);
  return {
    status: res.status,
    data: json,
  };
};

const runTests = async () => {
  console.log('\n======================================================');
  console.log(' Starting PeoplePay360 RBAC & Auth Verification Suite ');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, title, details = '') => {
    if (condition) {
      console.log(`  ✅ PASS: ${title}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${title}`);
      if (details) console.error(`     Details:`, details);
      failed++;
    }
  };

  try {
    // Start test server
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(PORT, resolve);
    });

    // ─────────────────────────────────────────────────────────
    // Suite 1: Public & Unauthenticated Access Rules
    // ─────────────────────────────────────────────────────────
    console.log(`[Suite 1]: Public & Unauthenticated Access Rules`);

    const pubRes = await request('/test/public');
    assert(pubRes.status === 200 && pubRes.data?.success === true,
      'Public endpoint is accessible without authentication (HTTP 200)');

    const unauthRes = await request('/test/authenticated');
    assert(
      unauthRes.status === 401 &&
      unauthRes.data?.success === false &&
      unauthRes.data?.error?.code === 'UNAUTHORIZED',
      'Unauthenticated request returns HTTP 401 and UNAUTHORIZED code',
      unauthRes
    );

    // ─────────────────────────────────────────────────────────
    // Suite 2: Employee Role Boundary Rules
    // ─────────────────────────────────────────────────────────
    console.log(`\n[Suite 2]: Employee Role Boundary Rules`);
    const empToken = 'Bearer test-token-employee';

    const empPortalRes = await request('/test/employee-only', { headers: { Authorization: empToken } });
    assert(empPortalRes.status === 200 && empPortalRes.data?.success === true,
      'Employee can access employee portal (HTTP 200)');

    const empPayrollRes = await request('/test/payroll-access', { headers: { Authorization: empToken } });
    assert(
      empPayrollRes.status === 403 &&
      empPayrollRes.data?.success === false &&
      empPayrollRes.data?.error?.code === 'FORBIDDEN',
      'Employee CANNOT access payroll management (HTTP 403 FORBIDDEN)',
      empPayrollRes
    );

    const empHrRes = await request('/test/hr-access', { headers: { Authorization: empToken } });
    assert(empHrRes.status === 403 && empHrRes.data?.error?.code === 'FORBIDDEN',
      'Employee CANNOT access company-wide HR management (HTTP 403 FORBIDDEN)');

    // ─────────────────────────────────────────────────────────
    // Suite 3: HR Manager Role Boundary Rules
    // ─────────────────────────────────────────────────────────
    console.log(`\n[Suite 3]: HR Manager Role Boundary Rules`);
    const hrToken = 'Bearer test-token-hr_manager';

    const hrAccessRes = await request('/test/hr-access', { headers: { Authorization: hrToken } });
    assert(hrAccessRes.status === 200 && hrAccessRes.data?.success === true,
      'HR Manager CAN access HR records and management (HTTP 200)');

    const hrPayrollRes = await request('/test/payroll-access', { headers: { Authorization: hrToken } });
    assert(
      hrPayrollRes.status === 403 &&
      hrPayrollRes.data?.success === false &&
      hrPayrollRes.data?.error?.code === 'FORBIDDEN',
      'HR Manager CANNOT access payroll management (HTTP 403 FORBIDDEN)',
      hrPayrollRes
    );

    // ─────────────────────────────────────────────────────────
    // Suite 4: HR Payroll User Role Boundary Rules
    // ─────────────────────────────────────────────────────────
    console.log(`\n[Suite 4]: HR Payroll User Role Boundary Rules`);
    const payrollUserToken = 'Bearer test-token-hr_payroll_user';

    const puPayrollRes = await request('/test/payroll-access', { headers: { Authorization: payrollUserToken } });
    assert(puPayrollRes.status === 200 && puPayrollRes.data?.success === true,
      'HR Payroll User CAN access payroll management (HTTP 200)');

    const puProcessRes = await request('/test/payroll-process', { headers: { Authorization: payrollUserToken } });
    assert(puProcessRes.status === 200 && puProcessRes.data?.success === true,
      'HR Payroll User CAN execute payroll processing (HTTP 200)');

    const puStructureRes = await request('/test/salary-structure-manage', { headers: { Authorization: payrollUserToken } });
    assert(
      puStructureRes.status === 403 &&
      puStructureRes.data?.success === false &&
      puStructureRes.data?.error?.code === 'FORBIDDEN',
      'HR Payroll User CANNOT manage salary structures (HTTP 403 FORBIDDEN)',
      puStructureRes
    );

    // ─────────────────────────────────────────────────────────
    // Suite 5: HR Payroll Manager Role Boundary Rules
    // ─────────────────────────────────────────────────────────
    console.log(`\n[Suite 5]: HR Payroll Manager Role Boundary Rules`);
    const payrollMgrToken = 'Bearer test-token-hr_payroll_manager';

    const pmHrRes = await request('/test/hr-access', { headers: { Authorization: payrollMgrToken } });
    assert(pmHrRes.status === 200 && pmHrRes.data?.success === true,
      'HR Payroll Manager has full HR control (HTTP 200)');

    const pmPayrollRes = await request('/test/payroll-access', { headers: { Authorization: payrollMgrToken } });
    assert(pmPayrollRes.status === 200 && pmPayrollRes.data?.success === true,
      'HR Payroll Manager has full Payroll control (HTTP 200)');

    const pmStructureRes = await request('/test/salary-structure-manage', { headers: { Authorization: payrollMgrToken } });
    assert(pmStructureRes.status === 200 && pmStructureRes.data?.success === true,
      'HR Payroll Manager CAN manage salary structures (HTTP 200)');

    // ─────────────────────────────────────────────────────────
    // Suite 6: Admin Superuser Boundary Rules
    // ─────────────────────────────────────────────────────────
    console.log(`\n[Suite 6]: Admin Superuser Boundary Rules`);
    const adminToken = 'Bearer test-token-admin';

    const adminConsoleRes = await request('/test/admin-only', { headers: { Authorization: adminToken } });
    assert(adminConsoleRes.status === 200 && adminConsoleRes.data?.success === true,
      'Admin CAN access Admin console (HTTP 200)');

    const adminHr     = await request('/test/hr-access',              { headers: { Authorization: adminToken } });
    const adminPay    = await request('/test/payroll-access',          { headers: { Authorization: adminToken } });
    const adminStruct = await request('/test/salary-structure-manage', { headers: { Authorization: adminToken } });
    assert(
      adminHr.status === 200 && adminPay.status === 200 && adminStruct.status === 200,
      'Admin has superuser access to EVERYTHING (HR, Payroll, Salary Structures) (HTTP 200)'
    );

    // ─────────────────────────────────────────────────────────
    // Suite 7: Auth Endpoints & Profile Mapping
    // ─────────────────────────────────────────────────────────
    console.log(`\n[Suite 7]: Auth Endpoints & Profile Mapping`);

    const rolesRes = await request('/auth/roles');
    assert(rolesRes.status === 200 && Array.isArray(rolesRes.data?.data) && rolesRes.data?.data.length === 5,
      'GET /api/auth/roles returns the 5 system roles');

    const meRes = await request('/auth/me', { headers: { Authorization: payrollUserToken } });
    assert(
      meRes.status === 200 &&
      meRes.data?.data?.roles?.includes('hr_payroll_user') &&
      Array.isArray(meRes.data?.data?.permissions) &&
      meRes.data?.data?.permissions.includes('payroll:process'),
      'GET /api/auth/me returns mapped user profile, roles, and granular permissions list'
    );

    // ─────────────────────────────────────────────────────────
    // Suite 8: Phase 3 — Employee & Organization Management API
    // ─────────────────────────────────────────────────────────
    console.log(`\n[Suite 8]: Phase 3 — Employee & Organization Management`);

    // Test 18: GET /api/departments — unauthenticated -> 401
    const deptUnauthRes = await request('/departments');
    assert(
      deptUnauthRes.status === 401 && deptUnauthRes.data?.error?.code === 'UNAUTHORIZED',
      'GET /api/departments without auth returns HTTP 401 UNAUTHORIZED'
    );

    // Test 19: GET /api/departments — employee -> 403 (no employee:read on base employee role)
    const deptEmpRes = await request('/departments', { headers: { Authorization: empToken } });
    assert(
      deptEmpRes.status === 403 && deptEmpRes.data?.error?.code === 'FORBIDDEN',
      'Employee CANNOT list departments (HTTP 403 FORBIDDEN)'
    );

    // Test 20: GET /api/departments — HR Manager -> 200 with demo data
    const deptHrRes = await request('/departments', { headers: { Authorization: hrToken } });
    assert(
      deptHrRes.status === 200 &&
      deptHrRes.data?.success === true &&
      Array.isArray(deptHrRes.data?.data) &&
      deptHrRes.data?.data.length >= 2,
      'HR Manager CAN list departments and receives seeded demo data (HTTP 200)',
      deptHrRes
    );

    // Test 21: POST /api/departments — employee -> 403
    const deptCreateEmpRes = await request('/departments', {
      method: 'POST',
      headers: { Authorization: empToken },
      body: { name: 'Hacking Dept', description: 'Should not work' },
    });
    assert(
      deptCreateEmpRes.status === 403 && deptCreateEmpRes.data?.error?.code === 'FORBIDDEN',
      'Employee CANNOT create departments (HTTP 403 FORBIDDEN)'
    );

    // Test 22: POST /api/departments — HR Manager -> 201
    const newDeptName = `Test Dept ${Date.now()}`;
    const deptCreateRes = await request('/departments', {
      method: 'POST',
      headers: { Authorization: hrToken },
      body: { name: newDeptName, description: 'Integration test department' },
    });
    assert(
      deptCreateRes.status === 201 &&
      deptCreateRes.data?.success === true &&
      deptCreateRes.data?.data?.name === newDeptName,
      'HR Manager CAN create a department (HTTP 201)',
      deptCreateRes
    );

    // Test 23: GET /api/positions — HR Manager -> 200 with demo data
    const posRes = await request('/positions', { headers: { Authorization: hrToken } });
    assert(
      posRes.status === 200 &&
      posRes.data?.success === true &&
      Array.isArray(posRes.data?.data) &&
      posRes.data?.data.length >= 5,
      'HR Manager CAN list positions and receives seeded demo data (HTTP 200)',
      posRes
    );

    // Test 24: GET /api/employees — unauthenticated -> 401
    const empListUnauthRes = await request('/employees');
    assert(
      empListUnauthRes.status === 401 && empListUnauthRes.data?.error?.code === 'UNAUTHORIZED',
      'GET /api/employees without auth returns HTTP 401 UNAUTHORIZED'
    );

    // Test 25: GET /api/employees — HR Manager -> 200 with demo data (>= 5 active employees)
    const empListRes = await request('/employees', { headers: { Authorization: hrToken } });
    assert(
      empListRes.status === 200 &&
      empListRes.data?.success === true &&
      Array.isArray(empListRes.data?.data) &&
      empListRes.data?.data.length >= 5,
      'HR Manager CAN list active employees and receives seeded demo data (HTTP 200)',
      empListRes
    );

    // Test 26: GET /api/employees/:id — HR Manager can fetch a specific employee
    const firstEmp = empListRes.data?.data?.[0];
    if (firstEmp?.id) {
      const singleEmpRes = await request(`/employees/${firstEmp.id}`, { headers: { Authorization: hrToken } });
      assert(
        singleEmpRes.status === 200 && singleEmpRes.data?.data?.id === firstEmp.id,
        'HR Manager CAN retrieve a specific employee by ID (HTTP 200)'
      );
    } else {
      assert(false, 'HR Manager CAN retrieve a specific employee by ID (HTTP 200)', 'No employee in list to test');
    }

    // Test 27: POST /api/employees — employee role -> 403
    const empCreateEmpRes = await request('/employees', {
      method: 'POST',
      headers: { Authorization: empToken },
      body: { firstName: 'Sneaky', lastName: 'User', email: `sneaky_${Date.now()}@test.com`, dateOfJoining: '2024-01-01' },
    });
    assert(
      empCreateEmpRes.status === 403 && empCreateEmpRes.data?.error?.code === 'FORBIDDEN',
      'Employee CANNOT create an employee record (HTTP 403 FORBIDDEN)'
    );

    // Test 28: POST /api/employees — HR Manager creates employee -> 201
    const newEmpEmail = `new.emp.${Date.now()}@peoplepay360.com`;
    const empCreateRes = await request('/employees', {
      method: 'POST',
      headers: { Authorization: hrToken },
      body: {
        firstName: 'New',
        lastName: 'Employee',
        email: newEmpEmail,
        phone: '+91-9999999999',
        departmentId: 'd0000001-0000-4000-8000-000000000001',
        positionId:   'b0000001-0000-4000-8000-000000000001',
        managerId:    'e0000001-0000-4000-8000-000000000001',
        dateOfJoining: '2024-09-01',
        employmentStatus: 'probation',
      },
    });
    assert(
      empCreateRes.status === 201 &&
      empCreateRes.data?.success === true &&
      empCreateRes.data?.data?.email === newEmpEmail,
      'HR Manager CAN create a new employee (HTTP 201)',
      empCreateRes
    );

    const createdEmpId = empCreateRes.data?.data?.id;

    // Test 29: POST /api/employees — invalid email -> 400
    const badEmailRes = await request('/employees', {
      method: 'POST',
      headers: { Authorization: hrToken },
      body: { firstName: 'Bad', lastName: 'Email', email: 'not-an-email', dateOfJoining: '2024-01-01' },
    });
    assert(
      badEmailRes.status === 400 && badEmailRes.data?.error?.code === 'VALIDATION_ERROR',
      'POST /api/employees with invalid email returns HTTP 400 VALIDATION_ERROR'
    );

    // Test 30: PATCH /api/employees/:id/status — HR Manager terminates employee -> 200
    if (createdEmpId) {
      const statusRes = await request(`/employees/${createdEmpId}/status`, {
        method: 'PATCH',
        headers: { Authorization: hrToken },
        body: { status: 'terminated' },
      });
      assert(
        statusRes.status === 200 && statusRes.data?.data?.employment_status === 'terminated',
        'HR Manager CAN change employee status to terminated (HTTP 200)',
        statusRes
      );
    } else {
      assert(false, 'HR Manager CAN change employee status to terminated (HTTP 200)', 'No created employee to patch');
    }

    // Test 31: PUT /api/employees/:id — self as manager -> 400 VALIDATION_ERROR
    if (createdEmpId) {
      const selfMgrRes = await request(`/employees/${createdEmpId}`, {
        method: 'PUT',
        headers: { Authorization: hrToken },
        body: { managerId: createdEmpId },
      });
      assert(
        selfMgrRes.status === 400 && selfMgrRes.data?.error?.code === 'VALIDATION_ERROR',
        'PUT /api/employees/:id with self as manager returns HTTP 400 VALIDATION_ERROR'
      );
    } else {
      assert(false, 'PUT /api/employees/:id with self as manager prevention', 'No created employee id available');
    }

    // Test 32: PATCH status with invalid value -> 400
    if (createdEmpId) {
      const badStatusRes = await request(`/employees/${createdEmpId}/status`, {
        method: 'PATCH',
        headers: { Authorization: hrToken },
        body: { status: 'flying' },
      });
      assert(
        badStatusRes.status === 400 && badStatusRes.data?.error?.code === 'VALIDATION_ERROR',
        'PATCH /api/employees/:id/status with invalid status returns HTTP 400 VALIDATION_ERROR'
      );
    } else {
      assert(false, 'PATCH invalid status value check skipped — no employee id');
    }

    console.log('\n======================================================');
    console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

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
