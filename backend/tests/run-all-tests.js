/**
 * Master Test Runner
 * Runs all implemented test suites sequentially.
 */

process.env.NODE_ENV = 'test';

const { execSync } = require('child_process');
const path = require('path');

const tests = [
  { name: 'Phase 1 & 2 RBAC Tests', file: 'tests/rbac.test.js' },
  { name: 'Phase 4 Contracts & Schedules Tests', file: 'tests/contractsSchedules.test.js' },
  { name: 'Phase 5 Attendance, Regularization & Overtime Tests', file: 'tests/attendancePhase5.test.js' },
];

let totalPassed = 0;
let totalFailed = 0;
const failedSuites = [];

console.log('\n================================================================================');
console.log(' PeoplePay360 — Master Test Suite Runner                                        ');
console.log('================================================================================\n');

for (const test of tests) {
  console.log(`\n▶  Running: ${test.name}`);
  console.log(`   File: ${test.file}`);
  console.log('─'.repeat(60));

  try {
    execSync(`node ${path.resolve(__dirname, '..', test.file)}`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
    console.log(`✅ ${test.name}: PASSED\n`);
    totalPassed++;
  } catch (err) {
    console.error(`❌ ${test.name}: FAILED\n`);
    failedSuites.push(test.name);
    totalFailed++;
  }
}

console.log('\n================================================================================');
console.log(` TEST SUMMARY: ${totalPassed} suites PASSED, ${totalFailed} suites FAILED`);
if (failedSuites.length > 0) {
  console.log(` Failed suites: ${failedSuites.join(', ')}`);
}
console.log('================================================================================\n');

if (totalFailed > 0) process.exit(1);
