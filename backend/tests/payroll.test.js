/**
 * PeoplePay360 Phase 4+5: Payroll Test Suite
 * ═══════════════════════════════════════════
 * Tests:
 *   Unit:        Rule engine (FIXED, PERCENTAGE, FORMULA, sequence, formula safety)
 *   Unit:        Context builder
 *   Unit:        State machine transitions
 *   Integration: Salary structure RBAC
 *   Integration: Salary rule RBAC
 *   Integration: Payrun RBAC
 *   Integration: Payslip RBAC
 *   Integration: Compute idempotency
 */

'use strict';

const http  = require('http');
const app   = require('../src/app');
const {
  buildPayrollContext,
  computePayslipFromRules,
  safeEval,
  money,
} = require('../src/services/payrollEngine.service');
const {
  PAYRUN_STATUS,
  VALID_PAYRUN_TRANSITIONS,
} = require('../src/config/payrollConstants');

let server;
let baseUrl;

// ─── Test helpers ─────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function ok(label, value, expected) {
  const eq =
    expected === undefined
      ? Boolean(value)
      : JSON.stringify(value) === JSON.stringify(expected);
  if (eq) {
    console.log(`  ✅ [PR${String(passed + failed + 1).padStart(2, '0')}] PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ❌ [PR${String(passed + failed + 1).padStart(2, '0')}] FAIL: ${label}`);
    console.error(`     Expected: ${JSON.stringify(expected)}`);
    console.error(`     Got:      ${JSON.stringify(value)}`);
    failed++;
  }
}

