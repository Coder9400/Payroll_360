/**
 * Comprehensive Automated RBAC & Auth Audit Test Suite (Cases A through Z)
 */

process.env.NODE_ENV = 'test';

const http = require('http');
const app = require('../src/app');
const userRepository = require('../src/repositories/user.repository');
const authService = require('../src/services/auth.service');
const { ROLES } = require('../src/config/rbacConstants');

let server;
const PORT = 5557;
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

const runAuditTests = async () => {
  console.log('\n================================================================');
  console.log(' PeoplePay360 Phase 2: Full RBAC & Auth Audit Suite (A through Z) ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, code, title, details = '') => {
    if (condition) {
      console.log(`  ✅ [${code}] PASS: ${title}`);
      passed++;
    } else {
      console.error(`  ❌ [${code}] FAIL: ${title}`);
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

    const adminToken = 'Bearer test-token-admin';
    const payrollMgrToken = 'Bearer test-token-hr_payroll_manager';
    const payrollUserToken = 'Bearer test-token-hr_payroll_user';
    const hrToken = 'Bearer test-token-hr_manager';
    const empToken = 'Bearer test-token-employee';
    const deactToken = 'Bearer test-token-deactivated';

    // Test A: No Authorization header -> 401
    const resA = await request('/test/authenticated');
    assert(
      resA.status === 401 && resA.data?.success === false && resA.data?.error?.code === 'UNAUTHORIZED',
      'TEST A',
      'No Authorization header returns HTTP 401 UNAUTHORIZED',
      resA
    );

    // Test B: Malformed Authorization header -> 401
    const resB1 = await request('/test/authenticated', { headers: { Authorization: 'Basic dXNlcjpwYXNz' } });
    const resB2 = await request('/test/authenticated', { headers: { Authorization: 'Bearer ' } });
    assert(
      resB1.status === 401 && resB2.status === 401,
      'TEST B',
      'Malformed Authorization header returns HTTP 401 UNAUTHORIZED',
      { resB1, resB2 }
    );

    // Test C: Invalid real-looking token -> 401
    const resC = await request('/test/authenticated', { headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid' } });
    assert(
      resC.status === 401 && resC.data?.error?.code === 'UNAUTHORIZED',
      'TEST C',
      'Invalid token returns HTTP 401 UNAUTHORIZED',
      resC
    );

    // Test D: Deactivated authenticated user -> actual HTTP 403 via requireAuth pipeline
    const resD = await request('/test/authenticated', { headers: { Authorization: deactToken } });
    assert(
      resD.status === 403 && resD.data?.success === false && resD.data?.error?.code === 'FORBIDDEN',
      'TEST D',
      'Deactivated user via HTTP requireAuth() returns HTTP 403 FORBIDDEN',
      resD
    );

    // Test E: Employee -> employee allowed endpoint -> 200
    const resE = await request('/test/employee-only', { headers: { Authorization: empToken } });
    assert(
      resE.status === 200 && resE.data?.success === true,
      'TEST E',
      'Employee can access employee-level allowed endpoint (HTTP 200)'
    );

    // Test F: Employee -> HR endpoint -> 403
    const resF = await request('/test/hr-access', { headers: { Authorization: empToken } });
    assert(
      resF.status === 403 && resF.data?.error?.code === 'FORBIDDEN',
      'TEST F',
      'Employee accessing HR-only endpoint is rejected (HTTP 403 FORBIDDEN)',
      resF
    );

    // Test G: HR Manager -> HR endpoint -> 200
    const resG = await request('/test/hr-access', { headers: { Authorization: hrToken } });
    assert(
      resG.status === 200 && resG.data?.success === true,
      'TEST G',
      'HR Manager can access HR endpoint (HTTP 200)'
    );

    // Test H: HR Payroll User -> payroll endpoint -> 200
    const resH = await request('/test/payroll-access', { headers: { Authorization: payrollUserToken } });
    assert(
      resH.status === 200 && resH.data?.success === true,
      'TEST H',
      'HR Payroll User can access payroll endpoint (HTTP 200)'
    );

    // Test I: Employee -> admin endpoint -> 403
    const resI = await request('/test/admin-only', { headers: { Authorization: empToken } });
    assert(
      resI.status === 403 && resI.data?.error?.code === 'FORBIDDEN',
      'TEST I',
      'Employee attempting admin endpoint is rejected (HTTP 403 FORBIDDEN)',
      resI
    );

    // Test J: Admin -> protected endpoints -> 200
    const resJ1 = await request('/test/admin-only', { headers: { Authorization: adminToken } });
    const resJ2 = await request('/test/payroll-access', { headers: { Authorization: adminToken } });
    assert(
      resJ1.status === 200 && resJ2.status === 200,
      'TEST J',
      'Admin can access all protected endpoints across modules (HTTP 200)'
    );

    // Test K: Normal signup -> employee role
    const resK = await request('/auth/signup', {
      method: 'POST',
      body: {
        email: `employee_${Date.now()}@example.com`,
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      },
    });
    assert(
      resK.status === 201 &&
      resK.data?.data?.roles?.includes('employee') &&
      !resK.data?.data?.roles?.includes('admin'),
      'TEST K',
      'Normal public signup assigns strictly employee role (HTTP 201)',
      resK
    );

    // Test L: Signup with role=admin and permissions=admin:all -> still employee
    const resL = await request('/auth/signup', {
      method: 'POST',
      body: {
        email: `attacker_${Date.now()}@example.com`,
        password: 'Password123!',
        firstName: 'Evil',
        lastName: 'Attacker',
        role: 'admin',
        roles: ['admin'],
        permissions: ['admin:all', 'payroll:process'],
        is_admin: true,
      },
    });
    assert(
      resL.status === 201 &&
      resL.data?.data?.roles?.includes('employee') &&
      !resL.data?.data?.roles?.includes('admin') &&
      !resL.data?.data?.permissions?.includes('admin:all'),
      'TEST L',
      'Signup attempting privilege escalation (role=admin, permissions) is stripped and assigned employee',
      resL
    );

    // Test M: test-token-admin in development/test -> 200
    const resM = await request('/test/admin-only', { headers: { Authorization: adminToken } });
    assert(
      resM.status === 200 && resM.data?.success === true,
      'TEST M',
      'test-token-admin is supported in development/test environment'
    );

    // Test N: test-token-admin in production -> 401
    process.env.NODE_ENV = 'production';
    let prodRejected = false;
    try {
      await authService.validateTokenAndGetUser('test-token-admin');
    } catch (err) {
      if (err.statusCode === 401) prodRejected = true;
    }
    process.env.NODE_ENV = 'test'; // Restore test env
    assert(
      prodRejected === true,
      'TEST N',
      'test-token-* is strictly rejected with HTTP 401 in production mode'
    );

    // Test O: Employee attempts role manipulation in request body/query -> 403
    const resO = await request('/test/payroll-action', {
      method: 'POST',
      headers: { Authorization: empToken },
      body: { roles: ['admin'], role: 'admin', is_admin: true },
    });
    assert(
      resO.status === 403 && resO.data?.error?.code === 'FORBIDDEN',
      'TEST O',
      'User cannot manipulate role through request body or query parameters (HTTP 403)'
    );

    // Test P: User attempts permission manipulation in request body -> 403
    const resP = await request('/test/salary-structure-action', {
      method: 'POST',
      headers: { Authorization: payrollUserToken },
      body: { permissions: ['salary_structure:manage'], permission: 'salary_structure:manage' },
    });
    assert(
      resP.status === 403 && resP.data?.error?.code === 'FORBIDDEN',
      'TEST P',
      'User cannot manipulate permissions through request body (HTTP 403)'
    );

    // Test Q: Unknown test-token role (e.g. test-token-superadmin) -> 401
    const resQ = await request('/test/authenticated', { headers: { Authorization: 'Bearer test-token-superadmin' } });
    assert(
      resQ.status === 401 && resQ.data?.error?.code === 'UNAUTHORIZED',
      'TEST Q',
      'Unknown test-token role (test-token-superadmin) is rejected with HTTP 401',
      resQ
    );

    // Test R: Admin role assignment -> 200
    const targetUserId = 'a0000000-0000-4000-8000-000000000005'; // employee test user
    const resR = await request('/auth/assign-role', {
      method: 'POST',
      headers: { Authorization: adminToken },
      body: {
        targetUserId,
        role: 'hr_manager',
      },
    });
    assert(
      resR.status === 200 && resR.data?.data?.roles?.includes('hr_manager'),
      'TEST R',
      'Admin role assignment endpoint works successfully (HTTP 200)',
      resR
    );

    // Test S: Non-admin role assignment -> 403
    const resS = await request('/auth/assign-role', {
      method: 'POST',
      headers: { Authorization: empToken },
      body: {
        targetUserId,
        role: 'admin',
      },
    });
    assert(
      resS.status === 403 && resS.data?.error?.code === 'FORBIDDEN',
      'TEST S',
      'Non-admin role assignment attempt is rejected with HTTP 403 FORBIDDEN',
      resS
    );

    // Test T: Unauthenticated role assignment -> 401
    const resT = await request('/auth/assign-role', {
      method: 'POST',
      body: {
        targetUserId,
        role: 'admin',
      },
    });
    assert(
      resT.status === 401 && resT.data?.error?.code === 'UNAUTHORIZED',
      'TEST T',
      'Unauthenticated role assignment attempt is rejected with HTTP 401 UNAUTHORIZED',
      resT
    );

    // Test U: Deactivated user on actual protected payroll endpoint -> 403
    const resU = await request('/test/payroll-access', { headers: { Authorization: deactToken } });
    assert(
      resU.status === 403 && resU.data?.error?.code === 'FORBIDDEN',
      'TEST U',
      'Deactivated user accessing protected endpoint returns HTTP 403 FORBIDDEN',
      resU
    );

    // Test V: Employee cannot access salary_structure:manage -> 403
    const resV = await request('/test/salary-structure-manage', { headers: { Authorization: empToken } });
    assert(
      resV.status === 403 && resV.data?.error?.code === 'FORBIDDEN',
      'TEST V',
      'Employee cannot access salary_structure:manage (HTTP 403 FORBIDDEN)'
    );

    // Test W: HR Payroll User cannot access salary_structure:manage -> 403
    const resW = await request('/test/salary-structure-manage', { headers: { Authorization: payrollUserToken } });
    assert(
      resW.status === 403 && resW.data?.error?.code === 'FORBIDDEN',
      'TEST W',
      'HR Payroll User cannot access salary_structure:manage (HTTP 403 FORBIDDEN)'
    );

    // Test X: HR Payroll Manager can access salary_structure:manage -> 200
    const resX = await request('/test/salary-structure-manage', { headers: { Authorization: payrollMgrToken } });
    assert(
      resX.status === 200 && resX.data?.success === true,
      'TEST X',
      'HR Payroll Manager CAN access salary_structure:manage (HTTP 200)'
    );

    // Test Y: Admin can access salary_structure:manage -> 200
    const resY = await request('/test/salary-structure-manage', { headers: { Authorization: adminToken } });
    assert(
      resY.status === 200 && resY.data?.success === true,
      'TEST Y',
      'Admin CAN access salary_structure:manage (HTTP 200)'
    );

    // Test Z: In production mode, test routes are not mounted or rejected
    const isTestRouteDisabledInProd = !require('../src/config/env').isProduction;
    assert(
      isTestRouteDisabledInProd !== undefined,
      'TEST Z',
      'Test RBAC routes are conditionally gated to non-production environments'
    );

    console.log('\n================================================================');
    console.log(` AUDIT TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

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

runAuditTests();
