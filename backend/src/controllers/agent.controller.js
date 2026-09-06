'use strict';

const { runPayrollAgent } = require('../agent/payroll-agent');
const jobStore = require('../agent/agentJobStore');
const payrunService = require('../services/payrun.service');
const { successResponse } = require('../utils/apiResponse');
const AppError = require('../utils/appError');
const { supabaseAdmin, supabase } = require('../config/supabase');
const { withTenantId } = require('../utils/tenantScope');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const db = supabaseAdmin || supabase;

/**
 * POST /api/agent/run-payroll
 * Starts the agent loop in the background, returns a jobId for polling.
 */
exports.runPayroll = async (req, res, next) => {
  try {
    const { employee_id, period_start, period_end } = req.body;

    if (!employee_id || !period_start || !period_end) {
      throw new AppError('employee_id, period_start, and period_end are required', 400);
    }

    const jobId = runPayrollAgent({
      tenantId: req.user.tenantId,
      employeeId: employee_id,
      periodStart: period_start,
      periodEnd: period_end,
      createdBy: req.user.id,
    });

    return successResponse(res, { jobId }, 'Agent started successfully', 202);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/agent/status/:jobId
 * Returns the current job status and all steps for frontend polling.
 */
exports.getStatus = async (req, res, next) => {
  try {
    const job = jobStore.getJob(req.params.jobId);
    if (!job) throw new AppError('Agent job not found or expired', 404);

    // Strip raw DB data from observations to keep response lean
    const cleanSteps = job.steps.map(step => ({
      tool: step.tool,
      label: step.label,
      status: step.status,
      llmThought: step.llmThought,
      timestamp: step.timestamp,
      // Selective observation fields safe to send to frontend
      observation: step.observation ? _cleanObservation(step.tool, step.observation) : null,
    }));

    return successResponse(res, {
      jobId: job.jobId,
      status: job.status,
      steps: cleanSteps,
      result: job.status === 'completed' ? _formatResult(job.result) : null,
      error: job.error || null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/agent/approve/:jobId
 * HR approves the proposal. Creates a real Payrun + Payslip in the database.
 */
exports.approve = async (req, res, next) => {
  try {
    const job = jobStore.getJob(req.params.jobId);
    if (!job) throw new AppError('Agent job not found or expired', 404);
    if (job.status !== 'completed') throw new AppError('Job is not in a completed state', 400);
    if (!job.result) throw new AppError('No result to approve', 400);

    const { result } = job;
    const tenantId = job.input.tenantId;

    // 1. Create the payrun
    const payrunData = await payrunService.createPayrun(tenantId, {
      name: `AI Agent — ${result.employee.name} (${result.period.start} to ${result.period.end})`,
      salary_structure_id: result.salaryStructure.id,
      period_start: result.period.start,
      period_end: result.period.end,
    }, result.createdBy);

    // 2. Compute the payrun for this specific employee
    await payrunService.computePayrun(tenantId, payrunData.id, [result.employee.id]);

    // 3. Validate the payrun
    await payrunService.validatePayrun(tenantId, payrunData.id);

    // 4. Fetch the created payslip ID
    const { data: payslip } = await db
      .from('payslips')
      .select('id')
      .eq('payrun_id', payrunData.id)
      .eq('employee_id', result.employee.id)
      .maybeSingle();

    // 5. Save the agent audit summary to the payslip notes
    if (payslip) {
      await db.from('payslips')
        .update({ notes: result.auditSummary })
        .eq('id', payslip.id);
    }

    // 6. Send in-app notifications (fire and forget)
    _sendNotifications(tenantId, result, payrunData.id, payslip?.id).catch(console.error);

    jobStore.setApproved(req.params.jobId, payrunData.id, payslip?.id);

    return successResponse(res, {
      payrunId: payrunData.id,
      payslipId: payslip?.id,
    }, 'Payroll approved and created successfully', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/agent/reject/:jobId
 * HR rejects the proposal. Logs the reason.
 */
exports.reject = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const job = jobStore.getJob(req.params.jobId);
    if (!job) throw new AppError('Agent job not found or expired', 404);

    jobStore.setRejected(req.params.jobId, reason || 'No reason provided');
    return successResponse(res, null, 'Payroll proposal rejected');
  } catch (err) {
    next(err);
  }
};

// ── Internal helpers ──────────────────────────────────────────────────────────

function _cleanObservation(tool, obs) {
  switch (tool) {
    case 'check_duplicate':
      return { isDuplicate: obs.isDuplicate, message: obs.message };
    case 'fetch_employee':
      return { name: obs.name, code: obs.code, department: obs.department, jobTitle: obs.jobTitle, contractWage: obs.contractWage, contractCount: obs.contractCount, message: obs.message };
    case 'fetch_salary_rules':
      return { structureName: obs.structureName, totalRules: obs.totalRules, earningRules: obs.earningRules, deductionRules: obs.deductionRules, message: obs.message };
    case 'fetch_attendance':
      return { daysPresent: obs.daysPresent, daysAbsent: obs.daysAbsent, overtimeHours: obs.overtimeHours, totalHoursWorked: obs.totalHoursWorked, statusBreakdown: obs.statusBreakdown, message: obs.message };
    case 'fetch_paid_leaves':
      return { totalPaidLeaveDays: obs.totalPaidLeaveDays, totalApprovedRequests: obs.totalApprovedRequests, breakdown: obs.breakdown, message: obs.message };
    case 'fetch_unpaid_absences':
      return { unauthorizedDays: obs.unauthorizedDays, deductionAmount: obs.deductionAmount, formulaUsed: obs.formulaUsed, message: obs.message };
    case 'validate_policy':
      return { isValid: obs.isValid, errors: obs.errors, warnings: obs.warnings, summary: obs.summary, message: obs.message };
    default:
      return { message: obs.message };
  }
}

function _formatResult(result) {
  if (!result) return null;
  return {
    employee: result.employee,
    period: result.period,
    salaryStructure: result.salaryStructure,
    attendance: result.attendance,
    leaves: result.leaves,
    absences: {
      unauthorizedDays: result.absences.unauthorizedDays,
      deductionAmount: result.absences.deductionAmount,
      formulaUsed: result.absences.formulaUsed,
    },
    payslipLines: result.payslipLines,
    summary: result.summary,
    policyValidation: result.policyValidation,
    auditSummary: result.auditSummary,
  };
}

async function _sendNotifications(tenantId, result, payrunId, payslipId) {
  const notifs = [];

  // Notification to employee
  if (result.employee.userId) {
    notifs.push({
      tenant_id: tenantId,
      user_id: result.employee.userId,
      title: 'Your Payslip is Ready',
      message: `Your payslip for ${result.period.start} to ${result.period.end} has been processed. Net pay: ₹${result.summary.netAmount}.`,
      type: 'payslip',
      reference_id: payslipId,
    });
  }

  if (notifs.length > 0) {
    await db.from('notifications').insert(notifs).catch(console.error);
  }
}
