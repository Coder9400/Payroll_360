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

/**
 * GET /api/v1/settings/geofence
 * Returns tenant office location and geofence radius.
 * Accessible to all authenticated HR-level users (used by the map).
 */
exports.getGeofenceConfig = async (req, res, next) => {
  try {
    const { data: tenant, error } = await db
      .from('tenants')
      .select('office_lat, office_lng, geofence_radius')
      .eq('id', req.user.tenantId)
      .single();

    if (error || !tenant) throw new AppError('Geofence config not found', 404);

    return successResponse(res, {
      officeLat: tenant.office_lat,
      officeLng: tenant.office_lng,
      geofenceRadius: tenant.geofence_radius || 500,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/settings/geofence
 * Admin-only: update office location and geofence radius.
 */
exports.updateGeofenceConfig = async (req, res, next) => {
  try {
    const { office_lat, office_lng, geofence_radius } = req.body;

    if (office_lat == null || office_lng == null) {
      throw new AppError('office_lat and office_lng are required', 400);
    }

    const { data, error } = await db
      .from('tenants')
      .update({
        office_lat: parseFloat(office_lat),
        office_lng: parseFloat(office_lng),
        geofence_radius: geofence_radius ? parseInt(geofence_radius) : 500,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.user.tenantId)
      .select('office_lat, office_lng, geofence_radius')
      .single();

    if (error) throw new AppError(error.message, 500);
    return successResponse(res, {
      officeLat: data.office_lat,
      officeLng: data.office_lng,
      geofenceRadius: data.geofence_radius,
    }, 'Geofence configuration updated');
  } catch (err) {
    next(err);
  }
};
