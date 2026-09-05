/**
 * Employee Controller
 */

const employeeService = require('../services/employee.service');
const { validateEmployee, validateStatusPatch } = require('../validators/employee.validator');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * GET /api/employees
 * Query: ?departmentId=<uuid>&positionId=<uuid>&status=<status>&includeInactive=true
 */
const listEmployees = async (req, res, next) => {
  try {
    const { departmentId, positionId, status, includeInactive } = req.query;
    const employees = await employeeService.listEmployees({
      departmentId:    departmentId    || null,
      positionId:      positionId      || null,
      status:          status          || null,
      includeInactive: includeInactive === 'true',
    });
    return sendSuccess(res, {
      data: employees,
      message: 'Employees retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/employees/:id
 */
const getEmployee = async (req, res, next) => {
  try {
    const employee = await employeeService.getEmployee(req.params.id);
    return sendSuccess(res, {
      data: employee,
      message: 'Employee retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/employees
 */
const createEmployee = async (req, res, next) => {
  try {
    const cleaned = validateEmployee(req.body);
    const employee = await employeeService.createEmployee(cleaned);
    return sendSuccess(res, {
      data: employee,
      message: 'Employee created successfully',
      statusCode: 201,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/employees/:id
 */
const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cleaned = validateEmployee(req.body, true);
    const employee = await employeeService.updateEmployee(id, cleaned);
    return sendSuccess(res, {
      data: employee,
      message: 'Employee updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/employees/:id/status
 */
const patchEmployeeStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = validateStatusPatch(req.body);
    const employee = await employeeService.patchEmployeeStatus(id, status);
    return sendSuccess(res, {
      data: employee,
      message: `Employee status updated to '${status}'`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { listEmployees, getEmployee, createEmployee, updateEmployee, patchEmployeeStatus };
