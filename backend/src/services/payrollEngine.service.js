/**
 * Payroll Rule Engine Service
 * ───────────────────────────
 * Responsible for safely evaluating salary rules and computing payslips.
 *
 * Architecture:
 *   buildPayrollContext() → evaluateRule() × N (sorted by sequence) → computePayslip()
 *
 * Safety:
 *   - Formula expressions are evaluated by substituting known variable names
 *     with their numeric values before executing via new Function().
 *   - Only whitelisted identifiers (context variables + prior rule codes) are
 *     permitted. Any unknown identifier causes an error, not a silent NaN.
 *
 * Money precision:
 *   - All amounts are rounded to 2 decimal places using Math.round(x * 100) / 100.
 *   - Stored as NUMERIC(12,2) in PostgreSQL.
 */

'use strict';

const AppError = require('../utils/appError');
const {
  COMPUTATION_TYPE,
  RULE_CATEGORY,
  EARNING_CATEGORIES,
  DEDUCTION_CATEGORIES,
  PAYROLL_ERRORS,
} = require('../config/payrollConstants');

// ─── Money helper ─────────────────────────────────────────────────────────────
/**
 * Round a number to exactly 2 decimal places (banker's style avoided for simplicity;
 * standard half-up rounding is used). This is the single rounding point in the engine.
 */
function money(x) {
  if (x === null || x === undefined || isNaN(x)) return 0;
  return Math.round(Number(x) * 100) / 100;
}

// ─── Safe Expression Evaluator ────────────────────────────────────────────────
/**
 * Safely evaluate a formula expression.
 *
 * Strategy:
 *   1. Build an allowed-names set from: context keys + all previously computed rule codes.
 *   2. Tokenise the expression and check that every alphabetic token is in the allowed set.
 *   3. Substitute each allowed name with its numeric value.
 *   4. Evaluate the resulting purely-numeric expression using new Function().
 *
 * Allowed operators: + - * / ( ) . numbers
 * Forbidden: anything not in the allowed-name set, semicolons, backticks, etc.
 *
 * @param {string} formula    - Expression string e.g. "BASIC + HRA * 0.2"
 * @param {Object} context    - { BASIC: 40000, HRA: 8000, contract_wage: 40000, ... }
 * @returns {number}          - Evaluated result rounded to 2dp
 */
function safeEval(formula, context) {
  if (!formula || typeof formula !== 'string') return 0;

  const allowedNames = new Set(Object.keys(context));

  // Tokenise: extract every word-like identifier from the formula
  const identifiers = formula.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
  for (const id of identifiers) {
    if (!allowedNames.has(id)) {
      throw new AppError(
        `Invalid salary rule formula: unknown identifier "${id}". ` +
        `Allowed variables: ${[...allowedNames].join(', ')}`,
        400,
        PAYROLL_ERRORS.RULE_INVALID_FORMULA
      );
    }
  }

  // Replace all identifiers with their numeric values
  let numeric = formula;
  // Sort by length descending to avoid partial replacements (e.g. "GROSS" before "GROSS_ADJ")
  const sortedNames = [...allowedNames].sort((a, b) => b.length - a.length);
  for (const name of sortedNames) {
    const val = Number(context[name] ?? 0);
    numeric = numeric.replace(new RegExp(`\\b${name}\\b`, 'g'), val);
  }

  // Final safety check: only digits, operators, dots, spaces, parentheses remain
  if (!/^[\d\s+\-*/().]+$/.test(numeric)) {
    throw new AppError(
      `Salary rule formula contains illegal characters after substitution: "${numeric}"`,
      400,
      PAYROLL_ERRORS.RULE_INVALID_FORMULA
    );
  }

  try {
    // eslint-disable-next-line no-new-func
    const result = new Function(`return (${numeric});`)();
    if (typeof result !== 'number' || !isFinite(result)) return 0;
    return money(result);
  } catch {
    throw new AppError(
      `Salary rule formula evaluation failed: "${formula}"`,
      400,
      PAYROLL_ERRORS.RULE_INVALID_FORMULA
    );
  }
}

// ─── Condition Evaluator ──────────────────────────────────────────────────────
/**
 * Evaluate an optional condition. If truthy, the rule applies; otherwise amount = 0.
 * Uses the same safe evaluator as formulas.
 */
function evalCondition(conditionFormula, context) {
  if (!conditionFormula) return true;
  try {
    const result = safeEval(conditionFormula, context);
    return Boolean(result);
  } catch {
    return true; // Default: apply rule if condition is unparseable
  }
}

// ─── Build Payroll Context ────────────────────────────────────────────────────
/**
 * Build the computation context for a single employee payslip.
 *
 * @param {Object} opts
 * @param {Object} opts.contract          - Contract row from DB
 * @param {Object} opts.periodAttendance  - { workedDays, overtimeHours, ... }
 * @param {Object} opts.periodTimeOff     - { paidLeaveDays, unpaidLeaveDays }
 * @param {number} opts.workingDays       - Expected working days in period
 * @returns {Object}                      - Computation context
 */
