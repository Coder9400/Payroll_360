/**
 * Contract Service
 * ────────────────
 * Real API calls to the PeoplePay360 backend.
 * All data persists in Supabase PostgreSQL.
 */

import api from './api';

function unwrap(response) {
  return response.data?.data ?? response.data;
}

// Backend status (DRAFT/ACTIVE/EXPIRED/TERMINATED) → frontend display (Draft/Running/Expired/Cancelled)
const STATUS_TO_UI = { DRAFT: 'Draft', ACTIVE: 'Running', EXPIRED: 'Expired', TERMINATED: 'Cancelled' };
const STATUS_TO_API = { Draft: 'DRAFT', Running: 'ACTIVE', Expired: 'EXPIRED', Cancelled: 'TERMINATED' };

function mapContract(c) {
  if (!c) return null;
  const emp = c.employees ?? {};
  return {
    id:             c.id,
    employeeId:     c.employee_id,
    employeeCode:   emp.employee_code ?? '',
    employeeName:   emp.first_name ? `${emp.first_name} ${emp.last_name}` : '',
    contractNumber: c.contract_number,
    status:         STATUS_TO_UI[c.status] ?? c.status,
    startDate:      c.start_date,
    endDate:        c.end_date,
    jobPosition:    c.job_positions?.name ?? '',
    jobPositionId:  c.job_position_id,
    department:     c.departments?.name ?? '',
    departmentId:   c.department_id,
    wageType:       'Monthly',
    salary:         Number(c.wage ?? 0),
    currency:       c.currency ?? 'USD',
    scheduleId:     c.working_schedule_id,
    employmentType: c.employment_type,
    salaryStructureId: c.salary_structure_id,
    notes:          c.notes ?? '',
    createdAt:      c.created_at,
  };
}

function toApiPayload(data) {
  const payload = {};
  if (data.employeeId !== undefined)     payload.employee_id = data.employeeId;
  if (data.contractNumber !== undefined) payload.contract_number = data.contractNumber;
  if (data.startDate !== undefined)      payload.start_date = data.startDate;
  if (data.endDate !== undefined)        payload.end_date = data.endDate || null;
  if (data.status !== undefined)         payload.status = STATUS_TO_API[data.status] ?? data.status;
  if (data.departmentId !== undefined)   payload.department_id = data.departmentId;
  if (data.jobPositionId !== undefined)  payload.job_position_id = data.jobPositionId;
  if (data.scheduleId !== undefined)     payload.working_schedule_id = data.scheduleId;
  if (data.salary !== undefined)         payload.wage = Number(data.salary);
  if (data.currency !== undefined)       payload.currency = data.currency;
  if (data.employmentType !== undefined) payload.employment_type = data.employmentType;
  return payload;
}

export const contractService = {
  /**
   * Get all contracts, optionally filtered
   */
  async getContracts(params = {}) {
    const query = new URLSearchParams();
    if (params.employeeId) query.set('employee_id', params.employeeId);
    if (params.status)     query.set('status', STATUS_TO_API[params.status] ?? params.status);
    if (params.limit)      query.set('limit', params.limit);

    const response = await api.get(`/contracts?${query.toString()}`);
    const payload  = unwrap(response);
    return (payload.data ?? payload ?? []).map(mapContract);
  },

  /**
   * Get a specific contract by ID
   */
  async getContract(id) {
    const response = await api.get(`/contracts/${id}`);
    return mapContract(unwrap(response));
  },

  /**
   * Get all contracts for a specific employee
   */
  async getEmployeeContracts(employeeId) {
    const contracts = await this.getContracts({ employeeId });
    return contracts.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  },

  /**
   * Resolves which active contract applies to a given period (used by payroll).
   */
  async getActiveContractForPeriod(employeeId, date) {
    const response = await api.get(`/contracts/applicable/${employeeId}/${date}`);
    return mapContract(unwrap(response));
  },

  /**
   * Create a new contract
   */
  async createContract(data) {
    const payload = {
      ...toApiPayload(data),
      status: STATUS_TO_API[data.status] ?? data.status ?? 'DRAFT',
      employment_type: data.employmentType ?? 'FULL_TIME',
      currency: data.currency ?? 'USD',
    };
    const response = await api.post('/contracts', payload);
    return mapContract(unwrap(response));
  },

  /**
   * Update an existing contract
   */
  async updateContract(id, data) {
    const response = await api.patch(`/contracts/${id}`, toApiPayload(data));
    return mapContract(unwrap(response));
  },
};
