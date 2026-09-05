/**
 * Employee Service
 * ────────────────
 * Real API calls to the PeoplePay360 backend.
 * All data persists in Supabase PostgreSQL.
 */

import api from './api';

// ─── Response helper ──────────────────────────────────────────────────────────
function unwrap(response) {
  return response.data?.data ?? response.data;
}

// List endpoints return a flat envelope: { success, data: [...], page, limit, total, totalPages }.
// This normalizes that (or a payload nested under a named key) into a plain array + meta.
function unwrapList(response, key) {
  const body = response.data ?? {};
  const payload = body.data;
  const list = Array.isArray(payload)
    ? payload
    : (payload?.[key] ?? payload?.data ?? []);
  const meta = Array.isArray(payload) ? body : (payload?.pagination ?? payload?.meta ?? payload ?? body);
  return {
    list,
    meta: {
      total: meta.total ?? list.length,
      page: meta.page ?? 1,
      limit: meta.limit ?? list.length,
      totalPages: meta.totalPages ?? 1,
    },
  };
}

// ─── Field name mapper: backend (snake_case) → frontend (camelCase) ───────────
function mapEmployee(e) {
  if (!e) return null;
  return {
    id:           e.id,
    employeeId:   e.employee_code,
    firstName:    e.first_name,
    lastName:     e.last_name,
    email:        e.email,
    phone:        e.phone ?? '',
    department:   e.departments?.name ?? e.department_id ?? '',
    departmentId: e.department_id,
    position:     e.job_positions?.name ?? e.job_position_id ?? '',
    jobPositionId:e.job_position_id,
    manager:      e.manager_id ?? null,
    managerName:  e.manager ? `${e.manager.first_name} ${e.manager.last_name}` : null,
    employeeType: e.employee_type,
    joiningDate:  e.date_of_joining,
    dob:          e.date_of_birth ?? '',
    status:       e.employment_status,
    workingScheduleId: e.working_schedule_id,
    address:      e.address ?? '',
    bankAccount:  e.bank_account ?? '',
    createdAt:    e.created_at,
  };
}

export const employeeService = {
  /**
   * Get paginated, filtered employees
   */
  async getEmployees(params = {}) {
    const query = new URLSearchParams();
    if (params.page)         query.set('page', params.page);
    if (params.limit)        query.set('limit', params.limit);
    if (params.search)       query.set('search', params.search);
    if (params.department)   query.set('department_id', params.department);
    if (params.position)     query.set('job_position_id', params.position);
    if (params.manager)      query.set('manager_id', params.manager);
    if (params.status)       query.set('employment_status', params.status);
    if (params.employeeType) query.set('employee_type', params.employeeType);
    if (params.sortBy)       query.set('sort_by', params.sortBy);
    if (params.sortOrder)    query.set('sort_order', params.sortOrder);

    const response = await api.get(`/employees?${query.toString()}`);
    const { list, meta } = unwrapList(response, 'employees');

    return {
      data: list.map(mapEmployee),
      meta,
    };
  },

  /**
   * Get single employee by ID
   */
  async getEmployee(id) {
    const response = await api.get(`/employees/${id}`);
    return mapEmployee(unwrap(response));
  },

  /**
   * Create new employee
   */
  async createEmployee(data) {
    const payload = {
      employee_code:      data.employeeId,
      first_name:         data.firstName,
      last_name:          data.lastName,
      email:              data.email,
      phone:              data.phone || null,
      date_of_birth:      data.dob || null,
      date_of_joining:    data.joiningDate,
      department_id:      data.departmentId,
      job_position_id:    data.jobPositionId,
      manager_id:         data.manager || null,
      working_schedule_id:data.workingScheduleId,
      employee_type:      data.employeeType?.toUpperCase().replace(' ', '_') ?? 'FULL_TIME',
      employment_status:  data.status?.toUpperCase() ?? 'ACTIVE',
      address:            data.address || null,
      bank_account:       data.bankAccount || null,
      user_id:            data.userId || null,
    };
    const response = await api.post('/employees', payload);
    return mapEmployee(unwrap(response));
  },

  /**
   * Update employee
   */
  async updateEmployee(id, data) {
    const payload = {};
    if (data.firstName)        payload.first_name        = data.firstName;
    if (data.lastName)         payload.last_name         = data.lastName;
    if (data.email)            payload.email             = data.email;
    if (data.phone !== undefined) payload.phone          = data.phone;
    if (data.dob)              payload.date_of_birth     = data.dob;
    if (data.joiningDate)      payload.date_of_joining   = data.joiningDate;
    if (data.departmentId)     payload.department_id     = data.departmentId;
    if (data.jobPositionId)    payload.job_position_id   = data.jobPositionId;
    if (data.manager !== undefined) payload.manager_id   = data.manager || null;
    if (data.workingScheduleId) payload.working_schedule_id = data.workingScheduleId;
    if (data.employeeType)     payload.employee_type     = data.employeeType?.toUpperCase().replace(' ', '_');
    if (data.status)           payload.employment_status = data.status?.toUpperCase();
    if (data.address !== undefined) payload.address      = data.address;
    if (data.bankAccount !== undefined) payload.bank_account = data.bankAccount;

    const response = await api.put(`/employees/${id}`, payload);
    return mapEmployee(unwrap(response));
  },

  /**
   * Deactivate employee
   */
  async deactivateEmployee(id) {
    const response = await api.patch(`/employees/${id}/deactivate`);
    return mapEmployee(unwrap(response));
  },

  /**
   * Provision Employee Login Account
   */
  async provisionAccount(id) {
    const response = await api.post(`/employees/${id}/provision-account`);
    return unwrap(response);
  },

  /**
   * Disable Employee Login Account
   */
  async disableAccount(id) {
    const response = await api.post(`/employees/${id}/disable-account`);
    return unwrap(response);
  },

  /**
   * Get reference data for dropdowns
   */
  async getReferenceData() {
    const [deptRes, posRes, schedRes] = await Promise.all([
      api.get('/departments?is_active=true&limit=200'),
      api.get('/job-positions?is_active=true&limit=200'),
      api.get('/schedules?limit=200'),
    ]);

    const departments = unwrapList(deptRes, 'departments').list
      .map(d => ({ id: d.id, value: d.id, label: d.name, name: d.name }));

    const positions = unwrapList(posRes, 'job_positions').list
      .map(p => ({ id: p.id, value: p.id, label: p.name, name: p.name, departmentId: p.department_id }));

    const schedules = unwrapList(schedRes, 'schedules').list
      .map(s => ({ id: s.id, value: s.id, label: `${s.name} (${s.hours_week}h/wk)`, name: s.name }));

    // Fetch active employees for manager dropdown
    const empRes = await api.get('/employees?employment_status=ACTIVE&limit=500');
    const managers = unwrapList(empRes, 'employees').list
      .map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name} (${e.employee_code})` }));

    return {
      departments:   departments.map(d => d.name),
      departmentOptions: departments,
      positions:     positions.map(p => p.name),
      positionOptions: positions,
      schedules,
      employeeTypes: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'],
      statuses:      ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'PROBATION', 'TERMINATED'],
      managers,
    };
  },
};
