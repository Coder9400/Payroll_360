/**
 * Salary Structure Service
 * ─────────────────────────
 * CRUD operations for salary_structures and their salary_rules.
 * All monetary values stored as NUMERIC(12,2) — no floating point.
 *
 * salary_rules has no tenant_id of its own (it's a pure child of
 * salary_structures) — ownership is always checked through its parent
 * structure's tenant_id, either via an inner-join filter on reads or an
 * explicit structure lookup before writes.
 */

'use strict';

const { supabaseAdmin, supabase } = require('../config/supabase');
const AppError = require('../utils/appError');
const { PAYROLL_ERRORS } = require('../config/payrollConstants');
const { withTenant, withTenantId } = require('../utils/tenantScope');

const db = supabaseAdmin || supabase;

// ─── Salary Structures ────────────────────────────────────────────────────────

exports.listStructures = async (tenantId, { page = 1, limit = 50, is_active } = {}) => {
  const offset = (page - 1) * limit;

  let query = withTenant(
    db.from('salary_structures').select(`*, salary_rules(id, is_active)`, { count: 'exact' }),
    tenantId
  );

  if (is_active !== undefined) query = query.eq('is_active', is_active);

  const { data, error, count } = await query
    .range(offset, offset + limit - 1)
    .order('name');

  if (error) throw new AppError(error.message, 500);

  // Augment with rule counts
  const structures = (data || []).map(s => ({
    ...s,
    rule_count:        (s.salary_rules || []).length,
    active_rule_count: (s.salary_rules || []).filter(r => r.is_active).length,
    salary_rules:      undefined, // strip raw join from response
  }));

  return { structures, total: count, page, limit };
};

exports.getStructureById = async (tenantId, id) => {
  const { data, error } = await withTenant(
    db.from('salary_structures').select(`*, salary_rules(*)`).eq('id', id),
    tenantId
  ).single();

  if (error) {
    if (error.code === 'PGRST116') throw new AppError('Salary structure not found', 404, PAYROLL_ERRORS.STRUCTURE_NOT_FOUND);
    throw new AppError(error.message, 500);
  }

  // Sort rules by sequence
  if (data.salary_rules) {
    data.salary_rules.sort((a, b) => a.sequence - b.sequence);
  }

  return data;
};

exports.createStructure = async (tenantId, body) => {
  const { name, code, description, is_active = true } = body;

  const payload = withTenantId({ name, code: code.toUpperCase(), description, is_active }, tenantId);
  const { data, error } = await db
    .from('salary_structures')
    .insert([payload])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new AppError(`Salary structure code "${code}" already exists`, 409);
    throw new AppError(error.message, 500);
  }

  return data;
};

exports.updateStructure = async (tenantId, id, body) => {
  // Don't allow code changes (would break existing payslip references)
  const { name, description, is_active } = body;
  const updates = {};
  if (name !== undefined)      updates.name        = name;
  if (description !== undefined) updates.description = description;
  if (is_active !== undefined) updates.is_active   = is_active;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await withTenant(
    db.from('salary_structures').update(updates).eq('id', id),
    tenantId
  ).select().single();

  if (error) {
    if (error.code === 'PGRST116') throw new AppError('Salary structure not found', 404, PAYROLL_ERRORS.STRUCTURE_NOT_FOUND);
    throw new AppError(error.message, 500);
  }

  return data;
};

exports.deleteStructure = async (tenantId, id) => {
  // Prevent deletion if payruns reference this structure
  const { count } = await withTenant(
    db.from('payruns').select('id', { count: 'exact', head: true }).eq('salary_structure_id', id),
    tenantId
  );

  if (count > 0) {
    throw new AppError(
      'Cannot delete salary structure: it is used by existing payruns. Deactivate it instead.',
      409
    );
  }

  const { error } = await withTenant(
    db.from('salary_structures').delete().eq('id', id),
    tenantId
  );

  if (error) throw new AppError(error.message, 500);
};

