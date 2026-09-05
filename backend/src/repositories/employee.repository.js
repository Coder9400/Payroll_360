/**
 * Employee Repository
 * Dual-mode: Supabase (production) / in-memory (development & test)
 * This is the central entity for payroll, contracts, attendance, and leave.
 */

const { supabase, supabaseAdmin, isConfigured } = require('../config/supabase');
const config = require('../config/env');
const AppError = require('../utils/appError');

// In-memory store seeded with 6 demo employees
const mockEmployees = new Map([
  ['e0000001-0000-4000-8000-000000000001', {
    id: 'e0000001-0000-4000-8000-000000000001',
    employee_number: 'EMP-0001',
    first_name: 'Alice', last_name: 'Sharma',
    email: 'alice.sharma@peoplepay360.com', phone: '+91-9000000001',
    department_id: 'd0000001-0000-4000-8000-000000000001',
    position_id:   'p0000001-0000-4000-8000-000000000002',
    manager_id: null,
    date_of_joining: '2023-01-15', employment_status: 'active',
    bank_name: null, bank_account_no: null, bank_ifsc_code: null,
    is_active: true,
    created_at: '2023-01-15T00:00:00.000Z', updated_at: '2023-01-15T00:00:00.000Z',
  }],
  ['e0000001-0000-4000-8000-000000000002', {
    id: 'e0000001-0000-4000-8000-000000000002',
    employee_number: 'EMP-0002',
    first_name: 'Rohan', last_name: 'Mehta',
    email: 'rohan.mehta@peoplepay360.com', phone: '+91-9000000002',
    department_id: 'd0000001-0000-4000-8000-000000000002',
    position_id:   'p0000001-0000-4000-8000-000000000003',
    manager_id: 'e0000001-0000-4000-8000-000000000001',
    date_of_joining: '2023-03-01', employment_status: 'active',
    bank_name: null, bank_account_no: null, bank_ifsc_code: null,
    is_active: true,
    created_at: '2023-03-01T00:00:00.000Z', updated_at: '2023-03-01T00:00:00.000Z',
  }],
  ['e0000001-0000-4000-8000-000000000003', {
    id: 'e0000001-0000-4000-8000-000000000003',
    employee_number: 'EMP-0003',
    first_name: 'Priya', last_name: 'Patel',
    email: 'priya.patel@peoplepay360.com', phone: '+91-9000000003',
    department_id: 'd0000001-0000-4000-8000-000000000003',
    position_id:   'p0000001-0000-4000-8000-000000000005',
    manager_id: 'e0000001-0000-4000-8000-000000000001',
    date_of_joining: '2023-04-10', employment_status: 'active',
    bank_name: null, bank_account_no: null, bank_ifsc_code: null,
    is_active: true,
    created_at: '2023-04-10T00:00:00.000Z', updated_at: '2023-04-10T00:00:00.000Z',
  }],
  ['e0000001-0000-4000-8000-000000000004', {
    id: 'e0000001-0000-4000-8000-000000000004',
    employee_number: 'EMP-0004',
    first_name: 'Arjun', last_name: 'Singh',
    email: 'arjun.singh@peoplepay360.com', phone: '+91-9000000004',
    department_id: 'd0000001-0000-4000-8000-000000000001',
    position_id:   'p0000001-0000-4000-8000-000000000001',
    manager_id: 'e0000001-0000-4000-8000-000000000001',
    date_of_joining: '2023-06-15', employment_status: 'active',
    bank_name: null, bank_account_no: null, bank_ifsc_code: null,
    is_active: true,
    created_at: '2023-06-15T00:00:00.000Z', updated_at: '2023-06-15T00:00:00.000Z',
  }],
  ['e0000001-0000-4000-8000-000000000005', {
    id: 'e0000001-0000-4000-8000-000000000005',
    employee_number: 'EMP-0005',
    first_name: 'Nisha', last_name: 'Gupta',
    email: 'nisha.gupta@peoplepay360.com', phone: '+91-9000000005',
    department_id: 'd0000001-0000-4000-8000-000000000002',
    position_id:   'p0000001-0000-4000-8000-000000000004',
    manager_id: 'e0000001-0000-4000-8000-000000000002',
    date_of_joining: '2023-09-01', employment_status: 'active',
    bank_name: null, bank_account_no: null, bank_ifsc_code: null,
    is_active: true,
    created_at: '2023-09-01T00:00:00.000Z', updated_at: '2023-09-01T00:00:00.000Z',
  }],
  ['e0000001-0000-4000-8000-000000000006', {
    id: 'e0000001-0000-4000-8000-000000000006',
    employee_number: 'EMP-0006',
    first_name: 'Karan', last_name: 'Verma',
    email: 'karan.verma@peoplepay360.com', phone: '+91-9000000006',
    department_id: 'd0000001-0000-4000-8000-000000000001',
    position_id:   'p0000001-0000-4000-8000-000000000001',
    manager_id: 'e0000001-0000-4000-8000-000000000001',
    date_of_joining: '2023-07-01', employment_status: 'terminated',
    bank_name: null, bank_account_no: null, bank_ifsc_code: null,
    is_active: false,
    created_at: '2023-07-01T00:00:00.000Z', updated_at: '2023-07-01T00:00:00.000Z',
  }],
]);

// Auto-increment counter for employee numbers in mock mode
let _mockEmpCounter = 7;

class EmployeeRepository {
  _useDB() {
    return isConfigured && (supabaseAdmin || supabase);
  }

  _client() {
    return supabaseAdmin || supabase;
  }

