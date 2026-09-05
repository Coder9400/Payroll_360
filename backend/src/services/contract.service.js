/**
 * Contract Service — Phase 4
 *
 * CRITICAL BUSINESS RULE:
 * Never simply select the latest contract.
 * getApplicableContract(employeeId, payrollStartDate, payrollEndDate) must return
 * the contract whose effective period covers the payroll period.
 *
 * Handles:
 * - No applicable contract
 * - Multiple overlapping contracts
 * - Expired contracts
 * - Historical contract tracking
 */

const { supabaseAdmin, supabase, isConfigured } = require('../config/supabase');
const AppError = require('../utils/appError');
const config = require('../config/env');

const db = supabaseAdmin || supabase;

// In-memory mock store for testing / non-DB environments
const mockContracts = new Map();

class ContractService {
  /**
   * Helper to check whether DB operations should be attempted
   */
  _useDB() {
    return isConfigured && db;
  }

  /**
   * CRITICAL SERVICE METHOD:
   * Resolve the active contract whose effective period covers the payroll period.
   *
   * @param {string} employeeId - UUID of the employee
   * @param {string} payrollStartDate - 'YYYY-MM-DD'
   * @param {string} payrollEndDate - 'YYYY-MM-DD'
   * @returns {Promise<object>} The matching active contract
   */
  async getApplicableContract(employeeId, payrollStartDate, payrollEndDate) {
    if (!employeeId) {
      throw new AppError('Employee ID is required', 400);
    }
    if (!payrollStartDate || !payrollEndDate) {
      throw new AppError('Both payrollStartDate and payrollEndDate are required', 400);
    }
    if (new Date(payrollEndDate) < new Date(payrollStartDate)) {
      throw new AppError('payrollEndDate cannot be earlier than payrollStartDate', 400);
    }

    let matchingContracts = [];

    if (this._useDB()) {
      try {
        // Query active contracts for the employee
        // Contract must have started on or before the payroll period ends
        // AND (contract has no end date OR ended on or after the payroll period starts)
        const { data, error } = await db
          .from('contracts')
          .select('*, employees(first_name, last_name, employee_code)')
          .eq('employee_id', employeeId)
          .eq('status', 'ACTIVE')
          .lte('start_date', payrollEndDate)
          .or(`end_date.gte.${payrollStartDate},end_date.is.null`);

        if (error) {
          if (config.isProduction) throw new AppError(`Database error: ${error.message}`, 500);
        } else if (data) {
          matchingContracts = data;
        }
      } catch (err) {
        if (config.isProduction) throw err;
      }
    }

    // If no DB result or in mock/test mode, check mock store
    if (matchingContracts.length === 0) {
      const pStart = new Date(payrollStartDate);
      const pEnd = new Date(payrollEndDate);

      matchingContracts = Array.from(mockContracts.values()).filter((c) => {
        if (c.employee_id !== employeeId || c.status !== 'ACTIVE') return false;
        const cStart = new Date(c.start_date);
        const cEnd = c.end_date ? new Date(c.end_date) : null;

        const isStartValid = cStart <= pEnd;
        const isEndValid = !cEnd || cEnd >= pStart;
        return isStartValid && isEndValid;
      });
    }

    // 1. Handle: No applicable contract (e.g. employee has no contract or contracts are expired)
    if (matchingContracts.length === 0) {
      throw new AppError(
        `No active contract covers the payroll period ${payrollStartDate} to ${payrollEndDate} for employee ${employeeId}`,
        404
      );
    }

    // 2. Handle: Multiple overlapping contracts
    if (matchingContracts.length > 1) {
      throw new AppError(
        `Multiple overlapping active contracts (${matchingContracts.length}) found for employee ${employeeId} during payroll period ${payrollStartDate} to ${payrollEndDate}`,
        409
      );
    }

    // Return the single valid applicable contract
    return matchingContracts[0];
  }

