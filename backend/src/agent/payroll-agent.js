'use strict';

/**
 * Payroll Agent — ReAct Orchestration Loop
 * ─────────────────────────────────────────
 * Implements a Reason-Act-Observe loop:
 *   1. Run each deterministic tool sequentially
 *   2. After each tool, ask the LLM to "think" about the observation
 *   3. After all tools, run the payroll engine (pure computation)
 *   4. Ask the LLM to generate an audit summary
 *   5. Validate against company policy
 *   6. Return the complete AgentResult
 *
 * IMPORTANT: The LLM (Llama 3.1-8B) NEVER computes numbers.
 * All financial calculations are handled by payrollEngine.service.js.
 */

const { InferenceClient } = require('@huggingface/inference');
const jobStore = require('./agentJobStore');
const checkDuplicate = require('./tools/check_duplicate');
const fetchEmployee = require('./tools/fetch_employee');
const fetchSalaryRules = require('./tools/fetch_salary_rules');
const fetchAttendance = require('./tools/fetch_attendance');
const fetchPaidLeaves = require('./tools/fetch_paid_leaves');
const fetchUnpaidAbsences = require('./tools/fetch_unpaid_absences');
const validatePolicy = require('./tools/validate_policy');
const { buildPayrollContext, computePayslipFromRules, countWorkingDays } = require('../services/payrollEngine.service');

const hfClient = new InferenceClient(process.env.HF_TOKEN);
const LLM_MODEL = 'meta-llama/Llama-3.1-8B-Instruct';

/**
 * Ask the LLM to reason about a tool observation.
 * Returns a short "thought" string. Falls back gracefully if LLM call fails.
 */
async function llmThink(toolName, observation) {
  try {
    const prompt = `You are an AI payroll assistant. A tool just ran and returned data.
Tool: ${toolName}
Observation: ${observation}
In 1-2 sentences, briefly explain what this data means for the employee's payroll calculation this month. Be concise and factual.`;

    const response = await hfClient.chatCompletion({
      model: LLM_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 80,
    });
    return response.choices[0]?.message?.content?.trim() || 'Agent processed this step.';
  } catch (err) {
    return `Agent processed ${toolName} successfully.`;
  }
}

/**
 * Ask the LLM to generate a plain-English audit summary of the full payroll.
 */
async function llmGenerateAuditSummary(employeeName, period, payslipData, allStepObservations) {
  try {
    const context = `
Employee: ${employeeName}
Period: ${period}
Gross Pay: ${payslipData.gross}
Total Deductions: ${payslipData.deductions}
Net Pay: ${payslipData.net}
Working Days: ${payslipData.workingDays}
Days Present: ${payslipData.workedDays}
Approved Leave Days: ${payslipData.paidLeaveDays}
Unauthorized Absences: ${payslipData.unauthorizedDays}
Overtime Hours: ${payslipData.overtimeHours}

Key observations from data collection:
${allStepObservations.join('\n')}`;

    const prompt = `You are an AI HR compliance officer. Based on the payroll data below, write a clear, professional 3-4 sentence audit summary explaining how the net pay was calculated and why any deductions were applied. This will be shown to the HR Manager for approval and saved as an audit trail.

${context}

Write the audit summary now:`;

    const response = await hfClient.chatCompletion({
      model: LLM_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
    });
    return response.choices[0]?.message?.content?.trim() || 'Payroll computed based on attendance and salary rules.';
  } catch (err) {
    return `Payroll for ${employeeName} computed for period ${period}. Net pay of ₹${payslipData.net} reflects gross earnings minus applicable deductions per company policy.`;
  }
}

/**
 * Main agent run function.
 * Called by the controller. Starts a background job and returns the jobId immediately.
 */
function runPayrollAgent({ tenantId, employeeId, periodStart, periodEnd, createdBy }) {
  const jobId = jobStore.createJob({ tenantId, employeeId, periodStart, periodEnd, createdBy });

  // Run agent asynchronously — do NOT await
  _runAgentLoop(jobId, { tenantId, employeeId, periodStart, periodEnd, createdBy });

  return jobId;
}

