'use strict';

/**
 * Tool: validate_policy
 * Validates the computed payslip proposal against company policy rules.
 * Returns warnings and errors — if any errors exist, HR is notified before approving.
 */
function validatePolicy({ netAmount, grossAmount, deductionAmount, workingDays, daysPresent, unauthorizedDays, deductionAmount: unpaidDeduction, contractWage }) {
  const warnings = [];
  const errors = [];

  // Rule 1: Net pay must not be negative
  if (netAmount < 0) {
    errors.push(`Net pay is negative (₹${netAmount}). Deductions exceed gross pay. Review salary rules or unauthorized absences.`);
  }

  // Rule 2: Net pay must not exceed gross pay
  if (netAmount > grossAmount) {
    errors.push(`Net pay (₹${netAmount}) is greater than gross pay (₹${grossAmount}). This should not be possible.`);
  }

  // Rule 3: Days present + leave should not exceed working days
  if (daysPresent > workingDays) {
    warnings.push(`Days present (${daysPresent}) exceeds the expected working days (${workingDays}). Please verify attendance data.`);
  }

  // Rule 4: Deduction should not exceed 50% of gross pay (policy warning)
  const deductionRatio = grossAmount > 0 ? deductionAmount / grossAmount : 0;
  if (deductionRatio > 0.5) {
    warnings.push(`Total deductions (₹${deductionAmount}) exceed 50% of gross pay (₹${grossAmount}). HR review recommended.`);
  }

  // Rule 5: Unauthorized absences over 5 days — flag for HR review
  if (unauthorizedDays > 5) {
    warnings.push(`High number of unauthorized absences: ${unauthorizedDays} days. Consider disciplinary review before processing.`);
  }

  // Rule 6: Zero days worked with non-zero salary
  if (daysPresent === 0 && grossAmount > 0) {
    warnings.push('Employee has 0 days present but is receiving salary. Ensure this is intentional (e.g., fully approved leave period).');
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    warnings,
    summary: {
      grossAmount,
      deductionAmount,
      netAmount,
      deductionPercentage: grossAmount > 0 ? Math.round((deductionAmount / grossAmount) * 100) : 0,
    },
    message: isValid
      ? `Payroll proposal passed policy validation${warnings.length > 0 ? ` with ${warnings.length} warning(s)` : ''}.`
      : `Payroll proposal has ${errors.length} error(s) that must be resolved before approval.`,
  };
}

module.exports = validatePolicy;
