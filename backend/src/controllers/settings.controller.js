'use strict';

const { supabaseAdmin, supabase } = require('../config/supabase');
const AppError = require('../utils/appError');
const { successResponse } = require('../utils/apiResponse');

const db = supabaseAdmin || supabase;

exports.getSettings = async (req, res, next) => {
  try {
    const { data: tenant, error } = await db
      .from('tenants')
      .select('id, name, slug, is_active, created_at, updated_at')
      .eq('id', req.user.tenantId)
      .single();

    if (error || !tenant) throw new AppError('Company settings not found', 404);

    const { data: legalEntities, error: leErr } = await db
      .from('legal_entities')
      .select('id, name, country, is_default')
      .eq('tenant_id', req.user.tenantId)
      .order('name');

    if (leErr) throw new AppError(leErr.message, 500);

    return successResponse(res, { tenant, legalEntities: legalEntities || [] });
  } catch (err) {
    next(err);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !String(name).trim()) {
      throw new AppError('Company name is required', 400);
    }

    const { data, error } = await db
      .from('tenants')
      .update({ name: String(name).trim(), updated_at: new Date().toISOString() })
      .eq('id', req.user.tenantId)
      .select('id, name, slug, is_active, created_at, updated_at')
      .single();

    if (error) throw new AppError(error.message, 500);
    return successResponse(res, { tenant: data }, 'Company settings updated');
  } catch (err) {
    next(err);
  }
};
