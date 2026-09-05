/**
 * Time Off Service
 * ─────────────────
 * Real API calls to the PeoplePay360 backend.
 * All data persists in Supabase PostgreSQL.
 */

import api from './api';

function unwrap(response) {
  return response.data?.data ?? response.data;
}

// Map backend time_off_type → frontend format
function mapType(t) {
  if (!t) return null;
  return {
    id:                 t.id,
    name:               t.name,
    code:               t.code,
    unit:               t.unit ?? 'DAYS',
    isPaid:             t.payroll_integration ?? true,
    requiresAllocation: t.requires_allocation,
    requiresApproval:   t.requires_approval,
    isActive:           t.is_active,
  };
}

// Map backend allocation → frontend format
function mapAllocation(a) {
  if (!a) return null;
  const empName = a.employee
    ? `${a.employee.first_name} ${a.employee.last_name}`
    : (a.employee_name ?? '');
  return {
    id:            a.id,
    employeeId:    a.employee_id,
    employeeName:  empName,
    leaveTypeId:   a.time_off_type_id,
    leaveTypeName: a.time_off_type?.name ?? '',
    year:          a.valid_from ? new Date(a.valid_from).getFullYear() : new Date().getFullYear(),
    allocated:     Number(a.allocated_amount ?? 0),
    approved:      Number(a.approved_amount ?? 0),
    taken:         Number(a.taken_amount ?? 0),
    remaining:     Number(a.remaining_amount ?? 0),
    validFrom:     a.valid_from,
    validTo:       a.valid_to,
    status:        a.status,
    // Legacy field aliases for existing frontend components
    used:          Number(a.taken_amount ?? 0),
    pending:       0,
  };
}

// Map backend time_off_request → frontend format
function mapRequest(r) {
  if (!r) return null;
  const empName = r.employee
    ? `${r.employee.first_name} ${r.employee.last_name}`
    : (r.employee_name ?? '');
  return {
    id:              r.id,
    employeeId:      r.employee_id,
    employeeName:    empName,
    department:      r.employee?.department?.name ?? '',
    leaveTypeId:     r.time_off_type_id,
    leaveTypeName:   r.time_off_type?.name ?? '',
    startDate:       r.start_date,
    endDate:         r.end_date,
    duration:        Number(r.duration ?? 0),
    unit:            r.unit ?? 'DAYS',
    reason:          r.reason ?? '',
    status:          capitalise(r.status),
    submittedAt:     r.created_at,
    approvedBy:      r.approved_by,
    approvedAt:      r.approved_at,
    refusalReason:   r.refusal_reason,
    managerComment:  r.refusal_reason ?? '',
  };
}

