'use strict';

/**
 * Agent Job Store
 * ───────────────
 * In-memory store for tracking agent job state.
 * Each job has a 30-minute TTL after which it is auto-expired.
 *
 * Structure of a job:
 * {
 *   jobId:     string,
 *   status:    'running' | 'completed' | 'error' | 'approved' | 'rejected',
 *   input:     { employeeId, periodStart, periodEnd, tenantId, createdBy },
 *   steps:     [{ tool, status, observation, llmThought, timestamp }],
 *   result:    AgentResult | null,
 *   error:     string | null,
 *   createdAt: Date,
 *   expiresAt: Date,
 * }
 */

const { randomUUID } = require('crypto');

const jobs = new Map();
const TTL_MS = 30 * 60 * 1000; // 30 minutes

// Periodically clean expired jobs every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, job] of jobs.entries()) {
    if (job.expiresAt.getTime() < now) {
      jobs.delete(id);
    }
  }
}, 5 * 60 * 1000);

function createJob(input) {
  const jobId = randomUUID();
  const now = new Date();
  const job = {
    jobId,
    status: 'running',
    input,
    steps: [],
    result: null,
    error: null,
    createdAt: now,
    expiresAt: new Date(now.getTime() + TTL_MS),
  };
  jobs.set(jobId, job);
  return jobId;
}

function getJob(jobId) {
  return jobs.get(jobId) || null;
}

function appendStep(jobId, step) {
  const job = jobs.get(jobId);
  if (!job) return;
  job.steps.push({ ...step, timestamp: new Date().toISOString() });
}

function updateStep(jobId, toolName, update) {
  const job = jobs.get(jobId);
  if (!job) return;
  const step = job.steps.find(s => s.tool === toolName && s.status === 'running');
  if (step) Object.assign(step, update);
}

function setCompleted(jobId, result) {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = 'completed';
  job.result = result;
}

function setError(jobId, errorMessage) {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = 'error';
  job.error = errorMessage;
}

function setApproved(jobId, payrunId, payslipId) {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = 'approved';
  if (job.result) {
    job.result.payrunId = payrunId;
    job.result.payslipId = payslipId;
  }
}

function setRejected(jobId, reason) {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = 'rejected';
  job.rejectionReason = reason;
}

module.exports = {
  createJob,
  getJob,
  appendStep,
  updateStep,
  setCompleted,
  setError,
  setApproved,
  setRejected,
};