  /**
   * Get employee contract history (ordered by start_date DESC)
   */
  async getEmployeeContractHistory(employeeId) {
    if (!employeeId) {
      throw new AppError('Employee ID is required', 400);
    }

    if (this._useDB()) {
      try {
        const { data, error } = await db
          .from('contracts')
          .select('*, employees(first_name, last_name, employee_code)')
          .eq('employee_id', employeeId)
          .order('start_date', { ascending: false });

        if (error) {
          if (config.isProduction) throw new AppError(error.message, 500);
        } else if (data && data.length > 0) {
          return data;
        }
      } catch (err) {
        if (config.isProduction) throw err;
      }
    }

    // Fallback to in-memory store
    return Array.from(mockContracts.values())
      .filter((c) => c.employee_id === employeeId)
      .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
  }

  /**
   * List all contracts with optional filters
   */
  async listContracts({ employeeId, status, page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;

    if (this._useDB()) {
      try {
        let query = db
          .from('contracts')
          .select('*, employees(first_name, last_name, employee_code)', { count: 'exact' });

        if (employeeId) query = query.eq('employee_id', employeeId);
        if (status) query = query.eq('status', status.toUpperCase());

        const { data, error, count } = await query
          .range(offset, offset + limit - 1)
          .order('created_at', { ascending: false });

        if (error) {
          if (config.isProduction) throw new AppError(error.message, 500);
        } else if (data) {
          return {
            contracts: data,
            total: count || data.length,
            page,
            limit,
            totalPages: Math.ceil((count || data.length) / limit),
          };
        }
      } catch (err) {
        if (config.isProduction) throw err;
      }
    }

    let all = Array.from(mockContracts.values());
    if (employeeId) all = all.filter((c) => c.employee_id === employeeId);
    if (status) all = all.filter((c) => c.status.toUpperCase() === status.toUpperCase());

    const paged = all.slice(offset, offset + limit);
    return {
      contracts: paged,
      total: all.length,
      page,
      limit,
      totalPages: Math.ceil(all.length / limit),
    };
  }

  /**
   * Get contract by ID
   */
  async getContractById(id) {
    if (mockContracts.has(id)) {
      return mockContracts.get(id);
    }

    if (this._useDB()) {
      try {
        const { data, error } = await db
          .from('contracts')
          .select('*, employees(*)')
          .eq('id', id)
          .single();

        if (error) {
          if (config.isProduction) {
            if (error.code === 'PGRST116') throw new AppError('Contract not found', 404);
            throw new AppError(error.message, 500);
          }
        } else if (data) {
          return data;
        }
      } catch (err) {
        if (config.isProduction) throw err;
      }
    }

    const item = mockContracts.get(id);
    if (!item) throw new AppError('Contract not found', 404);
    return item;
  }

  /**
   * Check for overlapping contracts for an employee
   */
  async checkOverlap(employeeId, startDate, endDate, excludeId = null) {
    const history = await this.getEmployeeContractHistory(employeeId);
    const startA = new Date(startDate);
    const endA = endDate ? new Date(endDate) : null;

    return history.filter((c) => {
      if (excludeId && c.id === excludeId) return false;
      if (c.status !== 'ACTIVE') return false; // Only active contracts conflict

      const startB = new Date(c.start_date);
      const endB = c.end_date ? new Date(c.end_date) : null;

      const overlapStart = !endB || startA <= endB;
      const overlapEnd = !endA || endA >= startB;

      return overlapStart && overlapEnd;
    });
  }

  /**
   * Create a contract with overlap prevention
   */
  async createContract(payload) {
    const {
      employee_id,
      employeeId,
      contract_type,
      contractType,
      employment_type,
      start_date,
      startDate,
      end_date,
      endDate,
      wage,
      salary_structure_id,
      salaryStructureId,
      status = 'ACTIVE',
      contract_number,
    } = payload;

    const empId = employee_id || employeeId;
    const type = contract_type || contractType || employment_type || 'FULL_TIME';
    const sDate = start_date || startDate;
    const eDate = end_date !== undefined ? end_date : (endDate !== undefined ? endDate : null);
    const salStructId = salary_structure_id || salaryStructureId || null;
    const normalizedStatus = (status || 'ACTIVE').toUpperCase();

    if (!empId) throw new AppError('employee_id is required', 400);
    if (!sDate) throw new AppError('start_date is required', 400);
    if (wage === undefined || wage === null || Number(wage) < 0) {
      throw new AppError('A valid non-negative wage is required', 400);
    }
    if (eDate && new Date(eDate) < new Date(sDate)) {
      throw new AppError('end_date cannot be earlier than start_date', 400);
    }

    // Check for overlapping active contracts
    if (normalizedStatus === 'ACTIVE') {
      const overlaps = await this.checkOverlap(empId, sDate, eDate);
      if (overlaps.length > 0) {
        throw new AppError(
          `Cannot create contract: An overlapping active contract (${overlaps[0].id || overlaps[0].contract_number}) already exists for this period`,
          409
        );
      }
    }

    const contractNum = contract_number || `CNT-${Date.now().toString(36).toUpperCase()}`;
    const record = {
      employee_id: empId,
      contract_number: contractNum,
      contract_type: type,
      employment_type: type,
      start_date: sDate,
      end_date: eDate,
      wage: Number(wage),
      salary_structure_id: salStructId,
      status: normalizedStatus,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (this._useDB()) {
      try {
        const { data, error } = await db
          .from('contracts')
          .insert([record])
          .select('*, employees(first_name, last_name, employee_code)')
          .single();

        if (error) {
          if (error.code === '23505') throw new AppError('Contract number already exists', 409);
          if (config.isProduction) throw new AppError(error.message, 500);
        } else if (data) {
          mockContracts.set(data.id, data);
          return data;
        }
      } catch (err) {
        if (config.isProduction || err.statusCode === 409) throw err;
      }
    }

    const id = `c${Date.now().toString(16).slice(-7)}-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padStart(12, '0')}`;
    const created = { id, ...record };
    mockContracts.set(id, created);
    return created;
  }

  /**
   * Update an existing contract
   */
  async updateContract(id, updates) {
    const existing = await this.getContractById(id);

    const sDate = updates.start_date || updates.startDate || existing.start_date;
    const eDate = updates.end_date !== undefined ? updates.end_date : (updates.endDate !== undefined ? updates.endDate : existing.end_date);
    const newStatus = (updates.status || existing.status).toUpperCase();

    if (eDate && new Date(eDate) < new Date(sDate)) {
      throw new AppError('end_date cannot be earlier than start_date', 400);
    }

    // Check overlap if active
    if (newStatus === 'ACTIVE') {
      const overlaps = await this.checkOverlap(existing.employee_id, sDate, eDate, id);
      if (overlaps.length > 0) {
        throw new AppError(
          `Cannot update contract: Overlaps with existing active contract (${overlaps[0].id || overlaps[0].contract_number})`,
          409
        );
      }
    }

    const merged = {
      ...existing,
      ...updates,
      start_date: sDate,
      end_date: eDate,
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (this._useDB()) {
      try {
        const { data, error } = await db
          .from('contracts')
          .update(merged)
          .eq('id', id)
          .select('*, employees(first_name, last_name, employee_code)')
          .single();

        if (error) {
          if (config.isProduction) throw new AppError(error.message, 500);
        } else if (data) {
          mockContracts.set(id, data);
          return data;
        }
      } catch (err) {
        if (config.isProduction || err.statusCode === 409) throw err;
      }
    }

    mockContracts.set(id, merged);
    return merged;
  }

  /**
   * Clear or seed mock store for testing purposes
   */
  _seedMock(contractsArray) {
    mockContracts.clear();
    for (const c of contractsArray) {
      mockContracts.set(c.id, c);
    }
  }
}

module.exports = new ContractService();