  /**
   * List employees with optional filters
   * @param {object} filters
   */
  async findAll({ departmentId = null, positionId = null, status = null, includeInactive = false } = {}) {
    if (this._useDB()) {
      let query = this._client().from('employees').select('*').order('last_name');
      if (!includeInactive) query = query.eq('is_active', true);
      if (departmentId)     query = query.eq('department_id', departmentId);
      if (positionId)       query = query.eq('position_id', positionId);
      if (status)           query = query.eq('employment_status', status);
      const { data, error } = await query;
      if (error) {
        if (config.isProduction) throw new AppError(`DB error: ${error.message}`, 500, 'DATABASE_ERROR');
      } else {
        return data || [];
      }
    }
    let all = Array.from(mockEmployees.values());
    if (!includeInactive) all = all.filter((e) => e.is_active);
    if (departmentId)     all = all.filter((e) => e.department_id === departmentId);
    if (positionId)       all = all.filter((e) => e.position_id   === positionId);
    if (status)           all = all.filter((e) => e.employment_status === status);
    return all;
  }

  /**
   * Find employee by ID
   */
  async findById(id) {
    if (this._useDB()) {
      const { data, error } = await this._client()
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return mockEmployees.get(id) || null;
        if (config.isProduction) throw new AppError(`DB error: ${error.message}`, 500, 'DATABASE_ERROR');
      } else if (data) {
        return data;
      }
    }
    return mockEmployees.get(id) || null;
  }

  /**
   * Find employee by email
   */
  async findByEmail(email) {
    const lower = (email || '').toLowerCase().trim();
    if (this._useDB()) {
      const { data, error } = await this._client()
        .from('employees')
        .select('*')
        .eq('email', lower)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return null;
        if (config.isProduction) throw new AppError(`DB error: ${error.message}`, 500, 'DATABASE_ERROR');
      } else {
        return data || null;
      }
    }
    for (const emp of mockEmployees.values()) {
      if (emp.email === lower) return emp;
    }
    return null;
  }

  /**
   * Generate the next employee number (mock mode)
   */
  _nextEmployeeNumber() {
    return `EMP-${String(_mockEmpCounter++).padStart(4, '0')}`;
  }

  /**
   * Create a new employee
   */
  async create({ firstName, lastName, email, phone, departmentId, positionId, managerId, dateOfJoining, employmentStatus, bankName, bankAccountNo, bankIfscCode }) {
    const now = new Date().toISOString();
    const payload = {
      first_name:        firstName,
      last_name:         lastName,
      email:             email.toLowerCase().trim(),
      phone:             phone || null,
      department_id:     departmentId || null,
      position_id:       positionId   || null,
      manager_id:        managerId    || null,
      date_of_joining:   dateOfJoining,
      employment_status: employmentStatus || 'active',
      bank_name:         bankName      || null,
      bank_account_no:   bankAccountNo || null,
      bank_ifsc_code:    bankIfscCode  || null,
      is_active:         true,
      updated_at:        now,
    };

    if (this._useDB()) {
      // DB auto-generates employee_number via sequence or trigger; we pass none
      const { data, error } = await this._client()
        .from('employees')
        .insert(payload)
        .select()
        .single();
      if (error) {
        if (config.isProduction) throw new AppError(`Failed to create employee: ${error.message}`, 500, 'DATABASE_ERROR');
      } else if (data) {
        mockEmployees.set(data.id, data);
        return data;
      }
    }

    const id = `e${Date.now().toString(16).slice(-8)}-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padStart(12, '0')}`;
    const record = { id, employee_number: this._nextEmployeeNumber(), ...payload, created_at: now };
    mockEmployees.set(id, record);
    return record;
  }

  /**
   * Update an employee record
   */
  async update(id, fields) {
    const allowed = [
      'first_name', 'last_name', 'email', 'phone',
      'department_id', 'position_id', 'manager_id',
      'date_of_joining', 'employment_status',
      'bank_name', 'bank_account_no', 'bank_ifsc_code',
    ];

    const updates = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (fields[key] !== undefined) updates[key] = fields[key];
    }
    // camelCase → snake_case mapping for incoming service layer
    const camelToSnake = {
      firstName:        'first_name',
      lastName:         'last_name',
      departmentId:     'department_id',
      positionId:       'position_id',
      managerId:        'manager_id',
      dateOfJoining:    'date_of_joining',
      employmentStatus: 'employment_status',
      bankName:         'bank_name',
      bankAccountNo:    'bank_account_no',
      bankIfscCode:     'bank_ifsc_code',
    };
    for (const [camel, snake] of Object.entries(camelToSnake)) {
      if (fields[camel] !== undefined) updates[snake] = fields[camel];
    }
    if (fields.phone !== undefined) updates.phone = fields.phone;
    if (fields.email !== undefined) updates.email = fields.email;

    if (this._useDB()) {
      const { data, error } = await this._client()
        .from('employees')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        if (error.code === 'PGRST116') return null;
        if (config.isProduction) throw new AppError(`Failed to update employee: ${error.message}`, 500, 'DATABASE_ERROR');
      } else if (data) {
        mockEmployees.set(id, data);
        return data;
      }
    }

    const existing = mockEmployees.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    mockEmployees.set(id, updated);
    return updated;
  }

  /**
   * Update employment status (and is_active flag)
   */
  async updateStatus(id, status) {
    const isActive = status !== 'terminated';
    return this.update(id, { employmentStatus: status, is_active: isActive });
  }
}

module.exports = new EmployeeRepository();
