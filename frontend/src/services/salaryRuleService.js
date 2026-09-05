const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

let mockRules = [
  {
    id: 'RUL-001',
    name: 'Basic Salary',
    code: 'BASIC',
    category: 'Basic',
    sequence: 10,
    active: true,
    condition: 'Always True',
    calculationType: 'Formula',
    fixedAmount: 0,
    percentage: 0,
    basedOn: '',
    formula: 'contract.salary',
    createdAt: '2025-01-01T10:00:00Z'
  },
  {
    id: 'RUL-002',
    name: 'Housing Allowance',
    code: 'HRA',
    category: 'Allowance',
    sequence: 20,
    active: true,
    condition: 'Always True',
    calculationType: 'Percentage',
    fixedAmount: 0,
    percentage: 40,
    basedOn: 'BASIC',
    formula: '',
    createdAt: '2025-01-01T10:00:00Z'
  },
  {
    id: 'RUL-003',
    name: 'Transport Allowance',
    code: 'TA',
    category: 'Allowance',
    sequence: 30,
    active: true,
    condition: 'Always True',
    calculationType: 'Fixed Amount',
    fixedAmount: 2000,
    percentage: 0,
    basedOn: '',
    formula: '',
    createdAt: '2025-01-01T10:00:00Z'
  },
  {
    id: 'RUL-004',
    name: 'Gross Salary',
    code: 'GROSS',
    category: 'Gross',
    sequence: 40,
    active: true,
    condition: 'Always True',
    calculationType: 'Formula',
    fixedAmount: 0,
    percentage: 0,
    basedOn: '',
    formula: 'BASIC + HRA + TA',
    createdAt: '2025-01-01T10:00:00Z'
  },
  {
    id: 'RUL-005',
    name: 'Professional Tax',
    code: 'PT',
    category: 'Deduction',
    sequence: 50,
    active: true,
    condition: 'GROSS > 15000',
    calculationType: 'Fixed Amount',
    fixedAmount: 200,
    percentage: 0,
    basedOn: '',
    formula: '',
    createdAt: '2025-01-01T10:00:00Z'
  },
  {
    id: 'RUL-006',
    name: 'Net Salary',
    code: 'NET',
    category: 'Net',
    sequence: 100,
    active: true,
    condition: 'Always True',
    calculationType: 'Formula',
    fixedAmount: 0,
    percentage: 0,
    basedOn: '',
    formula: 'GROSS - PT',
    createdAt: '2025-01-01T10:00:00Z'
  }
];

let mockStructures = [
  {
    id: 'STR-001',
    name: 'Standard Monthly',
    code: 'STD_MONTHLY',
    description: 'Standard monthly salary structure for regular employees',
    status: 'Active',
    ruleIds: ['RUL-001', 'RUL-002', 'RUL-003', 'RUL-004', 'RUL-005', 'RUL-006'],
    createdAt: '2025-01-01T10:00:00Z'
  },
  {
    id: 'STR-002',
    name: 'Intern Salary',
    code: 'INTERN_MONTHLY',
    description: 'Stipend structure for interns without allowances',
    status: 'Active',
    ruleIds: ['RUL-001', 'RUL-004', 'RUL-006'], // Just Basic -> Gross -> Net
    createdAt: '2025-01-02T10:00:00Z'
  }
];

export const salaryRuleService = {
  // RULES
  getRules: async () => {
    await delay();
    return [...mockRules].sort((a, b) => a.sequence - b.sequence);
  },
  
  getRule: async (id) => {
    await delay();
    const rule = mockRules.find(r => r.id === id);
    if (!rule) throw new Error('Rule not found');
    return { ...rule };
  },

  createRule: async (data) => {
    await delay();
    const existingCode = mockRules.find(r => r.code.toUpperCase() === data.code.toUpperCase());
    if (existingCode) throw new Error('Rule code must be unique');
    
    const newRule = {
      ...data,
      id: `RUL-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    mockRules.push(newRule);
    return { ...newRule };
  },

  updateRule: async (id, data) => {
    await delay();
    const index = mockRules.findIndex(r => r.id === id);
    if (index === -1) throw new Error('Rule not found');
    
    const existingCode = mockRules.find(r => r.code.toUpperCase() === data.code.toUpperCase() && r.id !== id);
    if (existingCode) throw new Error('Rule code must be unique');

    mockRules[index] = { ...mockRules[index], ...data };
    return { ...mockRules[index] };
  },

  // STRUCTURES
  getStructures: async () => {
    await delay();
    return [...mockStructures];
  },

  getStructure: async (id) => {
    await delay();
    const structure = mockStructures.find(s => s.id === id);
    if (!structure) throw new Error('Structure not found');
    
    // Populate rules
    const structureRules = structure.ruleIds
      .map(ruleId => mockRules.find(r => r.id === ruleId))
      .filter(Boolean)
      .sort((a, b) => a.sequence - b.sequence);
      
    return { ...structure, rules: structureRules };
  },

  createStructure: async (data) => {
    await delay();
    const newStructure = {
      ...data,
      id: `STR-${Date.now()}`,
      ruleIds: data.ruleIds || [],
      createdAt: new Date().toISOString()
    };
    mockStructures.push(newStructure);
    return { ...newStructure };
  },

  updateStructure: async (id, data) => {
    await delay();
    const index = mockStructures.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Structure not found');

    mockStructures[index] = { ...mockStructures[index], ...data };
    return { ...mockStructures[index] };
  }
};
