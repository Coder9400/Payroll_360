/**
 * Employee Service
 * Orchestrates business logic for Employee, Department, and Position management.
 */

const departmentRepo = require('../repositories/department.repository');
const positionRepo   = require('../repositories/position.repository');
const employeeRepo   = require('../repositories/employee.repository');
const AppError       = require('../utils/appError');

class EmployeeService {
  // ─────────────────────────────────────────────────────────────
  // DEPARTMENT OPERATIONS
  // ─────────────────────────────────────────────────────────────

  async listDepartments(opts = {}) {
    return departmentRepo.findAll(opts);
  }

  async createDepartment({ name, description, headId }) {
    // Uniqueness check
    const exists = await departmentRepo.existsByName(name);
    if (exists) {
      throw new AppError(`Department '${name}' already exists`, 409, 'CONFLICT');
    }

    // Validate headId is a real employee if provided
    if (headId) {
      const head = await employeeRepo.findById(headId);
      if (!head || !head.is_active) {
        throw new AppError('headId does not reference an active employee', 400, 'VALIDATION_ERROR');
      }
    }

    return departmentRepo.create({ name, description, headId });
  }

  async updateDepartment(id, { name, description, headId, isActive }) {
    const dept = await departmentRepo.findById(id);
    if (!dept) throw new AppError('Department not found', 404, 'NOT_FOUND');

    if (name && name !== dept.name) {
      const exists = await departmentRepo.existsByName(name, id);
      if (exists) throw new AppError(`Department name '${name}' is already taken`, 409, 'CONFLICT');
    }

    if (headId) {
      const head = await employeeRepo.findById(headId);
      if (!head || !head.is_active) {
        throw new AppError('headId does not reference an active employee', 400, 'VALIDATION_ERROR');
      }
    }

    return departmentRepo.update(id, { name, description, headId, isActive });
  }

  // ─────────────────────────────────────────────────────────────
  // POSITION OPERATIONS
  // ─────────────────────────────────────────────────────────────

  async listPositions(opts = {}) {
    return positionRepo.findAll(opts);
  }

  async createPosition({ title, description, departmentId }) {
    if (departmentId) {
      const dept = await departmentRepo.findById(departmentId);
      if (!dept || !dept.is_active) {
        throw new AppError('departmentId references a department that does not exist or is inactive', 400, 'VALIDATION_ERROR');
      }
    }
    return positionRepo.create({ title, description, departmentId });
  }

  async updatePosition(id, { title, description, departmentId, isActive }) {
    const pos = await positionRepo.findById(id);
    if (!pos) throw new AppError('Position not found', 404, 'NOT_FOUND');

    if (departmentId) {
      const dept = await departmentRepo.findById(departmentId);
      if (!dept || !dept.is_active) {
        throw new AppError('departmentId references a department that does not exist or is inactive', 400, 'VALIDATION_ERROR');
      }
    }

    return positionRepo.update(id, { title, description, departmentId, isActive });
  }

  // ─────────────────────────────────────────────────────────────
  // EMPLOYEE OPERATIONS
  // ─────────────────────────────────────────────────────────────

  async listEmployees(opts = {}) {
    return employeeRepo.findAll(opts);
  }

  async getEmployee(id) {
    const employee = await employeeRepo.findById(id);
    if (!employee) throw new AppError('Employee not found', 404, 'NOT_FOUND');
    return employee;
  }

  async createEmployee(data) {
    const {
      firstName, lastName, email, phone,
      departmentId, positionId, managerId,
      dateOfJoining, employmentStatus,
      bankName, bankAccountNo, bankIfscCode,
    } = data;

    // Email uniqueness
    const existing = await employeeRepo.findByEmail(email);
    if (existing) {
      throw new AppError(`An employee with email '${email}' already exists`, 409, 'CONFLICT');
    }

    // Validate department exists
    if (departmentId) {
      const dept = await departmentRepo.findById(departmentId);
      if (!dept || !dept.is_active) {
        throw new AppError('departmentId references a department that does not exist or is inactive', 400, 'VALIDATION_ERROR');
      }
    }

    // Validate position exists
    if (positionId) {
      const pos = await positionRepo.findById(positionId);
      if (!pos || !pos.is_active) {
        throw new AppError('positionId references a position that does not exist or is inactive', 400, 'VALIDATION_ERROR');
      }
    }

    // Validate manager exists and is active (no self-reference enforced at DB level after insert)
    if (managerId) {
      const manager = await employeeRepo.findById(managerId);
      if (!manager || !manager.is_active) {
        throw new AppError('managerId references an employee that does not exist or is inactive', 400, 'VALIDATION_ERROR');
      }
    }

    return employeeRepo.create({
      firstName, lastName, email, phone,
      departmentId, positionId, managerId,
      dateOfJoining, employmentStatus,
      bankName, bankAccountNo, bankIfscCode,
    });
  }

  async updateEmployee(id, data) {
    const employee = await employeeRepo.findById(id);
    if (!employee) throw new AppError('Employee not found', 404, 'NOT_FOUND');

    const { email, departmentId, positionId, managerId } = data;

    // Email uniqueness (allow keeping the same email)
    if (email && email !== employee.email) {
      const existing = await employeeRepo.findByEmail(email);
      if (existing) {
        throw new AppError(`An employee with email '${email}' already exists`, 409, 'CONFLICT');
      }
    }

    // Cannot set self as manager
    if (managerId && managerId === id) {
      throw new AppError('An employee cannot be their own manager', 400, 'VALIDATION_ERROR');
    }

    // Validate FK references
    if (departmentId) {
      const dept = await departmentRepo.findById(departmentId);
      if (!dept || !dept.is_active) {
        throw new AppError('departmentId references a department that does not exist or is inactive', 400, 'VALIDATION_ERROR');
      }
    }

    if (positionId) {
      const pos = await positionRepo.findById(positionId);
      if (!pos || !pos.is_active) {
        throw new AppError('positionId references a position that does not exist or is inactive', 400, 'VALIDATION_ERROR');
      }
    }

    if (managerId) {
      const manager = await employeeRepo.findById(managerId);
      if (!manager || !manager.is_active) {
        throw new AppError('managerId references an employee that does not exist or is inactive', 400, 'VALIDATION_ERROR');
      }
    }

    return employeeRepo.update(id, data);
  }

  async patchEmployeeStatus(id, status) {
    const employee = await employeeRepo.findById(id);
    if (!employee) throw new AppError('Employee not found', 404, 'NOT_FOUND');
    return employeeRepo.updateStatus(id, status);
  }
}

module.exports = new EmployeeService();
