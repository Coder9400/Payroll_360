/**
 * Department Repository
 * Dual-mode: Supabase (production) / in-memory (development & test)
 */

const { supabase, supabaseAdmin, isConfigured } = require('../config/supabase');
const config = require('../config/env');
const AppError = require('../utils/appError');

// In-memory store seeded with demo data (valid UUID hex characters only)
const mockDepts = new Map([
  ['d0000001-0000-4000-8000-000000000001', {
    id: 'd0000001-0000-4000-8000-000000000001',
    name: 'Engineering',
    description: 'Software development and infrastructure',
    head_id: 'e0000001-0000-4000-8000-000000000001',
    is_active: true,
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
  }],
  ['d0000002-0000-4000-8000-000000000002', {
    id: 'd0000002-0000-4000-8000-000000000002',
    name: 'Human Resources',
    description: 'People operations, hiring, and culture',
    head_id: 'e0000002-0000-4000-8000-000000000002',
    is_active: true,
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
  }],
  ['d0000003-0000-4000-8000-000000000003', {
    id: 'd0000003-0000-4000-8000-000000000003',
    name: 'Finance & Payroll',
    description: 'Financial planning, accounting, and payroll',
    head_id: 'e0000003-0000-4000-8000-000000000003',
    is_active: true,
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
  }],
]);

class DepartmentRepository {
  _useDB() {
    return isConfigured && (supabaseAdmin || supabase);
  }

  _client() {
    return supabaseAdmin || supabase;
  }

  /**
   * Get all active departments
   */
  async findAll({ includeInactive = false } = {}) {
    if (this._useDB()) {
      let query = this._client().from('departments').select('*').order('name');
      if (!includeInactive) query = query.eq('is_active', true);
      const { data, error } = await query;
      if (error) {
        if (config.isProduction) throw new AppError(`DB error: ${error.message}`, 500, 'DATABASE_ERROR');
        // Fall through to mock store when DB tables are not yet migrated
      } else if (data && data.length > 0) {
        return data;
      }
    }
    const all = Array.from(mockDepts.values());
    return includeInactive ? all : all.filter((d) => d.is_active);
  }

  /**
   * Find a department by ID
   */
  async findById(id) {
    if (this._useDB()) {
      const { data, error } = await this._client()
        .from('departments')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return mockDepts.get(id) || null;
        if (config.isProduction) throw new AppError(`DB error: ${error.message}`, 500, 'DATABASE_ERROR');
        // Fall through to mock store for dev/test
      } else if (data) {
        return data;
      }
    }
    return mockDepts.get(id) || null;
  }

  /**
   * Check if a department name is already taken (case-insensitive)
   */
  async existsByName(name, excludeId = null) {
    const lower = name.toLowerCase().trim();
    if (this._useDB()) {
      let query = this._client().from('departments').select('id').ilike('name', lower);
      if (excludeId) query = query.neq('id', excludeId);
      const { data } = await query;
      return data && data.length > 0;
    }
    for (const dept of mockDepts.values()) {
      if (dept.name.toLowerCase() === lower && dept.id !== excludeId) return true;
    }
    return false;
  }

  /**
   * Create a new department
   */
  async create({ name, description, headId }) {
    const now = new Date().toISOString();
    const payload = {
      name: name.trim(),
      description: description || null,
      head_id: headId || null,
      is_active: true,
      updated_at: now,
    };

    if (this._useDB()) {
      const { data, error } = await this._client()
        .from('departments')
        .insert(payload)
        .select()
        .single();
      if (error) {
        if (config.isProduction) throw new AppError(`Failed to create department: ${error.message}`, 500, 'DATABASE_ERROR');
      } else if (data) {
        mockDepts.set(data.id, data);
        return data;
      }
    }

    const id = `d${Date.now().toString(16).slice(-8)}-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padStart(12, '0')}`;
    const record = { id, ...payload, created_at: now };
    mockDepts.set(id, record);
    return record;
  }

  /**
   * Update an existing department
   */
  async update(id, { name, description, headId, isActive }) {
    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined)        updates.name        = name.trim();
    if (description !== undefined) updates.description = description;
    if (headId !== undefined)      updates.head_id     = headId;
    if (isActive !== undefined)    updates.is_active   = isActive;

    if (this._useDB()) {
      const { data, error } = await this._client()
        .from('departments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        if (error.code === 'PGRST116') return null;
        if (config.isProduction) throw new AppError(`Failed to update department: ${error.message}`, 500, 'DATABASE_ERROR');
      } else if (data) {
        mockDepts.set(id, data);
        return data;
      }
    }

    const existing = mockDepts.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    mockDepts.set(id, updated);
    return updated;
  }
}

module.exports = new DepartmentRepository();
