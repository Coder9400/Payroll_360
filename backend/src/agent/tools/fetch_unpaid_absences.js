'use strict';

/**
 * Tool: fetch_unpaid_absences
 * Computes unauthorized (unpaid) absences and the corresponding salary deduction
 * based on the company Leave & Deductions Policy formula:
 *   deduction = (monthly_wage / working_days) * unauthorized_days
 *
 * This tool does NOT query the DB — it reasons on observations from
 * fetch_attendance and fetch_paid_leaves.
 */
function fetchUnpaidAbsences({ workingDays, daysPresent, approvedPaidLeaveDays, contractWage }) {
  const accountedDays = daysPresent + approvedPaidLeaveDays;
  const unauthorizedDays = Math.max(0, workingDays - accountedDays);

  const dailyRate = workingDays > 0 ? contractWage / workingDays : 0;
  const deductionAmount = Math.round(dailyRate * unauthorizedDays * 100) / 100;

  return {
    workingDays,
    daysPresent,
    approvedPaidLeaveDays,
    accountedDays,
    unauthorizedDays,
    dailyRate: Math.round(dailyRate * 100) / 100,
    deductionAmount,
    formulaUsed: `(${contractWage} / ${workingDays}) × ${unauthorizedDays} = ${deductionAmount}`,
    message: unauthorizedDays === 0
      ? 'No unauthorized absences. Full salary will be paid for present and approved leave days.'
      : `${unauthorizedDays} unauthorized absence day(s) detected. Deduction of ₹${deductionAmount} will be applied per company policy.`,
  };
}

module.exports = fetchUnpaidAbsences;