// ─── Salary Rules ─────────────────────────────────────────────────────────────
// salary_rules carries no tenant_id — ownership flows through
// salary_structure_id, so every operation either inner-joins salary_structures
// and filters on its tenant_id, or explicitly checks the parent structure.

exports.listRules = async (tenantId, { structure_id, is_active } = {}) => {
  let query = db
    .from('salary_rules')
    .select(`*, salary_structures!inner(name, code, tenant_id)`)
    .eq('salary_structures.tenant_id', tenantId);

  if (structure_id) query = query.eq('salary_structure_id', structure_id);
  if (is_active !== undefined) query = query.eq('is_active', is_active);

  const { data, error } = await query.order('sequence');

  if (error) throw new AppError(error.message, 500);
  return data || [];
};

exports.getRuleById = async (tenantId, id) => {
  const { data, error } = await db
    .from('salary_rules')
    .select(`*, salary_structures!inner(name, code, tenant_id)`)
    .eq('id', id)
    .eq('salary_structures.tenant_id', tenantId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw new AppError('Salary rule not found', 404, PAYROLL_ERRORS.RULE_NOT_FOUND);
    throw new AppError(error.message, 500);
  }

  return data;
};

exports.createRule = async (tenantId, body) => {
  const {
    salary_structure_id, name, code, category, sequence,
    computation_type, fixed_amount, percentage_base, percentage_value,
    formula, condition_formula, is_active = true,
  } = body;

  // Confirm the parent structure actually belongs to this tenant before
  // attaching a rule to it.
  const { data: structure, error: structureErr } = await withTenant(
    db.from('salary_structures').select('id').eq('id', salary_structure_id),
    tenantId
  ).maybeSingle();
  if (structureErr) throw new AppError(structureErr.message, 500);
  if (!structure) throw new AppError('Salary structure not found', 404, PAYROLL_ERRORS.STRUCTURE_NOT_FOUND);

  const { data, error } = await db
    .from('salary_rules')
    .insert([{
      salary_structure_id,
      name,
      code: code.toUpperCase(),
      category,
      sequence: sequence ?? 10,
      computation_type,
      fixed_amount:      fixed_amount      ?? null,
      percentage_base:   percentage_base   ? percentage_base.toUpperCase() : null,
      percentage_value:  percentage_value  ?? null,
      formula:           formula           ?? null,
      condition_formula: condition_formula ?? null,
      is_active,
    }])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new AppError(`Rule code "${code}" already exists in this structure`, 409, PAYROLL_ERRORS.RULE_DUPLICATE_CODE);
    if (error.code === '23503') throw new AppError('Salary structure not found', 404, PAYROLL_ERRORS.STRUCTURE_NOT_FOUND);
    throw new AppError(error.message, 500);
  }

  return data;
};

exports.updateRule = async (tenantId, id, body) => {
  // Confirm the rule belongs to a structure owned by this tenant.
  await exports.getRuleById(tenantId, id);

  const allowed = [
    'name', 'category', 'sequence', 'computation_type',
    'fixed_amount', 'percentage_base', 'percentage_value',
    'formula', 'condition_formula', 'is_active',
  ];
  const updates = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  if (body.percentage_base) updates.percentage_base = body.percentage_base.toUpperCase();
  updates.updated_at = new Date().toISOString();

  const { data, error } = await db
    .from('salary_rules')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw new AppError('Salary rule not found', 404, PAYROLL_ERRORS.RULE_NOT_FOUND);
    throw new AppError(error.message, 500);
  }

  return data;
};

exports.deleteRule = async (tenantId, id) => {
  // Confirm the rule belongs to a structure owned by this tenant.
  await exports.getRuleById(tenantId, id);

  // Check if used in computed payslip lines
  const { count } = await db
    .from('payslip_lines')
    .select('id', { count: 'exact', head: true })
    .eq('salary_rule_id', id);

  if (count > 0) {
    throw new AppError(
      'Cannot delete salary rule: it is referenced in existing payslip lines. Deactivate it instead.',
      409
    );
  }

  const { error } = await db
    .from('salary_rules')
    .delete()
    .eq('id', id);

  if (error) throw new AppError(error.message, 500);
};
