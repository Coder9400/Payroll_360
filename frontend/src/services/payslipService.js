import { mockPayruns } from './payrollService';
import { employeeService } from './employeeService';
import { contractService } from './contractService';
import { salaryRuleService } from './salaryRuleService';

const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

export const payslipService = {
  // Get all generated payslips across all payruns
  getPayslips: async (filters = {}) => {
    await delay();
    let allPayslips = [];
    
    // In a real DB, you'd just query the payslips table. Here we aggregate from mockPayruns.
    for (const payrun of mockPayruns) {
      if (payrun.payslipsGenerated) {
        const generatedPayslips = payrun.payslips
          .filter(ps => ps.status === 'Generated' || ps.status === 'Sent' || ps.status === 'Paid')
          .map(ps => ({
            ...ps,
            payrunName: payrun.name,
            payrollPeriod: `${payrun.periodStart} to ${payrun.periodEnd}`,
            structureId: payrun.structureId,
          }));
        allPayslips = [...allPayslips, ...generatedPayslips];
      }
    }
    
    // Sort by latest generated
    allPayslips.sort((a, b) => new Date(b.generatedAt || 0) - new Date(a.generatedAt || 0));

    // Optional: filter by employee if required for My Payslips
    if (filters.employeeId) {
      allPayslips = allPayslips.filter(ps => ps.employeeId === filters.employeeId);
    }

    // Populate missing name info for the list
    const employees = await employeeService.getEmployees();
    const populatedPayslips = allPayslips.map(ps => {
      const emp = employees.find(e => e.id === ps.employeeId);
      return {
        ...ps,
        employeeName: ps.employeeName || (emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown'),
        department: ps.department || (emp ? emp.department : '')
      };
    });

    return populatedPayslips;
  },

  getPayslip: async (id) => {
    await delay();
    let foundPayslip = null;
    let foundPayrun = null;

    for (const payrun of mockPayruns) {
      const ps = payrun.payslips.find(p => p.id === id);
      if (ps) {
        foundPayslip = ps;
        foundPayrun = payrun;
        break;
      }
    }

    if (!foundPayslip) throw new Error('Payslip not found');

    const employees = await employeeService.getEmployees();
    const contracts = await contractService.getContracts();
    const structure = await salaryRuleService.getStructure(foundPayrun.structureId).catch(() => ({ name: 'Unknown Structure' }));

    const emp = employees.find(e => e.id === foundPayslip.employeeId);
    const con = contracts.find(c => c.id === foundPayslip.contractId);

    return {
      ...foundPayslip,
      payrunName: foundPayrun.name,
      payrollPeriod: `${foundPayrun.periodStart} to ${foundPayrun.periodEnd}`,
      structureName: structure.name,
      employeeName: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
      department: emp ? emp.department : '',
      jobPosition: con ? con.jobPosition : '',
      employeeEmail: emp ? emp.email : ''
    };
  },

  generatePayslips: async (payrunId) => {
    await delay();
    const payrunIndex = mockPayruns.findIndex(p => p.id === payrunId);
    if (payrunIndex === -1) throw new Error('Payrun not found');

    const payrun = mockPayruns[payrunIndex];
    if (payrun.status !== 'Validated' && payrun.status !== 'Paid') {
      throw new Error('Can only generate payslips for a Validated or Paid payrun');
    }

    const generatedPayslips = payrun.payslips.map((ps, idx) => ({
      ...ps,
      payslipNumber: ps.payslipNumber || `PS-${payrun.periodStart.replace(/-/g, '')}-${(idx + 1).toString().padStart(3, '0')}`,
      status: 'Generated',
      emailStatus: 'Not Sent',
      generatedAt: new Date().toISOString()
    }));

    mockPayruns[payrunIndex] = {
      ...payrun,
      payslipsGenerated: true,
      payslips: generatedPayslips
    };

    return generatedPayslips.length;
  },

  sendPayslipEmail: async (id) => {
    await delay(1000); // Simulate network latency for email
    
    // 10% chance of random failure to simulate real-world email failures if requested
    if (Math.random() < 0.1) {
      throw new Error('Failed to send email to SMTP server.');
    }

    let found = false;
    for (const payrun of mockPayruns) {
      const psIndex = payrun.payslips.findIndex(p => p.id === id);
      if (psIndex !== -1) {
        payrun.payslips[psIndex].emailStatus = 'Sent';
        found = true;
        break;
      }
    }

    if (!found) throw new Error('Payslip not found');
    return { success: true };
  },

  bulkSendPayslips: async (ids) => {
    await delay(1500);
    const results = { successful: 0, failed: 0, errors: [] };

    for (const id of ids) {
      try {
        await payslipService.sendPayslipEmail(id);
        results.successful++;
      } catch (err) {
        results.failed++;
        results.errors.push({ id, message: err.message });
        
        // Mark as failed in the mock db
        for (const payrun of mockPayruns) {
          const psIndex = payrun.payslips.findIndex(p => p.id === id);
          if (psIndex !== -1) {
            payrun.payslips[psIndex].emailStatus = 'Failed';
            break;
          }
        }
      }
    }

    return results;
  }
};
