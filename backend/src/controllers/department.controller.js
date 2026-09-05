/**
 * Department Controller
 */

const employeeService = require('../services/employee.service');
const { validateDepartment } = require('../validators/department.validator');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * GET /api/departments
 */
const listDepartments = async (req, res, next) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const departments = await employeeService.listDepartments({ includeInactive });
    return sendSuccess(res, {
      data: departments,
      message: 'Departments retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/departments
 */
const createDepartment = async (req, res, next) => {
  try {
    const cleaned = validateDepartment(req.body);
    const department = await employeeService.createDepartment(cleaned);
    return sendSuccess(res, {
      data: department,
      message: 'Department created successfully',
      statusCode: 201,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/departments/:id
 */
const updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cleaned = validateDepartment(req.body, true);
    const department = await employeeService.updateDepartment(id, cleaned);
    return sendSuccess(res, {
      data: department,
      message: 'Department updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { listDepartments, createDepartment, updateDepartment };
