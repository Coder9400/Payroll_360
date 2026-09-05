/**
 * Contract Controller — Phase 4
 */

const contractService = require('../services/contract.service');
const { successResponse } = require('../utils/apiResponse');
const AppError = require('../utils/appError');

/**
 * POST /api/contracts
 */
exports.createContract = async (req, res, next) => {
  try {
    const contract = await contractService.createContract(req.body);
    return successResponse(res, contract, 'Contract created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/contracts
 */
exports.getContracts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, employee_id, employeeId, status } = req.query;
    const result = await contractService.listContracts({
      employeeId: employee_id || employeeId,
      status,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    return res.status(200).json({
      success: true,
      data: result.contracts,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/contracts/:id
 */
exports.getContractById = async (req, res, next) => {
  try {
    const contract = await contractService.getContractById(req.params.id);
    return successResponse(res, contract);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/contracts/:id
 */
exports.updateContract = async (req, res, next) => {
  try {
    const updated = await contractService.updateContract(req.params.id, req.body);
    return successResponse(res, updated, 'Contract updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/employees/:employeeId/contracts or GET /api/contracts/employee/:employeeId
 */
exports.getEmployeeContractHistory = async (req, res, next) => {
  try {
    const employeeId = req.params.employeeId || req.params.id;
    const history = await contractService.getEmployeeContractHistory(employeeId);
    return successResponse(res, history, 'Employee contract history retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * CRITICAL ENDPOINT:
 * GET /api/contracts/applicable/:employeeId
 * Query: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD or ?payrollStartDate=...&payrollEndDate=...
 * Also supports legacy GET /api/contracts/applicable/:employeeId/:date
 */
exports.getApplicableContract = async (req, res, next) => {
  try {
    const employeeId = req.params.employeeId || req.params.id;
    const date = req.params.date;
    const startDate = req.query.startDate || req.query.payrollStartDate || req.query.start_date || date;
    const endDate = req.query.endDate || req.query.payrollEndDate || req.query.end_date || date;

    if (!startDate || !endDate) {
      throw new AppError('Both startDate and endDate query parameters are required for resolving applicable contract', 400);
    }

    const contract = await contractService.getApplicableContract(employeeId, startDate, endDate);
    return successResponse(res, contract, 'Applicable contract retrieved successfully');
  } catch (error) {
    next(error);
  }
};
