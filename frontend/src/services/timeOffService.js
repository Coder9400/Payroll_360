// Mock data for Phase 05 Time Off Module

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let mockLeaveTypes = [
  { id: 'LT-01', name: 'Annual Leave', code: 'AL', isPaid: true, requiresAllocation: true, isActive: true },
  { id: 'LT-02', name: 'Sick Leave', code: 'SL', isPaid: true, requiresAllocation: true, isActive: true },
  { id: 'LT-03', name: 'Unpaid Leave', code: 'UL', isPaid: false, requiresAllocation: false, isActive: true },
];

let mockAllocations = [
  { id: 'LA-01', employeeId: 'EMP-001', employeeName: 'Rahul Sharma', leaveTypeId: 'LT-01', leaveTypeName: 'Annual Leave', year: 2026, allocated: 20, used: 8, pending: 2, remaining: 10, status: 'Active' },
  { id: 'LA-02', employeeId: 'EMP-001', employeeName: 'Rahul Sharma', leaveTypeId: 'LT-02', leaveTypeName: 'Sick Leave', year: 2026, allocated: 12, used: 3, pending: 0, remaining: 9, status: 'Active' },
  { id: 'LA-03', employeeId: 'EMP-002', employeeName: 'Priya Patel', leaveTypeId: 'LT-01', leaveTypeName: 'Annual Leave', year: 2026, allocated: 22, used: 5, pending: 0, remaining: 17, status: 'Active' },
];

let mockRequests = [
  { id: 'REQ-001', employeeId: 'EMP-001', employeeName: 'Rahul Sharma', department: 'Engineering', leaveTypeId: 'LT-01', leaveTypeName: 'Annual Leave', startDate: '2026-09-10', endDate: '2026-09-11', duration: 2, reason: 'Family trip', status: 'Pending', submittedAt: '2026-09-01T10:00:00Z', managerComment: '' },
  { id: 'REQ-002', employeeId: 'EMP-001', employeeName: 'Rahul Sharma', department: 'Engineering', leaveTypeId: 'LT-02', leaveTypeName: 'Sick Leave', startDate: '2026-08-15', endDate: '2026-08-17', duration: 3, reason: 'Flu', status: 'Approved', submittedAt: '2026-08-15T08:00:00Z', managerComment: 'Get well soon.' },
  { id: 'REQ-003', employeeId: 'EMP-002', employeeName: 'Priya Patel', department: 'Sales', leaveTypeId: 'LT-01', leaveTypeName: 'Annual Leave', startDate: '2026-09-20', endDate: '2026-09-24', duration: 5, reason: 'Vacation', status: 'Pending', submittedAt: '2026-09-02T11:00:00Z', managerComment: '' },
];

