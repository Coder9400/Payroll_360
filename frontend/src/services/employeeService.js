/**
 * Employee Service (Mock)
 * ─────────────────────────
 * Phase 03: Provides isolated mock data and async methods.
 * Replace internals with real API calls (e.g. axios.get('/api/employees'))
 * when the backend is ready, keeping the same method signatures.
 */

// Initial mock data
let mockEmployees = [
  {
    id: 'emp-1',
    employeeId: 'EMP-001',
    firstName: 'Rahul',
    lastName: 'Sharma',
    email: 'rahul@example.com',
    phone: '+91 9876543210',
    department: 'Engineering',
    position: 'Software Developer',
    manager: 'emp-2', // ID of Priya Shah
    employeeType: 'Full Time',
    joiningDate: '2025-08-15',
    status: 'Active',
    workEmail: 'rahul.s@peoplepay.dev',
    workPhone: '+91 8888888888',
    dob: '1995-04-12',
  },
  {
    id: 'emp-2',
    employeeId: 'EMP-002',
    firstName: 'Priya',
    lastName: 'Shah',
    email: 'priya@example.com',
    phone: '+91 9876543211',
    department: 'Engineering',
    position: 'Engineering Manager',
    manager: null,
    employeeType: 'Full Time',
    joiningDate: '2023-01-10',
    status: 'Active',
    workEmail: 'priya.s@peoplepay.dev',
    workPhone: '+91 8888888889',
    dob: '1988-11-20',
  },
  {
    id: 'emp-3',
    employeeId: 'EMP-003',
    firstName: 'Amit',
    lastName: 'Patel',
    email: 'amit@example.com',
    phone: '+91 9876543212',
    department: 'HR',
    position: 'HR Manager',
    manager: null,
    employeeType: 'Full Time',
    joiningDate: '2022-05-01',
    status: 'Active',
    workEmail: 'amit.p@peoplepay.dev',
    workPhone: '+91 8888888890',
    dob: '1990-07-05',
  },
  {
    id: 'emp-4',
    employeeId: 'EMP-004',
    firstName: 'Neha',
    lastName: 'Gupta',
    email: 'neha@example.com',
    phone: '+91 9876543213',
    department: 'Marketing',
    position: 'Marketing Specialist',
    manager: 'emp-5',
    employeeType: 'Part Time',
    joiningDate: '2024-02-15',
    status: 'On Leave',
    workEmail: 'neha.g@peoplepay.dev',
    workPhone: '',
    dob: '1998-09-15',
  },
  {
    id: 'emp-5',
    employeeId: 'EMP-005',
    firstName: 'Vikram',
    lastName: 'Singh',
    email: 'vikram@example.com',
    phone: '+91 9876543214',
    department: 'Marketing',
    position: 'CMO',
    manager: null,
    employeeType: 'Full Time',
    joiningDate: '2021-11-01',
    status: 'Active',
    workEmail: 'vikram.s@peoplepay.dev',
    workPhone: '+91 8888888891',
    dob: '1985-02-28',
  },
  {
    id: 'emp-6',
    employeeId: 'EMP-006',
    firstName: 'Anjali',
    lastName: 'Deshmukh',
    email: 'anjali@example.com',
    phone: '+91 9876543215',
    department: 'Finance',
    position: 'Payroll Specialist',
    manager: null,
    employeeType: 'Full Time',
    joiningDate: '2025-01-10',
    status: 'Probation',
    workEmail: 'anjali.d@peoplepay.dev',
    workPhone: '',
    dob: '1996-12-10',
  },
  {
    id: 'emp-7',
    employeeId: 'EMP-007',
    firstName: 'Suresh',
    lastName: 'Kumar',
    email: 'suresh@example.com',
    phone: '+91 9876543216',
    department: 'Operations',
    position: 'Operations Manager',
    manager: null,
    employeeType: 'Contract',
    joiningDate: '2024-06-01',
    status: 'Inactive',
    workEmail: 'suresh.k@peoplepay.dev',
    workPhone: '+91 8888888892',
    dob: '1982-08-25',
  }
];

// Helper to simulate network delay
const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

