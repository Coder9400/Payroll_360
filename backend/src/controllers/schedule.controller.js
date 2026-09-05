/**
 * Working Schedule Controller — Phase 4
 */

const scheduleService = require('../services/schedule.service');
const { successResponse } = require('../utils/apiResponse');

/**
 * POST /api/schedules
 */
exports.createSchedule = async (req, res, next) => {
  try {
    const schedule = await scheduleService.createSchedule(req.body);
    return successResponse(res, schedule, 'Working Schedule created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/schedules
 */
exports.getSchedules = async (req, res, next) => {
  try {
    const schedules = await scheduleService.listSchedules();
    return successResponse(res, schedules, 'Working Schedules retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/schedules/:id
 */
exports.getScheduleById = async (req, res, next) => {
  try {
    const schedule = await scheduleService.getScheduleById(req.params.id);
    return successResponse(res, schedule);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/schedules/:id
 */
exports.updateSchedule = async (req, res, next) => {
  try {
    const updated = await scheduleService.updateSchedule(req.params.id, req.body);
    return successResponse(res, updated, 'Working Schedule updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/schedules/assign
 */
exports.assignSchedule = async (req, res, next) => {
  try {
    const assignment = await scheduleService.assignSchedule(req.body);
    return successResponse(res, assignment, 'Working Schedule assigned successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/employees/:employeeId/schedule
 */
exports.getEmployeeSchedule = async (req, res, next) => {
  try {
    const employeeId = req.params.employeeId || req.params.id;
    const { date } = req.query;
    const schedule = await scheduleService.getEmployeeSchedule(employeeId, date);
    return successResponse(res, schedule, 'Employee active working schedule retrieved successfully');
  } catch (error) {
    next(error);
  }
};
