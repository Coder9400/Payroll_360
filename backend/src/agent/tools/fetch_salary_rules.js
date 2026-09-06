'use strict';

const { supabaseAdmin, supabase } = require('../../config/supabase');
const db = supabaseAdmin || supabase;

/**
 * Tool: fetch_salary_rules
 * Fetches the salary structure and its ordered rules for the employee contract.
 */
async function fetchSalaryRules({ tenantId, salaryStructureId }) {
  if (!salaryStructureId) {
    return {
      structureName: null,
      rules: [],
      earningRules: [],
      deductionRules: [],
      message: 'No salary structure ID provided. Employee may not have a valid contract.',
    };
  }

  const { data: structure, error: sErr } = await db
    .from('salary_structures')
    .select('id, name, code, is_active')
    .eq('tenant_id', tenantId)
    .eq('id', salaryStructureId)
    .maybeSingle();

  if (sErr) throw new Error(`fetch_salary_rules structure query failed: ${sErr.message}`);
  if (!structure) throw new Error(`Salary structure not found: ${salaryStructureId}`);

  const { data: rules, error: rErr } = await db
    .from('salary_rules')
    .select('id, code, name, category, computation_type, fixed_amount, percentage_base, percentage_value, formula, sequence, is_active')
    .eq('salary_structure_id', salaryStructureId)
    .eq('is_active', true)
    .order('sequence');

  if (rErr) throw new Error(`fetch_salary_rules rules query failed: ${rErr.message}`);

  const allRules = rules || [];
  const earningRules = allRules.filter(r => ['BASIC', 'ALLOWANCE', 'OVERTIME'].includes(r.category));
  const deductionRules = allRules.filter(r => ['DEDUCTION', 'TAX'].includes(r.category));

  return {
    structureId: structure.id,
    structureName: structure.name,
    structureCode: structure.code,
    totalRules: allRules.length,
    earningRules: earningRules.map(r => ({ code: r.code, name: r.name, category: r.category })),
    deductionRules: deductionRules.map(r => ({ code: r.code, name: r.name, category: r.category })),
    rules: allRules,
    message: `Salary structure "${structure.name}" loaded with ${allRules.length} active rules (${earningRules.length} earnings, ${deductionRules.length} deductions).`,
  };
}

module.exports = fetchSalaryRules;
