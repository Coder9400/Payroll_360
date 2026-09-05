// Mock Data Layer for Attendance Module
// Simulates API interactions for Phase 04

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getTodayDateString = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

// Mock Attendance Records
let attendanceData = [
  {
    id: "ATT-001",
    employeeId: "EMP-001",
    employeeName: "Rahul Sharma",
    department: "Engineering",
    date: getTodayDateString(),
    checkIn: `${getTodayDateString()}T09:15:00Z`,
    checkOut: `${getTodayDateString()}T18:00:00Z`,
    scheduledHours: 8,
    workedHours: 8.75,
    overtime: 0.75,
    status: "Present",
  },
  {
    id: "ATT-002",
    employeeId: "EMP-002",
    employeeName: "Priya Patel",
    department: "Marketing",
    date: getTodayDateString(),
    checkIn: `${getTodayDateString()}T09:45:00Z`,
    checkOut: null,
    scheduledHours: 8,
    workedHours: null,
    overtime: null,
    status: "Late",
  },
  {
    id: "ATT-003",
    employeeId: "EMP-003",
    employeeName: "Amit Singh",
    department: "Sales",
    date: getTodayDateString(),
    checkIn: null,
    checkOut: null,
    scheduledHours: 8,
    workedHours: null,
    overtime: null,
    status: "Leave",
  },
  {
    id: "ATT-004",
    employeeId: "EMP-001",
    employeeName: "Rahul Sharma",
    department: "Engineering",
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
    checkIn: `${new Date(Date.now() - 86400000).toISOString().split('T')[0]}T09:00:00Z`,
    checkOut: null,
    scheduledHours: 8,
    workedHours: null,
    overtime: null,
    status: "Missing Checkout",
  },
];

// Mock Regularization Requests
let regularizationRequests = [
  {
    id: "REG-001",
    attendanceId: "ATT-004",
    employeeId: "EMP-001",
    employeeName: "Rahul Sharma",
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    originalCheckIn: `${new Date(Date.now() - 86400000).toISOString().split('T')[0]}T09:00:00Z`,
    originalCheckOut: null,
    requestedCheckIn: `${new Date(Date.now() - 86400000).toISOString().split('T')[0]}T09:00:00Z`,
    requestedCheckOut: `${new Date(Date.now() - 86400000).toISOString().split('T')[0]}T18:00:00Z`,
    reason: "Forgot to check out while leaving in a rush.",
    status: "Pending",
    submittedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    managerComment: null
  }
];

