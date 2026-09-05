import { employeeService } from './employeeService';
import { timeOffService } from './timeOffService';
import { payrollService } from './payrollService';
import { payslipService } from './payslipService';

const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

export const dashboardService = {
  getDashboardSummary: async (filters = {}) => {
    await delay();
    
    // In a real implementation, the backend would aggregate these via SQL/Aggregation pipeline.
    // For the mock, we pull from individual services and manually aggregate.
    
    const employees = await employeeService.getEmployees();
    const activeEmployees = employees.filter(e => e.status === 'Active').length;
    
    // Mock Attendance Data
    const presentToday = Math.floor(activeEmployees * 0.85);
    const absentToday = Math.floor(activeEmployees * 0.05);
    const lateToday = Math.floor(activeEmployees * 0.08);
    const missingCheckout = activeEmployees - presentToday - absentToday - lateToday;

    // Leave Data
    const leaveRequests = await timeOffService.getLeaveRequests();
    const pendingLeave = leaveRequests.filter(lr => lr.status === 'Pending').length;
    const approvedLeave = leaveRequests.filter(lr => lr.status === 'Approved').length;

    // Payroll Data
    const payruns = await payrollService.getPayruns();
    const latestPayrun = payruns[0] || { totalGross: 0, totalNet: 0, payslips: [] };
    const deductions = (latestPayrun.totalGross || 0) - (latestPayrun.totalNet || 0);

    return {
      employees: {
        total: employees.length,
        active: activeEmployees,
        new: 2 // Mock
      },
      attendance: {
        presentToday,
        absentToday,
        lateToday,
        missingCheckout
      },
      leave: {
        pendingRequests: pendingLeave,
        approved: approvedLeave,
        taken: 45, // Mock metric
        remaining: 120 // Mock metric
      },
      payroll: {
        totalGross: latestPayrun.totalGross || 0,
        totalDeductions: deductions || 0,
        totalNet: latestPayrun.totalNet || 0,
        pendingPayroll: payruns.filter(p => p.status !== 'Paid').length
      }
    };
  },

  getPayrollTrend: async (filters = {}) => {
    await delay(300);
    // Mock trend data for recharts
    return [
      { name: 'Jan', gross: 1250000, net: 1100000, deductions: 150000 },
      { name: 'Feb', gross: 1280000, net: 1120000, deductions: 160000 },
      { name: 'Mar', gross: 1300000, net: 1140000, deductions: 160000 },
      { name: 'Apr', gross: 1350000, net: 1180000, deductions: 170000 },
      { name: 'May', gross: 1400000, net: 1220000, deductions: 180000 },
      { name: 'Jun', gross: 1450000, net: 1260000, deductions: 190000 },
    ];
  },

  getSalaryByDepartment: async (filters = {}) => {
    await delay(300);
    const employees = await employeeService.getEmployees();
    const payslips = await payslipService.getPayslips();

    const deptMap = {};
    employees.forEach(emp => {
      if (!deptMap[emp.department]) {
        deptMap[emp.department] = { department: emp.department, gross: 0, net: 0, count: 0 };
      }
      deptMap[emp.department].count += 1;
    });

    payslips.forEach(ps => {
      const dept = ps.department || 'Unknown';
      if (deptMap[dept]) {
        deptMap[dept].gross += (ps.gross || 0);
        deptMap[dept].net += (ps.net || 0);
      }
    });

    // Remove departments with 0 count
    return Object.values(deptMap).filter(d => d.count > 0);
  },

  getPayrollWarnings: async (filters = {}) => {
    await delay(200);
    return [
      { id: 1, severity: 'Error', employee: 'John Doe', problem: 'Missing bank details', date: '2025-10-01', action: 'Update Profile' },
      { id: 2, severity: 'Warning', employee: 'Jane Smith', problem: 'Duplicate payslip detected', date: '2025-10-02', action: 'Review Payrun' },
      { id: 3, severity: 'Error', employee: 'Robert Fox', problem: 'No applicable contract', date: '2025-10-03', action: 'Create Contract' }
    ];
  },

  getRecentPayruns: async (filters = {}) => {
    const payruns = await payrollService.getPayruns();
    return payruns.slice(0, 5); // Return top 5
  },

  getRecentPayslips: async (filters = {}) => {
    const payslips = await payslipService.getPayslips(filters);
    return payslips.slice(0, 5); // Return top 5
  }
};