export const timeOffService = {
  // ── Leave Types ────────────────────────────────────────────────────────
  async getLeaveTypes() {
    await delay(300);
    return [...mockLeaveTypes];
  },
  
  async createLeaveType(data) {
    await delay(500);
    const newType = {
      id: `LT-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      ...data
    };
    mockLeaveTypes.push(newType);
    return newType;
  },

  async updateLeaveType(id, data) {
    await delay(500);
    const index = mockLeaveTypes.findIndex(t => t.id === id);
    if (index === -1) throw new Error("Leave type not found");
    mockLeaveTypes[index] = { ...mockLeaveTypes[index], ...data };
    return mockLeaveTypes[index];
  },

  // ── Allocations & Balances ───────────────────────────────────────────────
  async getLeaveAllocations(params = {}) {
    await delay(400);
    let results = [...mockAllocations];
    if (params.employeeId) {
      results = results.filter(a => a.employeeId === params.employeeId);
    }
    return results;
  },

  async getEmployeeLeaveBalance(employeeId, params = {}) {
    await delay(300);
    const year = params.year || new Date().getFullYear();
    // Return all allocations for this employee for the given year
    return mockAllocations.filter(a => a.employeeId === employeeId && a.year === year);
  },

  async createLeaveAllocation(data) {
    await delay(600);
    // Find the leave type name
    const lt = mockLeaveTypes.find(t => t.id === data.leaveTypeId);
    if (!lt) throw new Error("Leave type not found");

    const newAlloc = {
      id: `LA-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      employeeName: data.employeeName || 'Unknown Employee',
      leaveTypeName: lt.name,
      used: 0,
      pending: 0,
      remaining: data.allocated,
      status: 'Active',
      ...data
    };
    mockAllocations.push(newAlloc);
    return newAlloc;
  },

  // ── Leave Requests ────────────────────────────────────────────────────────
  async getLeaveRequests(params = {}) {
    await delay(500);
    let results = [...mockRequests];
    if (params.status && params.status !== 'All') {
      results = results.filter(r => r.status === params.status);
    }
    if (params.employeeId) {
      results = results.filter(r => r.employeeId === params.employeeId);
    }
    // Sort by submittedAt descending
    results.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    return results;
  },

  async getLeaveRequest(id) {
    await delay(300);
    const req = mockRequests.find(r => r.id === id);
    if (!req) throw new Error("Request not found");
    return req;
  },

  async createLeaveRequest(data) {
    await delay(700);
    
    // In a real app, the backend would calculate duration and check balance.
    // We will do a basic mock check here to prevent over-requesting if allocation is required.
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const duration = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1); // Mock duration calculation
    
    const lt = mockLeaveTypes.find(t => t.id === data.leaveTypeId);
    if (!lt) throw new Error("Leave type not found");

    if (lt.requiresAllocation) {
      const year = start.getFullYear();
      const alloc = mockAllocations.find(a => a.employeeId === data.employeeId && a.leaveTypeId === data.leaveTypeId && a.year === year);
      
      if (!alloc) throw new Error("No allocation exists for this leave type and year.");
      if (alloc.remaining < duration) throw new Error(`Insufficient balance. Available: ${alloc.remaining}, Requested: ${duration}`);
      
      // Update the mock allocation to reflect the pending request
      alloc.pending += duration;
      alloc.remaining -= duration;
    }

    const newReq = {
      id: `REQ-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      employeeName: data.employeeName || 'Current User', // Mock name
      department: data.department || 'General',
      leaveTypeName: lt.name,
      duration: duration,
      status: 'Pending',
      submittedAt: new Date().toISOString(),
      managerComment: '',
      ...data
    };
    
    mockRequests.push(newReq);
    return newReq;
  },

  async approveLeaveRequest(id) {
    await delay(600);
    const index = mockRequests.findIndex(r => r.id === id);
    if (index === -1) throw new Error("Request not found");
    
    const req = mockRequests[index];
    if (req.status !== 'Pending') throw new Error("Can only approve pending requests.");
    
    req.status = 'Approved';
    req.managerComment = 'Approved';
    
    // Update allocation if required
    const lt = mockLeaveTypes.find(t => t.id === req.leaveTypeId);
    if (lt && lt.requiresAllocation) {
      const start = new Date(req.startDate);
      const alloc = mockAllocations.find(a => a.employeeId === req.employeeId && a.leaveTypeId === req.leaveTypeId && a.year === start.getFullYear());
      if (alloc) {
        alloc.pending -= req.duration;
        alloc.used += req.duration;
      }
    }
    
    return req;
  },

  async rejectLeaveRequest(id, data) {
    await delay(600);
    const index = mockRequests.findIndex(r => r.id === id);
    if (index === -1) throw new Error("Request not found");
    
    const req = mockRequests[index];
    if (req.status !== 'Pending') throw new Error("Can only reject pending requests.");
    
    if (!data.reason) throw new Error("Rejection reason is required.");
    
    req.status = 'Rejected';
    req.managerComment = data.reason;
    
    // Refund pending balance if required
    const lt = mockLeaveTypes.find(t => t.id === req.leaveTypeId);
    if (lt && lt.requiresAllocation) {
      const start = new Date(req.startDate);
      const alloc = mockAllocations.find(a => a.employeeId === req.employeeId && a.leaveTypeId === req.leaveTypeId && a.year === start.getFullYear());
      if (alloc) {
        alloc.pending -= req.duration;
        alloc.remaining += req.duration; // refund the pending amount back to remaining
      }
    }
    
    return req;
  },

  // ── Global Stats (for Time Off HR Dashboard) ───────────────────────────
  async getDashboardStats() {
    await delay(400);
    const pendingReqs = mockRequests.filter(r => r.status === 'Pending').length;
    let totalAllocated = 0;
    let totalUsed = 0;
    let totalRemaining = 0;

    mockAllocations.forEach(a => {
      totalAllocated += a.allocated;
      totalUsed += a.used;
      totalRemaining += a.remaining;
    });

    return {
      pendingRequests: pendingReqs,
      totalAllocated,
      totalUsed,
      totalRemaining
    };
  }
};
