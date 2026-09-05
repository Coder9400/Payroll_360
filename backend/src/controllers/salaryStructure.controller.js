/**
 * Salary Structure Controller
 * ────────────────────────────
 * Thin HTTP adapter layer — delegates all business logic to the service.
 */

'use strict';

const salaryStructureService = require('../services/salaryStructure.service');
const AppError = require('../utils/appError');
const { successResponse } = require('../utils/apiResponse');

// ─── Salary Structures ────────────────────────────────────────────────────────

exports.listStructures = async (req, res, next) => {
  try {
    const { page, limit, is_active } = req.query;
    const result = await salaryStructureService.listStructures({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      is_active: is_active !== undefined ? is_active === 'true' : undefined,
    });
    return res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.getStructure = async (req, res, next) => {
  try {
    const data = await salaryStructureService.getStructureById(req.params.id);
    return successResponse(res, data);
  } catch (err) { next(err); }
};

exports.createStructure = async (req, res, next) => {
  try {
    const data = await salaryStructureService.createStructure(req.body);
    return successResponse(res, data, 'Salary structure created', 201);
  } catch (err) { next(err); }
};

exports.updateStructure = async (req, res, next) => {
  try {
    const data = await salaryStructureService.updateStructure(req.params.id, req.body);
    return successResponse(res, data, 'Salary structure updated');
  } catch (err) { next(err); }
};

exports.deleteStructure = async (req, res, next) => {
  try {
    await salaryStructureService.deleteStructure(req.params.id);
    return res.status(204).end();
  } catch (err) { next(err); }
};

// ─── Salary Rules ─────────────────────────────────────────────────────────────

exports.listRules = async (req, res, next) => {
  try {
    const { structure_id, is_active } = req.query;
    const data = await salaryStructureService.listRules({
      structure_id,
      is_active: is_active !== undefined ? is_active === 'true' : undefined,
    });
    return res.status(200).json({ success: true, data: { rules: data, total: data.length } });
  } catch (err) { next(err); }
};

exports.getRule = async (req, res, next) => {
  try {
    const data = await salaryStructureService.getRuleById(req.params.id);
    return successResponse(res, data);
  } catch (err) { next(err); }
};

exports.createRule = async (req, res, next) => {
  try {
    const data = await salaryStructureService.createRule(req.body);
    return successResponse(res, data, 'Salary rule created', 201);
  } catch (err) { next(err); }
};

exports.updateRule = async (req, res, next) => {
  try {
    const data = await salaryStructureService.updateRule(req.params.id, req.body);
    return successResponse(res, data, 'Salary rule updated');
  } catch (err) { next(err); }
};

exports.deleteRule = async (req, res, next) => {
  try {
    await salaryStructureService.deleteRule(req.params.id);
    return res.status(204).end();
  } catch (err) { next(err); }
};
