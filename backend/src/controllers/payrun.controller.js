/**
 * Payrun Controller
 * ─────────────────
 * HTTP adapter for payrun and payslip operations.
 * All business logic is in payrun.service.js.
 */

'use strict';

const payrunService = require('../services/payrun.service');
const { successResponse } = require('../utils/apiResponse');

// ─── Payruns ──────────────────────────────────────────────────────────────────

exports.listPayruns = async (req, res, next) => {
  try {
    const { page, limit, status } = req.query;
    const result = await payrunService.listPayruns(req.user.tenantId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      status,
    });
    return res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.getPayrun = async (req, res, next) => {
  try {
    const data = await payrunService.getPayrunById(req.user.tenantId, req.params.id);
    return successResponse(res, data);
  } catch (err) { next(err); }
};

exports.createPayrun = async (req, res, next) => {
  try {
    const data = await payrunService.createPayrun(req.user.tenantId, req.body, req.user.id);
    return successResponse(res, data, 'Payrun created', 201);
  } catch (err) { next(err); }
};

exports.getEligibleEmployees = async (req, res, next) => {
  try {
    const data = await payrunService.getEligibleEmployees(req.user.tenantId, req.params.id);
    return res.status(200).json({ success: true, data: { employees: data, total: data.length } });
  } catch (err) { next(err); }
};

exports.computePayrun = async (req, res, next) => {
  try {
    const { employee_ids } = req.body;
    if (!employee_ids || !Array.isArray(employee_ids)) {
      return res.status(400).json({ success: false, error: { message: 'employee_ids array is required' } });
    }
    const data = await payrunService.computePayrun(req.user.tenantId, req.params.id, employee_ids);
    return successResponse(res, data, 'Payrun computed successfully');
  } catch (err) { next(err); }
};

exports.validatePayrun = async (req, res, next) => {
  try {
    const data = await payrunService.validatePayrun(req.user.tenantId, req.params.id);
    return successResponse(res, data, 'Payrun validated successfully');
  } catch (err) { next(err); }
};

exports.markAsPaid = async (req, res, next) => {
  try {
    const data = await payrunService.markAsPaid(req.user.tenantId, req.params.id);
    return successResponse(res, data, 'Payrun marked as paid');
  } catch (err) { next(err); }
};

// ─── Payslips ─────────────────────────────────────────────────────────────────

exports.listPayslips = async (req, res, next) => {
  try {
    const { page, limit, payrun_id, employee_id, status } = req.query;
    const result = await payrunService.listPayslips(req.user.tenantId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      payrun_id,
      employee_id,
      status,
    });
    return res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.getPayslip = async (req, res, next) => {
  try {
    const data = await payrunService.getPayslipById(req.user.tenantId, req.params.id, req.user);
    return successResponse(res, data);
  } catch (err) { next(err); }
};

exports.getMyPayslips = async (req, res, next) => {
  try {
    const employeeId = req.user?.employee?.id;
    const { page, limit } = req.query;
    const result = await payrunService.getMyPayslips(req.user.tenantId, employeeId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
    });
    return res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};