export const attendanceService = {
  /**
   * Fetch all attendance records (HR view)
   */
  getAttendance: async (params = {}) => {
    await delay(600); // simulate network latency
    let results = [...attendanceData];

    if (params.search) {
      const q = params.search.toLowerCase();
      results = results.filter(
        (a) =>
          a.employeeName.toLowerCase().includes(q) ||
          a.employeeId.toLowerCase().includes(q)
      );
    }
    if (params.department && params.department !== 'All Departments') {
      results = results.filter((a) => a.department === params.department);
    }
    if (params.status && params.status !== 'All Statuses') {
      results = results.filter((a) => a.status === params.status);
    }
    
    // Sort
    results.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Summary metrics (mock)
    const today = getTodayDateString();
    const todayRecords = results.filter(r => r.date === today);
    const presentToday = todayRecords.filter(r => r.status === 'Present' || r.status === 'Late').length;
    const absentToday = todayRecords.filter(r => r.status === 'Absent').length;
    const lateToday = todayRecords.filter(r => r.status === 'Late').length;
    const missingCheckout = results.filter(r => r.status === 'Missing Checkout').length;

    return {
      data: results,
      metrics: {
        presentToday,
        absentToday,
        lateToday,
        missingCheckout
      }
    };
  },

  /**
   * Fetch attendance records for a specific employee
   */
  getEmployeeAttendance: async (employeeId, params = {}) => {
    await delay(500);
    const results = attendanceData.filter(a => a.employeeId === employeeId);
    
    // Calculate employee-specific mock metrics
    const presentDays = results.filter(r => r.status === 'Present' || r.status === 'Late').length;
    const absentDays = results.filter(r => r.status === 'Absent').length;
    const leaveDays = results.filter(r => r.status === 'Leave').length;
    const totalWorkedHours = results.reduce((acc, curr) => acc + (curr.workedHours || 0), 0);
    
    return {
      data: results.sort((a, b) => new Date(b.date) - new Date(a.date)),
      metrics: {
        presentDays,
        absentDays,
        leaveDays,
        totalWorkedHours
      }
    };
  },

  /**
   * Fetch a single attendance record
   */
  getAttendanceRecord: async (id) => {
    await delay(300);
    const record = attendanceData.find(a => a.id === id);
    if (!record) throw new Error("Attendance record not found");
    return record;
  },

  /**
   * Check In
   */
  checkIn: async (employeeId) => {
    await delay(800);
    const today = getTodayDateString();
    const existing = attendanceData.find(a => a.employeeId === employeeId && a.date === today);
    if (existing && existing.checkIn) {
      throw new Error("Already checked in today.");
    }
    
    const newRecord = {
      id: `ATT-${Date.now()}`,
      employeeId,
      employeeName: "Current User", // Mock name
      department: "Engineering", // Mock department
      date: today,
      checkIn: new Date().toISOString(),
      checkOut: null,
      scheduledHours: 8,
      workedHours: null,
      overtime: null,
      status: "Present", // Automatically determined by backend in reality
    };
    
    if (existing) {
      Object.assign(existing, newRecord);
      return existing;
    } else {
      attendanceData.unshift(newRecord);
      return newRecord;
    }
  },

  /**
   * Check Out
   */
  checkOut: async (employeeId) => {
    await delay(800);
    const today = getTodayDateString();
    const record = attendanceData.find(a => a.employeeId === employeeId && a.date === today);
    if (!record || !record.checkIn) {
      throw new Error("Cannot check out without checking in.");
    }
    if (record.checkOut) {
      throw new Error("Already checked out today.");
    }

    record.checkOut = new Date().toISOString();
    
    // Mock calculations (backend would do this)
    const checkInTime = new Date(record.checkIn).getTime();
    const checkOutTime = new Date(record.checkOut).getTime();
    const diffHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);
    
    record.workedHours = parseFloat(diffHours.toFixed(2));
    if (record.workedHours > record.scheduledHours) {
      record.overtime = parseFloat((record.workedHours - record.scheduledHours).toFixed(2));
    } else {
      record.overtime = 0;
    }

    return record;
  },

  /**
   * Fetch regularization requests
   */
  getRegularizationRequests: async (params = {}) => {
    await delay(500);
    let results = [...regularizationRequests];
    if (params.status) {
      results = results.filter(r => r.status === params.status);
    }
    return results.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  },

  /**
   * Create a regularization request
   */
  createRegularization: async (data) => {
    await delay(700);
    const newRequest = {
      id: `REG-${Date.now()}`,
      attendanceId: data.attendanceId,
      employeeId: data.employeeId,
      employeeName: data.employeeName || "Current User",
      date: data.date,
      originalCheckIn: data.originalCheckIn,
      originalCheckOut: data.originalCheckOut,
      requestedCheckIn: data.requestedCheckIn,
      requestedCheckOut: data.requestedCheckOut,
      reason: data.reason,
      status: "Pending",
      submittedAt: new Date().toISOString(),
      managerComment: null
    };
    regularizationRequests.unshift(newRequest);
    return newRequest;
  },

  /**
   * Approve a regularization request
   */
  approveRegularization: async (id) => {
    await delay(600);
    const req = regularizationRequests.find(r => r.id === id);
    if (!req) throw new Error("Request not found");
    
    req.status = "Approved";

    // Update corresponding attendance record (simulating backend behavior)
    const attendance = attendanceData.find(a => a.id === req.attendanceId);
    if (attendance) {
      attendance.checkIn = req.requestedCheckIn;
      attendance.checkOut = req.requestedCheckOut;
      attendance.status = "Present";
      
      if (attendance.checkIn && attendance.checkOut) {
        const inTime = new Date(attendance.checkIn).getTime();
        const outTime = new Date(attendance.checkOut).getTime();
        const diff = (outTime - inTime) / (1000 * 60 * 60);
        attendance.workedHours = parseFloat(diff.toFixed(2));
        attendance.overtime = attendance.workedHours > attendance.scheduledHours 
          ? parseFloat((attendance.workedHours - attendance.scheduledHours).toFixed(2)) 
          : 0;
      }
    }
    return req;
  },

  /**
   * Reject a regularization request
   */
  rejectRegularization: async (id, reason) => {
    await delay(600);
    const req = regularizationRequests.find(r => r.id === id);
    if (!req) throw new Error("Request not found");
    
    req.status = "Rejected";
    req.managerComment = reason;
    return req;
  }
};
