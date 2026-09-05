/**
 * Position Repository
 * Dual-mode: Supabase (production) / in-memory (development & test)
 */

const { supabase, supabaseAdmin, isConfigured } = require('../config/supabase');
const config = require('../config/env');
const AppError = require('../utils/appError');

// In-memory store seeded with demo data (valid UUID hex characters only)
const mockPositions = new Map([
  ['b0000001-0000-4000-8000-000000000001', {
    id: 'b0000001-0000-4000-8000-000000000001',
    title: 'Software Engineer',
    description: 'Builds and maintains product features',
    department_id: 'd0000001-0000-4000-8000-000000000001',
    is_active: true,
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
  }],
  ['b0000002-0000-4000-8000-000000000002', {
    id: 'b0000002-0000-4000-8000-000000000002',
    title: 'Senior Software Engineer',
    description: 'Leads technical design and code reviews',
    department_id: 'd0000001-0000-4000-8000-000000000001',
    is_active: true,
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
  }],
  ['b0000003-0000-4000-8000-000000000003', {
    id: 'b0000003-0000-4000-8000-000000000003',
    title: 'HR Manager',
    description: 'Oversees HR operations and employee welfare',
    department_id: 'd0000002-0000-4000-8000-000000000002',
    is_active: true,
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
  }],
  ['b0000004-0000-4000-8000-000000000004', {
    id: 'b0000004-0000-4000-8000-000000000004',
    title: 'HR Executive',
    description: 'Handles day-to-day HR activities',
    department_id: 'd0000002-0000-4000-8000-000000000002',
    is_active: true,
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
  }],
  ['b0000005-0000-4000-8000-000000000005', {
    id: 'b0000005-0000-4000-8000-000000000005',
    title: 'Payroll Manager',
    description: 'Manages payroll runs and salary structures',
    department_id: 'd0000003-0000-4000-8000-000000000003',
    is_active: true,
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
  }],
]);

class PositionRepository {
  _useDB() {
    return isConfigured && (supabaseAdmin || supabase);
  }

  _client() {
    return supabaseAdmin || supabase;
  }

  /**
   * Get all positions, optionally filtered by department
   */
  async findAll({ departmentId = null, includeInactive = false } = {}) {
    if (this._useDB()) {
      let query = this._client().from('positions').select('*').order('title');
      if (!includeInactive) query = query.eq('is_active', true);
      if (departmentId)     query = query.eq('department_id', departmentId);
      const { data, error } = await query;
      if (error) {
        if (config.isProduction) throw new AppError(`DB error: ${error.message}`, 500, 'DATABASE_ERROR');
        // Fall through to mock store when tables not yet migrated
      } else if (data && data.length > 0) {
        return data;
      }
    }
    let all = Array.from(mockPositions.values());
    if (!includeInactive) all = all.filter((p) => p.is_active);
    if (departmentId)     all = all.filter((p) => p.department_id === departmentId);
    return all;
  }

  /**
   * Find position by ID
   */
  async findById(id) {
    if (this._useDB()) {
      const { data, error } = await this._client()
        .from('positions')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return mockPositions.get(id) || null;
        if (config.isProduction) throw new AppError(`DB error: ${error.message}`, 500, 'DATABASE_ERROR');
        // Fall through to mock
      } else if (data) {
        return data;
      }
    }
    return mockPositions.get(id) || null;
  }

  /**
   * Create a new position
   */
  async create({ title, description, departmentId }) {
    const now = new Date().toISOString();
    const payload = {
      title: title.trim(),
      description: description || null,
      department_id: departmentId || null,
      is_active: true,
      updated_at: now,
    };

    if (this._useDB()) {
      const { data, error } = await this._client()
        .from('positions')
        .insert(payload)
        .select()
        .single();
      if (error) {
        if (config.isProduction) throw new AppError(`Failed to create position: ${error.message}`, 500, 'DATABASE_ERROR');
      } else if (data) {
        mockPositions.set(data.id, data);
        return data;
      }
    }

    const id = `p${Date.now().toString(16).slice(-8)}-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padStart(12, '0')}`;
    const record = { id, ...payload, created_at: now };
    mockPositions.set(id, record);
    return record;
  }

  /**
   * Update a position
   */
  async update(id, { title, description, departmentId, isActive }) {
    const updates = { updated_at: new Date().toISOString() };
    if (title        !== undefined) updates.title         = title.trim();
    if (description  !== undefined) updates.description   = description;
    if (departmentId !== undefined) updates.department_id = departmentId;
    if (isActive     !== undefined) updates.is_active     = isActive;

    if (this._useDB()) {
      const { data, error } = await this._client()
        .from('positions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        if (error.code === 'PGRST116') return null;
        if (config.isProduction) throw new AppError(`Failed to update position: ${error.message}`, 500, 'DATABASE_ERROR');
      } else if (data) {
        mockPositions.set(id, data);
        return data;
      }
    }

    const existing = mockPositions.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    mockPositions.set(id, updated);
    return updated;
  }
}

module.exports = new PositionRepository();