export const employeeService = {
  /**
   * Get paginated, filtered, and sorted employees
   */
  async getEmployees(params = {}) {
    await delay();
    
    const {
      page = 1,
      limit = 10,
      search = '',
      department = '',
      position = '',
      status = '',
      employeeType = '',
      manager = '',
      sortBy = 'joiningDate',
      sortOrder = 'desc' // 'asc' or 'desc'
    } = params;

    let results = [...mockEmployees];

    // Filter
    if (search) {
      const s = search.toLowerCase();
      results = results.filter(
        (e) =>
          e.firstName.toLowerCase().includes(s) ||
          e.lastName.toLowerCase().includes(s) ||
          e.email.toLowerCase().includes(s) ||
          e.employeeId.toLowerCase().includes(s)
      );
    }
    if (department) results = results.filter((e) => e.department === department);
    if (position) results = results.filter((e) => e.position === position);
    if (status) results = results.filter((e) => e.status === status);
    if (employeeType) results = results.filter((e) => e.employeeType === employeeType);
    if (manager) results = results.filter((e) => e.manager === manager);

    // Sort
    results.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      
      if (sortBy === 'name') {
        valA = `${a.firstName} ${a.lastName}`.toLowerCase();
        valB = `${b.firstName} ${b.lastName}`.toLowerCase();
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB?.toLowerCase() || '';
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Resolve manager references for the UI
    const enrichedResults = results.map(emp => {
      if (emp.manager) {
        const mgr = mockEmployees.find(m => m.id === emp.manager);
        return { ...emp, managerName: mgr ? `${mgr.firstName} ${mgr.lastName}` : 'Unknown' };
      }
      return { ...emp, managerName: null };
    });

    // Paginate
    const total = enrichedResults.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginatedResults = enrichedResults.slice(start, start + limit);

    return {
      data: paginatedResults,
      meta: {
        total,
        page,
        limit,
        totalPages
      }
    };
  },

  /**
   * Get single employee by ID
   */
  async getEmployee(id) {
    await delay();
    const emp = mockEmployees.find((e) => e.id === id);
    if (!emp) throw new Error('Employee not found');
    
    // Resolve manager
    let managerName = null;
    if (emp.manager) {
      const mgr = mockEmployees.find(m => m.id === emp.manager);
      managerName = mgr ? `${mgr.firstName} ${mgr.lastName}` : 'Unknown';
    }

    return { ...emp, managerName };
  },

  /**
   * Create new employee
   */
  async createEmployee(data) {
    await delay();
    
    // Check if employeeId is unique
    if (mockEmployees.some(e => e.employeeId === data.employeeId)) {
      throw new Error(`Employee ID ${data.employeeId} already exists.`);
    }

    const newEmp = {
      ...data,
      id: `emp-${Date.now()}` // Mock UUID
    };
    mockEmployees = [newEmp, ...mockEmployees];
    return newEmp;
  },

  /**
   * Update existing employee
   */
  async updateEmployee(id, data) {
    await delay();
    const index = mockEmployees.findIndex((e) => e.id === id);
    if (index === -1) throw new Error('Employee not found');

    // Check if new employeeId (if changed) is unique
    if (data.employeeId && data.employeeId !== mockEmployees[index].employeeId) {
       if (mockEmployees.some(e => e.employeeId === data.employeeId)) {
         throw new Error(`Employee ID ${data.employeeId} already exists.`);
       }
    }

    mockEmployees[index] = { ...mockEmployees[index], ...data };
    return mockEmployees[index];
  },

  /**
   * Deactivate employee
   */
  async deactivateEmployee(id) {
    await delay();
    const index = mockEmployees.findIndex((e) => e.id === id);
    if (index === -1) throw new Error('Employee not found');
    
    mockEmployees[index] = { ...mockEmployees[index], status: 'Inactive' };
    return mockEmployees[index];
  },

  /**
   * Get all options for dropdowns (departments, positions)
   * This would typically come from reference data APIs
   */
  async getReferenceData() {
    await delay(100);
    return {
      departments: ['Engineering', 'HR', 'Marketing', 'Finance', 'Operations', 'Sales'],
      positions: [
        'Software Developer', 'Engineering Manager', 'HR Manager', 
        'Marketing Specialist', 'CMO', 'Payroll Specialist', 'Operations Manager'
      ],
      employeeTypes: ['Full Time', 'Part Time', 'Contract', 'Intern'],
      statuses: ['Active', 'Inactive', 'On Leave', 'Probation', 'Terminated'],
      // Get list of active employees for Manager dropdown
      managers: mockEmployees
        .filter(e => e.status !== 'Inactive' && e.status !== 'Terminated')
        .map(e => ({ value: e.id, label: `${e.firstName} ${e.lastName} (${e.employeeId})` }))
    };
  }
};
