/**
 * Payroll Domain Constants
 * Centralizes all status values, error codes, and business rules for the Payroll module.
 */

// ── Payrun Status Lifecycle ────────────────────────────────────────────────
const PAYRUN_STATUS = {
  DRAFT:      'DRAFT',
  COMPUTING:  'COMPUTING',
  COMPUTED:   'COMPUTED',
  VALIDATED:  'VALIDATED',
  PAID:       'PAID',
};

// ── Payslip Status Lifecycle ───────────────────────────────────────────────
const PAYSLIP_STATUS = {
  DRAFT:      'DRAFT',
  COMPUTED:   'COMPUTED',
  VALIDATED:  'VALIDATED',
  PAID:       'PAID',
};

// ── Valid Payrun State Transitions ─────────────────────────────────────────
const VALID_PAYRUN_TRANSITIONS = {
  [PAYRUN_STATUS.DRAFT]:      [PAYRUN_STATUS.COMPUTING],
  [PAYRUN_STATUS.COMPUTING]:  [PAYRUN_STATUS.COMPUTED],
  [PAYRUN_STATUS.COMPUTED]:   [PAYRUN_STATUS.VALIDATED, PAYRUN_STATUS.COMPUTING], // COMPUTING to recompute
  [PAYRUN_STATUS.VALIDATED]:  [PAYRUN_STATUS.PAID],
  [PAYRUN_STATUS.PAID]:       [], // terminal
};

// ── Salary Rule Categories ─────────────────────────────────────────────────
const RULE_CATEGORY = {
  BASIC:        'BASIC',
  ALLOWANCE:    'ALLOWANCE',
  GROSS:        'GROSS',
  DEDUCTION:    'DEDUCTION',
  CONTRIBUTION: 'CONTRIBUTION',
  NET:          'NET',
};

// Categories that are positive (earnings)
const EARNING_CATEGORIES = [
  RULE_CATEGORY.BASIC,
  RULE_CATEGORY.ALLOWANCE,
  RULE_CATEGORY.GROSS,
];

// Categories that are negative (reductions)
const DEDUCTION_CATEGORIES = [
  RULE_CATEGORY.DEDUCTION,
  RULE_CATEGORY.CONTRIBUTION,
];

// ── Salary Rule Computation Types ──────────────────────────────────────────
const COMPUTATION_TYPE = {
  FIXED:      'FIXED',
  PERCENTAGE: 'PERCENTAGE',
  FORMULA:    'FORMULA',
};

// ── Payroll Context Variable Names ─────────────────────────────────────────
// These are the variables available in formula expressions.
const CONTEXT_VARS = [
  'contract_wage',
  'working_days',
  'worked_days',
  'paid_days',
  'unpaid_leave_days',
  'paid_leave_days',
  'overtime_hours',
  'absent_days',
];

// ── Warning / Error Severity ───────────────────────────────────────────────
const VALIDATION_SEVERITY = {
  WARNING: 'WARNING',
  ERROR:   'ERROR',
};

// ── Domain Error Codes ─────────────────────────────────────────────────────
const PAYROLL_ERRORS = {
  STRUCTURE_NOT_FOUND:      'SALARY_STRUCTURE_NOT_FOUND',
  STRUCTURE_INACTIVE:       'SALARY_STRUCTURE_INACTIVE',
  STRUCTURE_NO_RULES:       'SALARY_STRUCTURE_HAS_NO_ACTIVE_RULES',
  RULE_NOT_FOUND:           'SALARY_RULE_NOT_FOUND',
  RULE_DUPLICATE_CODE:      'SALARY_RULE_DUPLICATE_CODE',
  RULE_INVALID_FORMULA:     'SALARY_RULE_INVALID_FORMULA',
  PAYRUN_NOT_FOUND:         'PAYRUN_NOT_FOUND',
  PAYRUN_INVALID_TRANSITION:'PAYRUN_INVALID_STATUS_TRANSITION',
  PAYRUN_ALREADY_PAID:      'PAYRUN_ALREADY_PAID',
  PAYRUN_NO_EMPLOYEES:      'PAYRUN_NO_EMPLOYEES_SELECTED',
  PAYSLIP_NOT_FOUND:        'PAYSLIP_NOT_FOUND',
  PAYSLIP_IMMUTABLE:        'PAYSLIP_CANNOT_MODIFY_PAID',
  CONTRACT_NOT_FOUND:       'CONTRACT_NOT_FOUND_FOR_PERIOD',
  CONTRACT_OVERLAP:         'CONTRACT_OVERLAP_DETECTED',
  EMPLOYEE_INELIGIBLE:      'EMPLOYEE_INELIGIBLE_FOR_PAYRUN',
  NEGATIVE_NET:             'NEGATIVE_NET_SALARY',
};

module.exports = {
  PAYRUN_STATUS,
  PAYSLIP_STATUS,
  VALID_PAYRUN_TRANSITIONS,
  RULE_CATEGORY,
  EARNING_CATEGORIES,
  DEDUCTION_CATEGORIES,
  COMPUTATION_TYPE,
  CONTEXT_VARS,
  VALIDATION_SEVERITY,
  PAYROLL_ERRORS,
};
