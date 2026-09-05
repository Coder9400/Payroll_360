import { employeeService } from './employeeService';
import { contractService } from './contractService';
import { salaryRuleService } from './salaryRuleService';

const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

let mockPayruns = [
  {
    id: 'PR-2025-01',
    name: 'January 2025 Payroll',
    periodStart: '2025-01-01',
    periodEnd: '2025-01-31',
    structureId: 'STR-001',
    status: 'Validated',
    totalGross: 117000,
    totalNet: 116600,
    employeeCount: 2,
    createdAt: '2025-01-25T10:00:00Z',
    payslips: [
      {
        id: 'PS-1',
        employeeId: 'EMP-001',
        contractId: 'CON-001',
        basic: 80000,
        allowances: 34000,
        gross: 114000,
        deductions: 200,
        net: 113800,
        status: 'Validated'
      }
    ]
  }
];

export const payrollService = {
  getPayruns: async (filters = {}) => {
    await delay();
    return [...mockPayruns].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  getPayrun: async (id) => {
    await delay();
    const payrun = mockPayruns.find(p => p.id === id);
    if (!payrun) throw new Error('Payrun not found');

    const structure = await salaryRuleService.getStructure(payrun.structureId).catch(() => ({ name: 'Unknown Structure' }));
    
    // Populate employees inside payslips
    const employees = await employeeService.getEmployees();
    const contracts = await contractService.getContracts();

    const populatedPayslips = payrun.payslips.map(ps => {
      const emp = employees.find(e => e.id === ps.employeeId);
      const con = contracts.find(c => c.id === ps.contractId);
      return {
        ...ps,
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
        department: emp ? emp.department : '',
        jobPosition: con ? con.jobPosition : ''
      };
    });

    return { 
      ...payrun, 
      structureName: structure.name,
      payslips: populatedPayslips 
    };
  },

  getDashboardData: async () => {
    await delay();
    const currentPeriod = 'January 2025';
    const totalGross = mockPayruns.reduce((sum, p) => sum + (p.totalGross || 0), 0);
    const totalNet = mockPayruns.reduce((sum, p) => sum + (p.totalNet || 0), 0);
    const recentPayruns = [...mockPayruns].slice(0, 5);

    return {
      currentPeriod,
      pendingEmployees: 1, // Mock value
      payslipsGenerated: mockPayruns.reduce((sum, p) => sum + p.employeeCount, 0),
      totalGross,
      totalNet,
      warningsCount: 2, // Mock value
      recentPayruns
    };
  },

  getEligibleEmployees: async (periodStart, periodEnd, structureId) => {
    await delay();
    const allEmployees = await employeeService.getEmployees();
    const allContracts = await contractService.getContracts();

    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    const eligible = [];

    for (const emp of allEmployees) {
      if (emp.status !== 'Active') continue;

      // Find contract that overlaps with payroll period
      const empContracts = allContracts.filter(c => c.employeeId === emp.id && c.status === 'Running');
      let applicableContract = null;

      for (const contract of empContracts) {
        const cStart = new Date(contract.startDate);
        const cEnd = contract.endDate ? new Date(contract.endDate) : new Date('2099-12-31');

        // Overlap logic: contract starts before period ends AND ends after period starts
        if (cStart <= end && cEnd >= start) {
          applicableContract = contract;
          break; // Take the first matching for simplicity in this mock
        }
      }

      if (applicableContract) {
        eligible.push({
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          department: emp.department,
          jobPosition: applicableContract.jobPosition,
          contractId: applicableContract.id,
          salary: applicableContract.salary,
          scheduleId: applicableContract.scheduleId,
          status: 'Eligible'
        });
      }
    }

    return eligible;
  },

  createPayrun: async (data) => {
    await delay();
    
    // Create initial draft payrun with 0 totals and uncomputed payslips
    const newPayrun = {
      id: `PR-${Date.now()}`,
      name: data.name || `Payrun ${data.periodStart} to ${data.periodEnd}`,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      structureId: data.structureId,
      status: 'Draft',
      totalGross: 0,
      totalNet: 0,
      employeeCount: data.employees.length,
      createdAt: new Date().toISOString(),
      payslips: data.employees.map((emp, idx) => ({
        id: `PS-${Date.now()}-${idx}`,
        employeeId: emp.employeeId,
        contractId: emp.contractId,
        basic: 0,
        allowances: 0,
        gross: 0,
        deductions: 0,
        net: 0,
        status: 'Draft',
        breakdown: []
      }))
    };

    mockPayruns.push(newPayrun);
    return { ...newPayrun };
  },

  computePayrun: async (id) => {
    await delay(1000); // Simulate calculation time
    const payrunIndex = mockPayruns.findIndex(p => p.id === id);
    if (payrunIndex === -1) throw new Error('Payrun not found');

    const payrun = mockPayruns[payrunIndex];
    if (payrun.status !== 'Draft' && payrun.status !== 'Computed') {
      throw new Error('Can only compute Draft or Computed payruns');
    }

    const structure = await salaryRuleService.getStructure(payrun.structureId);
    if (!structure) throw new Error('Salary structure not found');

    const rules = structure.rules || [];
    const contracts = await contractService.getContracts();

    let totalGross = 0;
    let totalNet = 0;

    // Evaluate each payslip
    const computedPayslips = payrun.payslips.map(payslip => {
      const contract = contracts.find(c => c.id === payslip.contractId);
      if (!contract) return { ...payslip, status: 'Error', notes: 'Contract missing' };

      // Context object for formula evaluation
      const context = {
        contract: contract,
        // The rule engine stores calculated results here so subsequent rules can use them
        // e.g. context['BASIC'] = 80000
      };

      let basic = 0;
      let allowances = 0;
      let gross = 0;
      let deductions = 0;
      let net = 0;
      
      const breakdown = [];

      for (const rule of rules) {
        if (!rule.active) continue;

        // Simple condition evaluation
        let conditionPassed = true;
        if (rule.condition && rule.condition !== 'Always True') {
           // Extremely simplified condition parser for mock
           try {
             // WARNING: Function constructor used for mock formula parsing. 
             // In production backend, use a safe expression evaluator.
             const conditionFn = new Function(...Object.keys(context), `return ${rule.condition};`);
             conditionPassed = conditionFn(...Object.values(context));
           } catch(e) {
             console.warn(`Failed to evaluate condition for rule ${rule.code}`, e);
             conditionPassed = false;
           }
        }

        if (!conditionPassed) continue;

        let amount = 0;

        if (rule.calculationType === 'Fixed Amount') {
          amount = Number(rule.fixedAmount);
        } else if (rule.calculationType === 'Percentage') {
          const baseValue = context[rule.basedOn] || 0;
          amount = baseValue * (Number(rule.percentage) / 100);
        } else if (rule.calculationType === 'Formula') {
           try {
             // Replace 'contract.salary' manually since contract is an object in context
             let formula = rule.formula;
             
             const formulaFn = new Function(...Object.keys(context), `return ${formula};`);
             amount = formulaFn(...Object.values(context));
           } catch(e) {
             console.warn(`Failed to evaluate formula for rule ${rule.code}`, e);
             amount = 0;
           }
        }

        context[rule.code] = amount;

        // Aggregate totals based on category
        if (rule.category === 'Basic') basic += amount;
        else if (rule.category === 'Allowance') allowances += amount;
        else if (rule.category === 'Deduction') deductions += amount;
        else if (rule.category === 'Gross') gross = amount;
        else if (rule.category === 'Net') net = amount;

        breakdown.push({
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          amount: amount
        });
      }

      // If Gross or Net wasn't explicitly calculated by a rule, provide a fallback calculation
      if (gross === 0) gross = basic + allowances;
      if (net === 0) net = gross - deductions;

      totalGross += gross;
      totalNet += net;

      return {
        ...payslip,
        basic,
        allowances,
        gross,
        deductions,
        net,
        breakdown,
        status: 'Computed'
      };
    });

    mockPayruns[payrunIndex] = {
      ...payrun,
      payslips: computedPayslips,
      totalGross,
      totalNet,
      status: 'Computed'
    };

    return mockPayruns[payrunIndex];
  },

  getPayrollWarnings: async (id) => {
    await delay();
    const payrun = mockPayruns.find(p => p.id === id);
    if (!payrun) throw new Error('Payrun not found');

    const warnings = [];
    if (payrun.payslips.length === 0) {
      warnings.push({ type: 'Error', message: 'No employees in this payrun' });
    }

    payrun.payslips.forEach(ps => {
      if (ps.status === 'Error') {
        warnings.push({ type: 'Error', message: `Payslip error for employee ID ${ps.employeeId}` });
      }
      if (ps.net < 0) {
        warnings.push({ type: 'Warning', message: `Negative net salary for employee ID ${ps.employeeId}` });
      }
    });

    return warnings;
  },

  validatePayrun: async (id) => {
    await delay();
    const payrunIndex = mockPayruns.findIndex(p => p.id === id);
    if (payrunIndex === -1) throw new Error('Payrun not found');

    const payrun = mockPayruns[payrunIndex];
    if (payrun.status !== 'Computed') throw new Error('Only computed payruns can be validated');

    // Check for errors (warnings are okay, but errors prevent validation)
    const warnings = await payrollService.getPayrollWarnings(id);
    const hasErrors = warnings.some(w => w.type === 'Error');
    if (hasErrors) {
      throw new Error('Cannot validate payrun with errors. Please resolve errors first.');
    }

    const validatedPayslips = payrun.payslips.map(ps => ({ ...ps, status: 'Validated' }));

    mockPayruns[payrunIndex] = {
      ...payrun,
      payslips: validatedPayslips,
      status: 'Validated'
    };

    return mockPayruns[payrunIndex];
  },

  markPayrunPaid: async (id) => {
    await delay();
    const payrunIndex = mockPayruns.findIndex(p => p.id === id);
    if (payrunIndex === -1) throw new Error('Payrun not found');

    const payrun = mockPayruns[payrunIndex];
    if (payrun.status !== 'Validated') throw new Error('Only validated payruns can be marked as paid');

    const paidPayslips = payrun.payslips.map(ps => ({ ...ps, status: 'Paid' }));

    mockPayruns[payrunIndex] = {
      ...payrun,
      payslips: paidPayslips,
      status: 'Paid'
    };

    return mockPayruns[payrunIndex];
  }
};
