/**
 * Comprehensive Automated RBAC & Auth Test Suite
 * Tests all role boundaries, token validation, 401 unauthenticated, and 403 forbidden responses.
 */

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

    console.log(`[Suite 1]: Public & Unauthenticated Access Rules`);
    
    // Test 1: Public access
    const pubRes = await request('/test/public');
    assert(pubRes.status === 200 && pubRes.data?.success === true, 'Public endpoint is accessible without authentication (HTTP 200)');

    // Test 2: Unauthenticated request to protected endpoint -> 401
    const unauthRes = await request('/test/authenticated');
    assert(
      unauthRes.status === 401 &&
      unauthRes.data?.success === false &&
      unauthRes.data?.error?.code === 'UNAUTHORIZED',
      'Unauthenticated request returns HTTP 401 and UNAUTHORIZED code',
      unauthRes
    );

    console.log(`\n[Suite 2]: Employee Role Boundary Rules`);
    const empToken = 'Bearer test-token-employee';

    // Test 3: Employee accessing employee portal -> 200
    const empPortalRes = await request('/test/employee-only', { headers: { Authorization: empToken } });
    assert(empPortalRes.status === 200 && empPortalRes.data?.success === true, 'Employee can access employee portal (HTTP 200)');

    // Test 4: Employee accessing payroll -> 403
    const empPayrollRes = await request('/test/payroll-access', { headers: { Authorization: empToken } });
    assert(
      empPayrollRes.status === 403 &&
      empPayrollRes.data?.success === false &&
      empPayrollRes.data?.error?.code === 'FORBIDDEN',
      'Employee CANNOT access payroll management (HTTP 403 FORBIDDEN)',
      empPayrollRes
    );

    // Test 5: Employee accessing HR management -> 403
    const empHrRes = await request('/test/hr-access', { headers: { Authorization: empToken } });
    assert(empHrRes.status === 403 && empHrRes.data?.error?.code === 'FORBIDDEN', 'Employee CANNOT access company-wide HR management (HTTP 403 FORBIDDEN)');

    console.log(`\n[Suite 3]: HR Manager Role Boundary Rules`);
    const hrToken = 'Bearer test-token-hr_manager';

    // Test 6: HR Manager accessing HR -> 200
    const hrAccessRes = await request('/test/hr-access', { headers: { Authorization: hrToken } });
    assert(hrAccessRes.status === 200 && hrAccessRes.data?.success === true, 'HR Manager CAN access HR records and management (HTTP 200)');

    // Test 7: HR Manager accessing Payroll -> 403
    const hrPayrollRes = await request('/test/payroll-access', { headers: { Authorization: hrToken } });
    assert(
      hrPayrollRes.status === 403 &&
      hrPayrollRes.data?.success === false &&
      hrPayrollRes.data?.error?.code === 'FORBIDDEN',
      'HR Manager CANNOT access payroll management (HTTP 403 FORBIDDEN)',
      hrPayrollRes
    );

    console.log(`\n[Suite 4]: HR Payroll User Role Boundary Rules`);
    const payrollUserToken = 'Bearer test-token-hr_payroll_user';

    // Test 8: HR Payroll User accessing Payroll -> 200
    const puPayrollRes = await request('/test/payroll-access', { headers: { Authorization: payrollUserToken } });
    assert(puPayrollRes.status === 200 && puPayrollRes.data?.success === true, 'HR Payroll User CAN access payroll management (HTTP 200)');

    // Test 9: HR Payroll User processing payroll -> 200
    const puProcessRes = await request('/test/payroll-process', { headers: { Authorization: payrollUserToken } });
    assert(puProcessRes.status === 200 && puProcessRes.data?.success === true, 'HR Payroll User CAN execute payroll processing (HTTP 200)');

    // Test 10: HR Payroll User managing salary structures -> 403
    const puStructureRes = await request('/test/salary-structure-manage', { headers: { Authorization: payrollUserToken } });
    assert(
      puStructureRes.status === 403 &&
      puStructureRes.data?.success === false &&
      puStructureRes.data?.error?.code === 'FORBIDDEN',
      'HR Payroll User CANNOT manage salary structures unless explicitly permitted (HTTP 403 FORBIDDEN)',
      puStructureRes
    );

    console.log(`\n[Suite 5]: HR Payroll Manager Role Boundary Rules`);
    const payrollMgrToken = 'Bearer test-token-hr_payroll_manager';

    // Test 11: HR Payroll Manager accessing HR -> 200
    const pmHrRes = await request('/test/hr-access', { headers: { Authorization: payrollMgrToken } });
    assert(pmHrRes.status === 200 && pmHrRes.data?.success === true, 'HR Payroll Manager has full HR control (HTTP 200)');

    // Test 12: HR Payroll Manager accessing Payroll -> 200
    const pmPayrollRes = await request('/test/payroll-access', { headers: { Authorization: payrollMgrToken } });
    assert(pmPayrollRes.status === 200 && pmPayrollRes.data?.success === true, 'HR Payroll Manager has full Payroll control (HTTP 200)');

    // Test 13: HR Payroll Manager managing salary structures -> 200
    const pmStructureRes = await request('/test/salary-structure-manage', { headers: { Authorization: payrollMgrToken } });
    assert(pmStructureRes.status === 200 && pmStructureRes.data?.success === true, 'HR Payroll Manager CAN manage salary structures (HTTP 200)');

    console.log(`\n[Suite 6]: Admin Superuser Boundary Rules`);
    const adminToken = 'Bearer test-token-admin';

    // Test 14: Admin accessing Admin console -> 200
    const adminConsoleRes = await request('/test/admin-only', { headers: { Authorization: adminToken } });
    assert(adminConsoleRes.status === 200 && adminConsoleRes.data?.success === true, 'Admin CAN access Admin console (HTTP 200)');

    // Test 15: Admin accessing all modules (HR, Payroll, Structures) -> 200
    const adminHr = await request('/test/hr-access', { headers: { Authorization: adminToken } });
    const adminPay = await request('/test/payroll-access', { headers: { Authorization: adminToken } });
    const adminStruct = await request('/test/salary-structure-manage', { headers: { Authorization: adminToken } });
    assert(
      adminHr.status === 200 && adminPay.status === 200 && adminStruct.status === 200,
      'Admin has superuser access to EVERYTHING (HR, Payroll, Salary Structures) (HTTP 200)'
    );

    console.log(`\n[Suite 7]: Auth Endpoints & Profile Mapping`);
    // Test 16: GET /api/auth/roles
    const rolesRes = await request('/auth/roles');
    assert(rolesRes.status === 200 && Array.isArray(rolesRes.data?.data) && rolesRes.data?.data.length === 5, 'GET /api/auth/roles returns the 5 system roles');

    // Test 17: GET /api/auth/me returns profile, roles, and permissions
    const meRes = await request('/auth/me', { headers: { Authorization: payrollUserToken } });
    assert(
      meRes.status === 200 &&
      meRes.data?.data?.roles?.includes('hr_payroll_user') &&
      Array.isArray(meRes.data?.data?.permissions) &&
      meRes.data?.data?.permissions.includes('payroll:process'),
      'GET /api/auth/me returns mapped user profile, roles, and granular permissions list'
    );

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
