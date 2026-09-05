import { employeeService } from './employeeService';

// Mock Data
let mockContracts = [
  {
    id: 'CON-001',
    employeeId: 'EMP-001',
    status: 'Running',
    startDate: '2025-01-01',
    endDate: null,
    jobPosition: 'Senior Frontend Developer',
    department: 'Engineering',
    wageType: 'Monthly',
    salary: 80000,
    scheduleId: 'SCH-001',
    notes: 'Initial contract after promotion.',
    createdAt: '2024-12-15T10:00:00Z',
  },
  {
    id: 'CON-002',
    employeeId: 'EMP-001',
    status: 'Expired',
    startDate: '2023-01-01',
    endDate: '2024-12-31',
    jobPosition: 'Frontend Developer',
    department: 'Engineering',
    wageType: 'Monthly',
    salary: 65000,
    scheduleId: 'SCH-001',
    notes: 'Initial joining contract.',
    createdAt: '2022-12-10T09:30:00Z',
  },
  {
    id: 'CON-003',
    employeeId: 'EMP-002',
    status: 'Running',
    startDate: '2024-03-01',
    endDate: null,
    jobPosition: 'HR Manager',
    department: 'Human Resources',
    wageType: 'Monthly',
    salary: 75000,
    scheduleId: 'SCH-001',
    notes: '',
    createdAt: '2024-02-25T11:20:00Z',
  }
];

// Helper to simulate network delay
const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

export const contractService = {
  /**
   * Get all contracts, optionally enriched with employee data
   */
  async getContracts() {
    await delay(300);
    const employeesRes = await employeeService.getEmployees({ limit: 1000 });
    const employees = employeesRes.data || [];
    
    return mockContracts.map(contract => {
      const emp = employees.find(e => e.id === contract.employeeId);
      return {
        ...contract,
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
        employeeStatus: emp ? emp.status : 'Unknown',
      };
    });
  },

  /**
   * Get a specific contract by ID
   */
  async getContract(id) {
    await delay(200);
    const contract = mockContracts.find(c => c.id === id);
    if (!contract) throw new Error("Contract not found");
    
    const emp = await employeeService.getEmployee(contract.employeeId);
    return { 
      ...contract,
      employeeName: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
    };
  },

  /**
   * Get all contracts for a specific employee
   */
  async getEmployeeContracts(employeeId) {
    await delay(300);
    return mockContracts
      .filter(c => c.employeeId === employeeId)
      .sort((a, b) => new Date(b.startDate) - new Date(a.startDate)); // Newest first
  },

  /**
   * IMPORTANT FOR PAYROLL:
   * Resolves which 'Running' or historically active contract applies to a given period.
   * A contract applies if its date range overlaps with the period range and it wasn't cancelled/draft.
   */
  async getActiveContractForPeriod(employeeId, periodStart, periodEnd) {
    await delay(200);
    const pStart = new Date(periodStart);
    const pEnd = new Date(periodEnd);

    const contracts = mockContracts.filter(c => 
      c.employeeId === employeeId && 
      (c.status === 'Running' || c.status === 'Expired')
    );

    // Find the overlapping contract
    // Overlap logic: contract.start <= period.end AND (contract.end == null OR contract.end >= period.start)
    const activeContract = contracts.find(c => {
      const cStart = new Date(c.startDate);
      const cEnd = c.endDate ? new Date(c.endDate) : null;
      
      return cStart <= pEnd && (!cEnd || cEnd >= pStart);
    });

    if (!activeContract) {
      throw new Error(`No active contract found for employee ${employeeId} during the specified period.`);
    }

    return activeContract;
  },

  /**
   * Create a new contract
   * Validation: An employee can only have one 'Running' contract at a time
   * that doesn't have an endDate, or overlaps with another 'Running' contract.
   */
  async createContract(data) {
    await delay(500);
    
    // If setting as Running, check for overlapping Running contracts
    if (data.status === 'Running') {
      const existingRunning = mockContracts.find(c => 
        c.employeeId === data.employeeId && 
        c.status === 'Running'
      );
      
      if (existingRunning) {
        throw new Error("This employee already has a 'Running' contract. Please expire or cancel the existing contract first, or set this one to 'Draft'.");
      }
    }

    const newContract = {
      ...data,
      id: `CON-${String(mockContracts.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
    };
    
    mockContracts = [newContract, ...mockContracts];
    return { ...newContract };
  },

  /**
   * Update an existing contract
   */
  async updateContract(id, data) {
    await delay(500);
    const index = mockContracts.findIndex(c => c.id === id);
    if (index === -1) throw new Error("Contract not found");
    
    const contractToUpdate = mockContracts[index];

    // If changing to Running, check for overlaps
    if (data.status === 'Running' && contractToUpdate.status !== 'Running') {
      const existingRunning = mockContracts.find(c => 
        c.employeeId === contractToUpdate.employeeId && 
        c.status === 'Running' &&
        c.id !== id
      );
      
      if (existingRunning) {
        throw new Error("This employee already has a 'Running' contract.");
      }
    }

    mockContracts[index] = { ...contractToUpdate, ...data };
    return { ...mockContracts[index] };
  }
};