async function _runAgentLoop(jobId, { tenantId, employeeId, periodStart, periodEnd, createdBy }) {
  const observations = [];

  try {
    const workingDays = countWorkingDays(periodStart, periodEnd);

    // ── Tool 1: check_duplicate ──────────────────────────────────────────────
    jobStore.appendStep(jobId, { tool: 'check_duplicate', status: 'running', label: 'Checking for duplicate payroll' });
    const dupResult = await checkDuplicate({ tenantId, employeeId, periodStart, periodEnd });
    const dupThought = await llmThink('check_duplicate', dupResult.message);
    jobStore.updateStep(jobId, 'check_duplicate', { status: 'done', observation: dupResult, llmThought: dupThought });
    observations.push(dupResult.message);

    if (dupResult.isDuplicate) {
      jobStore.setError(jobId, dupResult.message);
      return;
    }

    // ── Tool 2: fetch_employee ───────────────────────────────────────────────
    jobStore.appendStep(jobId, { tool: 'fetch_employee', status: 'running', label: 'Fetching employee & contract details' });
    const empResult = await fetchEmployee({ tenantId, employeeId, periodStart, periodEnd });
    const empThought = await llmThink('fetch_employee', empResult.message);
    jobStore.updateStep(jobId, 'fetch_employee', { status: 'done', observation: empResult, llmThought: empThought });
    observations.push(empResult.message);

    if (!empResult.contract) {
      jobStore.setError(jobId, empResult.message);
      return;
    }

    // ── Tool 3: fetch_salary_rules ───────────────────────────────────────────
    jobStore.appendStep(jobId, { tool: 'fetch_salary_rules', status: 'running', label: 'Loading salary structure & rules' });
    const rulesResult = await fetchSalaryRules({ tenantId, salaryStructureId: empResult.salaryStructureId });
    const rulesThought = await llmThink('fetch_salary_rules', rulesResult.message);
    jobStore.updateStep(jobId, 'fetch_salary_rules', { status: 'done', observation: rulesResult, llmThought: rulesThought });
    observations.push(rulesResult.message);

    // ── Tool 4: fetch_attendance ─────────────────────────────────────────────
    jobStore.appendStep(jobId, { tool: 'fetch_attendance', status: 'running', label: 'Analysing attendance records' });
    const attResult = await fetchAttendance({ tenantId, employeeId, periodStart, periodEnd });
    const attThought = await llmThink('fetch_attendance', attResult.message);
    jobStore.updateStep(jobId, 'fetch_attendance', { status: 'done', observation: attResult, llmThought: attThought });
    observations.push(attResult.message);

    // ── Tool 5: fetch_paid_leaves ────────────────────────────────────────────
    jobStore.appendStep(jobId, { tool: 'fetch_paid_leaves', status: 'running', label: 'Checking approved leave requests' });
    const leavesResult = await fetchPaidLeaves({ tenantId, employeeId, periodStart, periodEnd });
    const leavesThought = await llmThink('fetch_paid_leaves', leavesResult.message);
    jobStore.updateStep(jobId, 'fetch_paid_leaves', { status: 'done', observation: leavesResult, llmThought: leavesThought });
    observations.push(leavesResult.message);

    // ── Tool 6: fetch_unpaid_absences ────────────────────────────────────────
    jobStore.appendStep(jobId, { tool: 'fetch_unpaid_absences', status: 'running', label: 'Computing unauthorized absences & deductions' });
    const unpaidResult = fetchUnpaidAbsences({
      workingDays,
      daysPresent: attResult.daysPresent,
      approvedPaidLeaveDays: leavesResult.totalPaidLeaveDays,
      contractWage: empResult.contractWage,
    });
    const unpaidThought = await llmThink('fetch_unpaid_absences', unpaidResult.message);
    jobStore.updateStep(jobId, 'fetch_unpaid_absences', { status: 'done', observation: unpaidResult, llmThought: unpaidThought });
    observations.push(unpaidResult.message);

    // ── Engine: compute payslip (pure math — no LLM) ─────────────────────────
    const engineContext = buildPayrollContext({
      contract: empResult.contract,
      periodAttendance: {
        workedDays: attResult.daysPresent,
        overtimeHours: attResult.overtimeHours,
      },
      periodTimeOff: {
        paidLeaveDays: leavesResult.totalPaidLeaveDays,
        unpaidLeaveDays: leavesResult.totalApprovedUnpaidLeaveDays,
      },
      workingDays,
    });

    const { lines, gross, deductions, net } = computePayslipFromRules(engineContext, rulesResult.rules || []);

    // ── Tool 7: validate_policy ──────────────────────────────────────────────
    jobStore.appendStep(jobId, { tool: 'validate_policy', status: 'running', label: 'Validating against company policy' });
    const policyResult = validatePolicy({
      netAmount: net,
      grossAmount: gross,
      deductionAmount: deductions,
      workingDays,
      daysPresent: attResult.daysPresent,
      unauthorizedDays: unpaidResult.unauthorizedDays,
      contractWage: empResult.contractWage,
    });
    const policyThought = await llmThink('validate_policy', policyResult.message);
    jobStore.updateStep(jobId, 'validate_policy', { status: 'done', observation: policyResult, llmThought: policyThought });
    observations.push(policyResult.message);

    // ── Generate LLM Audit Summary ───────────────────────────────────────────
    const payslipSummary = {
      gross, deductions, net, workingDays,
      workedDays: attResult.daysPresent,
      paidLeaveDays: leavesResult.totalPaidLeaveDays,
      unauthorizedDays: unpaidResult.unauthorizedDays,
      overtimeHours: attResult.overtimeHours,
    };

    const auditSummary = await llmGenerateAuditSummary(
      empResult.name,
      `${periodStart} to ${periodEnd}`,
      payslipSummary,
      observations
    );

    // ── Build Final Result ───────────────────────────────────────────────────
    const result = {
      employee: {
        id: empResult.employeeId,
        name: empResult.name,
        code: empResult.code,
        department: empResult.department,
        jobTitle: empResult.jobTitle,
        userId: empResult.userId,
      },
      period: { start: periodStart, end: periodEnd },
      contract: empResult.contract,
      salaryStructure: {
        id: empResult.salaryStructureId,
        name: rulesResult.structureName,
      },
      attendance: {
        workingDays,
        daysPresent: attResult.daysPresent,
        overtimeHours: attResult.overtimeHours,
        statusBreakdown: attResult.statusBreakdown,
      },
      leaves: {
        paidLeaveDays: leavesResult.totalPaidLeaveDays,
        unpaidApprovedDays: leavesResult.totalApprovedUnpaidLeaveDays,
        breakdown: leavesResult.breakdown,
      },
      absences: unpaidResult,
      payslipLines: lines,
      summary: {
        grossAmount: gross,
        deductionAmount: deductions,
        netAmount: net,
        contractWage: empResult.contractWage,
      },
      policyValidation: policyResult,
      auditSummary,
      createdBy,
    };

    jobStore.setCompleted(jobId, result);

  } catch (err) {
    console.error('[PayrollAgent] Error in agent loop:', err);
    jobStore.setError(jobId, err.message || 'An unexpected error occurred in the agent.');
  }
}

module.exports = { runPayrollAgent };