function buildPayrollContext({ contract, periodAttendance, periodTimeOff, workingDays }) {
  const contractWage  = money(contract.wage);
  const workedDays    = money(periodAttendance.workedDays    ?? 0);
  const overtimeHours = money(periodAttendance.overtimeHours ?? 0);
  const paidLeaveDays = money(periodTimeOff.paidLeaveDays    ?? 0);
  const unpaidDays    = money(periodTimeOff.unpaidLeaveDays  ?? 0);
  const paidDays      = money(workedDays + paidLeaveDays);
  const absentDays    = money(Math.max(0, workingDays - paidDays - unpaidDays));

  return {
    // Standard context variable names available in formulas
    contract_wage:      contractWage,
    working_days:       workingDays,
    worked_days:        workedDays,
    paid_days:          paidDays,
    paid_leave_days:    paidLeaveDays,
    unpaid_leave_days:  unpaidDays,
    absent_days:        absentDays,
    overtime_hours:     overtimeHours,
  };
}

// ─── Evaluate a Single Rule ───────────────────────────────────────────────────
/**
 * Compute the monetary amount for one salary rule given the current context.
 *
 * @param {Object} rule     - salary_rules DB row
 * @param {Object} context  - Current computation context (grows as rules execute)
 * @returns {number}        - Monetary amount (2dp)
 */
function evaluateRule(rule, context) {
  // Check optional condition
  if (rule.condition_formula && !evalCondition(rule.condition_formula, context)) {
    return 0;
  }

  switch (rule.computation_type) {
    case COMPUTATION_TYPE.FIXED: {
      return money(rule.fixed_amount ?? 0);
    }

    case COMPUTATION_TYPE.PERCENTAGE: {
      const base = rule.percentage_base;
      const pct  = money(rule.percentage_value ?? 0);
      if (!base) return 0;
      const baseValue = Number(context[base] ?? context[base?.toUpperCase()] ?? 0);
      return money(baseValue * pct / 100);
    }

    case COMPUTATION_TYPE.FORMULA: {
      return safeEval(rule.formula || '0', context);
    }

    default:
      return 0;
  }
}

// ─── Compute Payslip from Rules ───────────────────────────────────────────────
/**
 * Execute all active salary rules in sequence order and generate payslip lines.
 *
 * @param {Object}   baseContext  - Output of buildPayrollContext()
 * @param {Object[]} rules        - Sorted salary_rules rows (ascending sequence)
 * @returns {{ lines, gross, deductions, net, context }}
 */
function computePayslipFromRules(baseContext, rules) {
  const context = { ...baseContext };
  const lines   = [];

  // Sort by sequence ascending (enforce deterministic order)
  const sorted = [...rules].sort((a, b) => a.sequence - b.sequence);

  for (const rule of sorted) {
    if (!rule.is_active) continue;

    const amount = evaluateRule(rule, context);

    // Add this rule's code to context so later rules can reference it
    context[rule.code] = amount;
    // Also expose lowercase version for case-insensitive references
    context[rule.code.toLowerCase()] = amount;

    lines.push({
      salary_rule_id: rule.id,
      code:           rule.code,
      name:           rule.name,
      category:       rule.category,
      sequence:       rule.sequence,
      quantity:       1,
      rate:           amount,
      amount:         amount,
    });
  }

  // Aggregate totals
  let gross      = 0;
  let deductions = 0;

  for (const line of lines) {
    if (EARNING_CATEGORIES.includes(line.category)) {
      if (line.category === RULE_CATEGORY.GROSS) {
        // GROSS rule resets the running gross total (it IS the gross)
        gross = line.amount;
      } else if (line.category !== RULE_CATEGORY.NET) {
        // BASIC and ALLOWANCE accumulate into gross unless a GROSS rule overrides
        // (Only accumulated if no explicit GROSS rule present)
      }
    }
    if (DEDUCTION_CATEGORIES.includes(line.category)) {
      deductions = money(deductions + line.amount);
    }
  }

  // Use explicit GROSS rule if present, otherwise sum BASIC + ALLOWANCE
  const grossLine = lines.find(l => l.category === RULE_CATEGORY.GROSS);
  if (grossLine) {
    gross = grossLine.amount;
  } else {
    gross = lines
      .filter(l => [RULE_CATEGORY.BASIC, RULE_CATEGORY.ALLOWANCE].includes(l.category))
      .reduce((s, l) => money(s + l.amount), 0);
  }

  // Use explicit NET rule if present, otherwise gross - deductions
  const netLine = lines.find(l => l.category === RULE_CATEGORY.NET);
  const net = netLine ? netLine.amount : money(gross - deductions);

  return {
    lines,
    gross:      money(gross),
    deductions: money(deductions),
    net:        money(net),
    context,
  };
}

// ─── Count Working Days in Period ─────────────────────────────────────────────
/**
 * Count business days (Mon–Fri by default) in a date range.
 * Can be extended to use working_schedule_days for custom schedules.
 *
 * @param {string} startDate  - ISO date string
 * @param {string} endDate    - ISO date string
 * @returns {number}
 */
function countWorkingDays(startDate, endDate) {
  const start = new Date(startDate);
  const end   = new Date(endDate);
  let count   = 0;
  const cur   = new Date(start);

  while (cur <= end) {
    const dow = cur.getDay(); // 0=Sun, 6=Sat
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  buildPayrollContext,
  evaluateRule,
  computePayslipFromRules,
  countWorkingDays,
  safeEval,
  money,
};
