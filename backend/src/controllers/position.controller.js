/**
 * Position Controller
 */

const employeeService = require('../services/employee.service');
const { validatePosition } = require('../validators/position.validator');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * GET /api/positions
 * Query: ?departmentId=<uuid>&includeInactive=true
 */
const listPositions = async (req, res, next) => {
  try {
    const { departmentId, includeInactive } = req.query;
    const positions = await employeeService.listPositions({
      departmentId: departmentId || null,
      includeInactive: includeInactive === 'true',
    });
    return sendSuccess(res, {
      data: positions,
      message: 'Positions retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/positions
 */
const createPosition = async (req, res, next) => {
  try {
    const cleaned = validatePosition(req.body);
    const position = await employeeService.createPosition(cleaned);
    return sendSuccess(res, {
      data: position,
      message: 'Position created successfully',
      statusCode: 201,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/positions/:id
 */
const updatePosition = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cleaned = validatePosition(req.body, true);
    const position = await employeeService.updatePosition(id, cleaned);
    return sendSuccess(res, {
      data: position,
      message: 'Position updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { listPositions, createPosition, updatePosition };