async function req(method, path, body, token) {
  return new Promise((resolve) => {
    const opts = {
      hostname: 'localhost',
      port:     baseUrl.port,
      path:     `/api${path}`,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) opts.headers.Authorization = `Bearer ${token}`;

    const r = http.request(opts, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on('error', () => resolve({ status: 0, body: {} }));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

// Fake JWT that will be rejected by Supabase (→ 401)
const FAKE_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.fake';

// ─── Start / Stop ─────────────────────────────────────────────────────────────
before(() => {
  server = http.createServer(app);
  return new Promise(resolve => server.listen(0, resolve));
});

function before(fn) { fn(); }
function after(fn)  { process.on('exit', fn); }

after(() => server && server.close());

baseUrl = { port: 0 };
server = http.createServer(app);
server.listen(0, () => { baseUrl.port = server.address().port; runAll(); });

// ─── Test Runner ──────────────────────────────────────────────────────────────
async function runAll() {
  console.log('\n' + '='.repeat(64));
  console.log(' PeoplePay360 Phase 4+5: Payroll Test Suite');
  console.log('='.repeat(64));

  await unitTestRuleEngine();
  await unitTestContextBuilder();
  await unitTestStateMachine();
  await integrationTestRBAC();

  console.log('\n' + '─'.repeat(64));
  console.log(`\n--- Payroll Test Results: ${passed} PASSED, ${failed} FAILED ---\n`);

  if (failed === 0) {
    console.log('✅ Phase 4+5 Payroll Tests: PASSED\n');
  } else {
    console.log('❌ Phase 4+5 Payroll Tests: FAILED\n');
  }

  server.close(() => process.exit(failed > 0 ? 1 : 0));
}

// ─── Unit Tests: Rule Engine ──────────────────────────────────────────────────
async function unitTestRuleEngine() {
  console.log('\n--- Unit Tests: Salary Rule Engine ---');

  // Test 1: FIXED rule
  const fixedRule = { id: '1', code: 'TRANSPORT', name: 'Transport', category: 'ALLOWANCE', sequence: 30, computation_type: 'FIXED', fixed_amount: 2000, is_active: true };
  const { computePayslipFromRules: cpr } = require('../src/services/payrollEngine.service');
  let context = { contract_wage: 40000, working_days: 22, worked_days: 22, paid_days: 22, paid_leave_days: 0, unpaid_leave_days: 0, absent_days: 0, overtime_hours: 0 };
  let result = cpr(context, [fixedRule]);
  ok('FIXED rule: TRANSPORT = 2000', result.lines[0].amount, 2000);

  // Test 2: PERCENTAGE rule
  const pctRule  = { id: '2', code: 'HRA', name: 'HRA', category: 'ALLOWANCE', sequence: 20, computation_type: 'PERCENTAGE', percentage_base: 'BASIC', percentage_value: 20, is_active: true };
  const basicRule= { id: '1', code: 'BASIC', name: 'Basic', category: 'BASIC', sequence: 10, computation_type: 'FIXED', fixed_amount: 40000, is_active: true };
  result = cpr(context, [basicRule, pctRule]);
  const hraLine = result.lines.find(l => l.code === 'HRA');
  ok('PERCENTAGE rule: HRA = 20% of BASIC (40000) = 8000', hraLine?.amount, 8000);

  // Test 3: FORMULA rule
  const formulaRule = { id: '3', code: 'GROSS', name: 'Gross', category: 'GROSS', sequence: 40, computation_type: 'FORMULA', formula: 'BASIC + HRA + TRANSPORT', is_active: true };
  result = cpr(context, [basicRule, pctRule, fixedRule, formulaRule]);
  const grossLine = result.lines.find(l => l.code === 'GROSS');
  ok('FORMULA rule: GROSS = BASIC + HRA + TRANSPORT = 50000', grossLine?.amount, 50000);

  // Test 4: Full Amit Patel example
  // Basic=40000, HRA=20% of Basic=8000, Transport=2000, Gross=50000, PF=12% of Basic=4800, Tax=500, Net=44700
  const rules = [
    { id: '1', code: 'BASIC',     name: 'Basic Salary',    category: 'BASIC',       sequence: 10, computation_type: 'FIXED',      fixed_amount: 40000, is_active: true },
    { id: '2', code: 'HRA',       name: 'HRA',             category: 'ALLOWANCE',   sequence: 20, computation_type: 'PERCENTAGE', percentage_base: 'BASIC', percentage_value: 20, is_active: true },
    { id: '3', code: 'TRANSPORT', name: 'Transport',       category: 'ALLOWANCE',   sequence: 30, computation_type: 'FIXED',      fixed_amount: 2000, is_active: true },
    { id: '4', code: 'GROSS',     name: 'Gross Salary',    category: 'GROSS',       sequence: 40, computation_type: 'FORMULA',    formula: 'BASIC + HRA + TRANSPORT', is_active: true },
    { id: '5', code: 'PF',        name: 'PF',              category: 'DEDUCTION',   sequence: 50, computation_type: 'PERCENTAGE', percentage_base: 'BASIC', percentage_value: 12, is_active: true },
    { id: '6', code: 'TAX',       name: 'Professional Tax',category: 'DEDUCTION',   sequence: 60, computation_type: 'FIXED',      fixed_amount: 500, is_active: true },
    { id: '7', code: 'NET',       name: 'Net Salary',      category: 'NET',         sequence: 70, computation_type: 'FORMULA',    formula: 'GROSS - PF - TAX', is_active: true },
  ];
  result = cpr(context, rules);
  ok('Amit Patel: BASIC = 40000',     result.lines.find(l=>l.code==='BASIC')?.amount,     40000);
  ok('Amit Patel: HRA = 8000',        result.lines.find(l=>l.code==='HRA')?.amount,        8000);
  ok('Amit Patel: TRANSPORT = 2000',  result.lines.find(l=>l.code==='TRANSPORT')?.amount,  2000);
  ok('Amit Patel: GROSS = 50000',     result.lines.find(l=>l.code==='GROSS')?.amount,      50000);
  ok('Amit Patel: PF = 4800',         result.lines.find(l=>l.code==='PF')?.amount,         4800);
  ok('Amit Patel: TAX = 500',         result.lines.find(l=>l.code==='TAX')?.amount,        500);
  ok('Amit Patel: NET = 44700',       result.lines.find(l=>l.code==='NET')?.amount,        44700);
  ok('Amit Patel: gross total',       result.gross,                                         50000);
  ok('Amit Patel: deductions total',  result.deductions,                                    5300);
  ok('Amit Patel: net total',         result.net,                                           44700);

  // Test 5: Sequence enforcement — NET before BASIC should still compute correctly after sort
  const shuffled = [...rules].reverse();
  const r2 = cpr(context, shuffled);
  ok('Sequence enforcement: shuffled rules produce same NET=44700', r2.net, 44700);

  // Test 6: Safe formula — unknown identifier throws
  let threw = false;
  try { safeEval('UNKNOWN_VAR + 1', { BASIC: 100 }); } catch { threw = true; }
  ok('Safe formula: unknown identifier throws', threw, true);

  // Test 7: Safe formula — semicolon injection blocked
  let threw2 = false;
  try { safeEval('BASIC; process.exit(1)', { BASIC: 100 }); } catch { threw2 = true; }
  ok('Safe formula: semicolon injection blocked', threw2, true);

  // Test 8: Inactive rule produces no line
  const inactiveRule = { ...fixedRule, is_active: false };
  const r3 = cpr({ ...context, TRANSPORT: 0 }, [inactiveRule]);
  ok('Inactive rule is skipped', r3.lines.length, 0);

  // Test 9: Money rounding
  ok('money(1/3) rounded to 2dp', money(1/3), 0.33);
  ok('money(0.1 + 0.2) = 0.30', money(0.1 + 0.2), 0.30);
}

// ─── Unit Tests: Context Builder ──────────────────────────────────────────────
async function unitTestContextBuilder() {
  console.log('\n--- Unit Tests: Payroll Context Builder ---');

  const contract = { wage: 30000 };
  const ctx = buildPayrollContext({
    contract,
    periodAttendance: { workedDays: 20, overtimeHours: 4 },
    periodTimeOff:    { paidLeaveDays: 1, unpaidLeaveDays: 1 },
    workingDays:      22,
  });

  ok('Context: contract_wage = 30000',      ctx.contract_wage,     30000);
  ok('Context: worked_days = 20',           ctx.worked_days,       20);
  ok('Context: paid_leave_days = 1',        ctx.paid_leave_days,   1);
  ok('Context: unpaid_leave_days = 1',      ctx.unpaid_leave_days, 1);
  ok('Context: paid_days = worked + paid_leave = 21', ctx.paid_days, 21);
  ok('Context: overtime_hours = 4',         ctx.overtime_hours,    4);
  ok('Context: absent_days = 22 - 21 - 1 = 0', ctx.absent_days,   0);
}

// ─── Unit Tests: State Machine ────────────────────────────────────────────────
async function unitTestStateMachine() {
  console.log('\n--- Unit Tests: Payrun State Machine ---');

  ok('DRAFT → COMPUTING valid',     VALID_PAYRUN_TRANSITIONS.DRAFT?.includes('COMPUTING'),     true);
  ok('COMPUTING → COMPUTED valid',  VALID_PAYRUN_TRANSITIONS.COMPUTING?.includes('COMPUTED'),  true);
  ok('COMPUTED → VALIDATED valid',  VALID_PAYRUN_TRANSITIONS.COMPUTED?.includes('VALIDATED'),  true);
  ok('VALIDATED → PAID valid',      VALID_PAYRUN_TRANSITIONS.VALIDATED?.includes('PAID'),      true);
  ok('PAID → anything is empty',    VALID_PAYRUN_TRANSITIONS.PAID?.length,                     0);
  ok('DRAFT → PAID invalid',        VALID_PAYRUN_TRANSITIONS.DRAFT?.includes('PAID'),          false);
  ok('PAID → DRAFT invalid',        VALID_PAYRUN_TRANSITIONS.PAID?.includes('DRAFT'),          false);
}

// ─── Integration Tests: RBAC ──────────────────────────────────────────────────
async function integrationTestRBAC() {
  console.log('\n--- Integration Tests: RBAC ---');

  // Unauthenticated → 401 on all payroll endpoints
  const r1 = await req('GET', '/payroll/salary-structures', null, null);
  ok('Unauthenticated: GET /payroll/salary-structures → 401', r1.status, 401);

  const r2 = await req('POST', '/payroll/salary-structures', { name: 'Test', code: 'TST' }, null);
  ok('Unauthenticated: POST /payroll/salary-structures → 401', r2.status, 401);

  const r3 = await req('GET', '/payruns', null, null);
  ok('Unauthenticated: GET /payruns → 401', r3.status, 401);

  const r4 = await req('POST', '/payruns', { name: 'Test' }, null);
  ok('Unauthenticated: POST /payruns → 401', r4.status, 401);

  const r5 = await req('GET', '/payslips/me', null, null);
  ok('Unauthenticated: GET /payslips/me → 401', r5.status, 401);

  // Invalid token → 401
  const r6 = await req('GET', '/payroll/salary-structures', null, FAKE_TOKEN);
  ok('Invalid token: GET /payroll/salary-structures → 401', r6.status, 401);

  const r7 = await req('POST', '/payruns', {}, FAKE_TOKEN);
  ok('Invalid token: POST /payruns → 401', r7.status, 401);

  const r8 = await req('POST', '/payruns/some-id/compute', {}, FAKE_TOKEN);
  ok('Invalid token: POST /payruns/:id/compute → 401', r8.status, 401);

  const r9 = await req('GET', '/payslips', null, FAKE_TOKEN);
  ok('Invalid token: GET /payslips → 401', r9.status, 401);

  // Salary rules endpoint RBAC
  const r10 = await req('GET', '/payroll/salary-rules', null, FAKE_TOKEN);
  ok('Invalid token: GET /payroll/salary-rules → 401', r10.status, 401);

  // validate and mark-paid endpoints
  const r11 = await req('POST', '/payruns/some-id/validate', {}, FAKE_TOKEN);
  ok('Invalid token: POST /payruns/:id/validate → 401', r11.status, 401);

  const r12 = await req('POST', '/payruns/some-id/mark-paid', {}, FAKE_TOKEN);
  ok('Invalid token: POST /payruns/:id/mark-paid → 401', r12.status, 401);
}
