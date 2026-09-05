import { employeeService } from './employeeService';
import { timeOffService } from './timeOffService';
import { payslipService } from './payslipService';

// Mock delay to simulate network latency
const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

// Helper for mocked CSV exports
const downloadCSV = (content, filename) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const reportService = {
  getEmployeeReport: async (filters = {}) => {
    await delay();
    let employees = await employeeService.getEmployees();
    
    if (filters.department) {
      employees = employees.filter(e => e.department === filters.department);
    }
    if (filters.status) {
      employees = employees.filter(e => e.status === filters.status);
    }

    return employees.map(e => ({
      id: e.id,
      name: `${e.firstName} ${e.lastName}`,
      department: e.department,
      jobPosition: e.jobPosition || 'N/A',
      manager: e.managerId || 'N/A', // Mock implementation
      contractStatus: 'Active', // Mock implementation
      workingSchedule: 'Standard 40h', // Mock implementation
      employmentStatus: e.status
    }));
  },

  getAttendanceReport: async (filters = {}) => {
    await delay();
    // Generate a mock list of attendance records since we don't have a full attendance DB
    const employees = await employeeService.getEmployees();
    const records = [];
    const today = new Date().toISOString().split('T')[0];

    employees.forEach((emp, i) => {
      records.push({
        id: `ATT-${i}`,
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        department: emp.department,
        date: today,
        checkIn: '09:00 AM',
        checkOut: '05:30 PM',
        workedHours: '8h 30m',
        overtime: '30m',
        status: i % 5 === 0 ? 'Late' : 'Present'
      });
    });

    return records;
  },

  getTimeOffReport: async (filters = {}) => {
    await delay();
    const requests = await timeOffService.getLeaveRequests();
    return requests.map(req => ({
      id: req.id,
      employeeName: req.employeeName,
      department: req.department || 'N/A',
      leaveType: req.type,
      startDate: req.startDate,
      endDate: req.endDate,
      days: req.days,
      status: req.status,
      approvedBy: req.managerName || 'System'
    }));
  },

  getPayrollReport: async (filters = {}) => {
    await delay();
    let payslips = await payslipService.getPayslips();
    
    if (filters.period) {
      payslips = payslips.filter(ps => ps.payrollPeriod.includes(filters.period));
    }
    
    return payslips.map(ps => ({
      id: ps.id,
      employeeName: ps.employeeName,
      department: ps.department,
      payrollPeriod: ps.payrollPeriod,
      basic: ps.basic,
      allowances: ps.allowances,
      gross: ps.gross,
      deductions: ps.deductions,
      net: ps.net,
      payrun: ps.payrunName,
      status: ps.status
    }));
  },

  exportEmployees: async (filters = {}) => {
    const data = await reportService.getEmployeeReport(filters);
    const headers = 'ID,Name,Department,Job Position,Manager,Contract Status,Working Schedule,Employment Status\n';
    const csvContent = headers + data.map(r => 
      `"${r.id}","${r.name}","${r.department}","${r.jobPosition}","${r.manager}","${r.contractStatus}","${r.workingSchedule}","${r.employmentStatus}"`
    ).join('\n');
    downloadCSV(csvContent, 'employee_report.csv');
  },

  exportAttendance: async (filters = {}) => {
    const data = await reportService.getAttendanceReport(filters);
    const headers = 'Employee,Department,Date,Check In,Check Out,Worked Hours,Overtime,Status\n';
    const csvContent = headers + data.map(r => 
      `"${r.employeeName}","${r.department}","${r.date}","${r.checkIn}","${r.checkOut}","${r.workedHours}","${r.overtime}","${r.status}"`
    ).join('\n');
    downloadCSV(csvContent, 'attendance_report.csv');
  },

  exportTimeOff: async (filters = {}) => {
    const data = await reportService.getTimeOffReport(filters);
    const headers = 'Employee,Department,Leave Type,Start Date,End Date,Days,Status,Approved By\n';
    const csvContent = headers + data.map(r => 
      `"${r.employeeName}","${r.department}","${r.leaveType}","${r.startDate}","${r.endDate}","${r.days}","${r.status}","${r.approvedBy}"`
    ).join('\n');
    downloadCSV(csvContent, 'time_off_report.csv');
  },

  exportPayroll: async (filters = {}) => {
    const data = await reportService.getPayrollReport(filters);
    const headers = 'Employee,Department,Payroll Period,Basic,Allowances,Gross,Deductions,Net,Payrun,Status\n';
    const csvContent = headers + data.map(r => 
      `"${r.employeeName}","${r.department}","${r.payrollPeriod}","${r.basic}","${r.allowances}","${r.gross}","${r.deductions}","${r.net}","${r.payrun}","${r.status}"`
    ).join('\n');
    downloadCSV(csvContent, 'payroll_report.csv');
  }
};
