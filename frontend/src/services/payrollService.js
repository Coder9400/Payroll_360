/**
 * Payroll Service
 * ──────────────
 * Real API calls to the PeoplePay360 backend payroll endpoints.
 * Salary Structures, Salary Rules, Payruns, Payslips.
 */

import api from './api';

function unwrap(response) {
  return response.data?.data ?? response.data;
}

// ── Salary Structures ──────────────────────────────────────────────────────────

export const payrollService = {

  // ── Salary Structures ──────────────────────────────────────────────────────

  async getSalaryStructures(params = {}) {
    const q = new URLSearchParams();
    if (params.is_active !== undefined) q.set('is_active', params.is_active);
    const res = await api.get(`/payroll/salary-structures?${q.toString()}`);
    const d = unwrap(res);
    return d.structures ?? d ?? [];
  },

  async getSalaryStructure(id) {
    const res = await api.get(`/payroll/salary-structures/${id}`);
    return unwrap(res);
  },

  async createSalaryStructure(data) {
    const res = await api.post('/payroll/salary-structures', data);
    return unwrap(res);
  },

  async updateSalaryStructure(id, data) {
    const res = await api.patch(`/payroll/salary-structures/${id}`, data);
    return unwrap(res);
  },

  async deleteSalaryStructure(id) {
    await api.delete(`/payroll/salary-structures/${id}`);
  },

  // ── Salary Rules ────────────────────────────────────────────────────────────

  async getSalaryRules(params = {}) {
    const q = new URLSearchParams();
    if (params.structure_id) q.set('structure_id', params.structure_id);
    if (params.is_active !== undefined) q.set('is_active', params.is_active);
    const res = await api.get(`/payroll/salary-rules?${q.toString()}`);
    const d = unwrap(res);
    return d.rules ?? d ?? [];
  },

  async getSalaryRule(id) {
    const res = await api.get(`/payroll/salary-rules/${id}`);
    return unwrap(res);
  },

  async createSalaryRule(data) {
    const res = await api.post('/payroll/salary-rules', data);
    return unwrap(res);
  },

  async updateSalaryRule(id, data) {
    const res = await api.patch(`/payroll/salary-rules/${id}`, data);
    return unwrap(res);
  },

  async deleteSalaryRule(id) {
    await api.delete(`/payroll/salary-rules/${id}`);
  },

  // ── Payruns ─────────────────────────────────────────────────────────────────

  async getPayruns(params = {}) {
    const q = new URLSearchParams();
    if (params.page)   q.set('page',   params.page);
    if (params.limit)  q.set('limit',  params.limit);
    if (params.status) q.set('status', params.status);
    const res = await api.get(`/payruns?${q.toString()}`);
    const d = unwrap(res);
    return d.payruns ?? d ?? [];
  },

  async getPayrun(id) {
    const res = await api.get(`/payruns/${id}`);
    return unwrap(res);
  },

  async createPayrun(data) {
    const res = await api.post('/payruns', data);
    return unwrap(res);
  },

  async getEligibleEmployees(payrunId) {
    const res = await api.get(`/payruns/${payrunId}/eligible-employees`);
    const d = unwrap(res);
    return d.employees ?? d ?? [];
  },

  async computePayrun(payrunId, employeeIds) {
    const res = await api.post(`/payruns/${payrunId}/compute`, { employee_ids: employeeIds });
    return unwrap(res);
  },

  async validatePayrun(payrunId) {
    const res = await api.post(`/payruns/${payrunId}/validate`);
    return unwrap(res);
  },

  async markAsPaid(payrunId) {
    const res = await api.post(`/payruns/${payrunId}/mark-paid`);
    return unwrap(res);
  },

  // ── Payslips ────────────────────────────────────────────────────────────────

  async getPayslips(params = {}) {
    const q = new URLSearchParams();
    if (params.payrun_id)   q.set('payrun_id',   params.payrun_id);
    if (params.employee_id) q.set('employee_id', params.employee_id);
    if (params.status)      q.set('status',      params.status);
    if (params.page)        q.set('page',        params.page);
    if (params.limit)       q.set('limit',       params.limit);
    const res = await api.get(`/payslips?${q.toString()}`);
    const d = unwrap(res);
    return d.payslips ?? d ?? [];
  },

  async getPayslip(id) {
    const res = await api.get(`/payslips/${id}`);
    return unwrap(res);
  },

  async getMyPayslips(params = {}) {
    const q = new URLSearchParams();
    if (params.page)  q.set('page',  params.page);
    if (params.limit) q.set('limit', params.limit);
    const res = await api.get(`/payslips/me?${q.toString()}`);
    const d = unwrap(res);
    return d.payslips ?? d ?? [];
  },
};