function capitalise(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export const timeOffService = {
  // ── Leave Types ─────────────────────────────────────────────────────────────

  async getLeaveTypes(params = {}) {
    const query = new URLSearchParams();
    if (params.is_active !== undefined) query.set('is_active', params.is_active);
    const response = await api.get(`/time-off/types?${query.toString()}`);
    const payload  = unwrap(response);
    return (payload.time_off_types ?? payload.data ?? []).map(mapType);
  },

  async createLeaveType(data) {
    const payload = {
      name:               data.name,
      code:               data.code,
      unit:               data.unit ?? 'DAYS',
      requires_allocation: data.requiresAllocation ?? true,
      requires_approval:   data.requiresApproval ?? true,
      payroll_integration: data.isPaid ?? true,
      is_active:           data.isActive ?? true,
    };
    const response = await api.post('/time-off/types', payload);
    return mapType(unwrap(response));
  },

  async updateLeaveType(id, data) {
    const payload = {};
    if (data.name !== undefined)               payload.name = data.name;
    if (data.code !== undefined)               payload.code = data.code;
    if (data.requiresAllocation !== undefined) payload.requires_allocation = data.requiresAllocation;
    if (data.requiresApproval !== undefined)   payload.requires_approval   = data.requiresApproval;
    if (data.isPaid !== undefined)             payload.payroll_integration  = data.isPaid;
    if (data.isActive !== undefined)           payload.is_active            = data.isActive;
    const response = await api.put(`/time-off/types/${id}`, payload);
    return mapType(unwrap(response));
  },

  // ── Allocations ──────────────────────────────────────────────────────────────

  async getLeaveAllocations(params = {}) {
    const query = new URLSearchParams();
    if (params.page)        query.set('page', params.page);
    if (params.limit)       query.set('limit', params.limit ?? 100);
    if (params.employeeId)  query.set('employee_id', params.employeeId);
    if (params.status)      query.set('status', params.status);
    const response = await api.get(`/time-off/allocations?${query.toString()}`);
    const payload  = unwrap(response);
    return (payload.allocations ?? payload.data ?? []).map(mapAllocation);
  },

  async getEmployeeLeaveBalance(employeeId, params = {}) {
    const response = await api.get(`/employees/${employeeId}/time-off/balances`);
    const payload  = unwrap(response);
    return (payload.balances ?? payload.data ?? []).map(mapAllocation);
  },

  async createLeaveAllocation(data) {
    const payload = {
      employee_id:      data.employeeId,
      time_off_type_id: data.leaveTypeId,
      allocated_amount: data.allocated ?? data.allocatedAmount,
      valid_from:       data.validFrom ?? `${data.year ?? new Date().getFullYear()}-01-01`,
      valid_to:         data.validTo   ?? `${data.year ?? new Date().getFullYear()}-12-31`,
    };
    const response = await api.post('/time-off/allocations', payload);
    return mapAllocation(unwrap(response));
  },

  async approveAllocation(id) {
    const response = await api.post(`/time-off/allocations/${id}/approve`);
    return mapAllocation(unwrap(response));
  },

  async refuseAllocation(id, reason) {
    const response = await api.post(`/time-off/allocations/${id}/refuse`, { reason });
    return mapAllocation(unwrap(response));
  },

  // ── Leave Requests ───────────────────────────────────────────────────────────

  async getLeaveRequests(params = {}) {
    const query = new URLSearchParams();
    if (params.page)        query.set('page', params.page);
    if (params.limit)       query.set('limit', params.limit ?? 100);
    if (params.employeeId)  query.set('employee_id', params.employeeId);
    if (params.status && params.status !== 'All') {
      query.set('status', params.status.toUpperCase());
    }
    const response = await api.get(`/time-off/requests?${query.toString()}`);
    const payload  = unwrap(response);
    return (payload.requests ?? payload.data ?? []).map(mapRequest);
  },

  async getLeaveRequest(id) {
    const response = await api.get(`/time-off/requests/${id}`);
    return mapRequest(unwrap(response));
  },

  async createLeaveRequest(data) {
    const payload = {
      employee_id:      data.employeeId,
      time_off_type_id: data.leaveTypeId,
      start_date:       data.startDate,
      end_date:         data.endDate,
      reason:           data.reason ?? '',
    };
    const response = await api.post('/time-off/requests', payload);
    return mapRequest(unwrap(response));
  },

  async approveLeaveRequest(id) {
    const response = await api.post(`/time-off/requests/${id}/approve`);
    return mapRequest(unwrap(response));
  },

  async rejectLeaveRequest(id, data) {
    const response = await api.post(`/time-off/requests/${id}/refuse`, {
      reason: data?.reason ?? data ?? 'Refused',
    });
    return mapRequest(unwrap(response));
  },

  async cancelLeaveRequest(id) {
    const response = await api.post(`/time-off/requests/${id}/cancel`);
    return mapRequest(unwrap(response));
  },

  // ── Dashboard Stats ─────────────────────────────────────────────────────────

  async getDashboardStats() {
    // Fetch pending requests count and overall allocation totals
    const [reqRes, allocRes] = await Promise.all([
      api.get('/time-off/requests?status=PENDING&limit=1').catch(() => ({ data: { data: { requests: [] } } })),
      api.get('/time-off/allocations?status=APPROVED&limit=500').catch(() => ({ data: { data: { allocations: [] } } })),
    ]);

    const requests   = unwrap(reqRes);
    const allocs     = unwrap(allocRes);
    const allocList  = (allocs.allocations ?? allocs.data ?? []).map(mapAllocation);

    const totalAllocated = allocList.reduce((s, a) => s + a.approved, 0);
    const totalUsed      = allocList.reduce((s, a) => s + a.taken, 0);
    const totalRemaining = allocList.reduce((s, a) => s + a.remaining, 0);

    return {
      pendingRequests: requests.pagination?.total ?? (requests.requests ?? []).length ?? 0,
      totalAllocated,
      totalUsed,
      totalRemaining,
    };
  },
};
