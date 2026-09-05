/**
 * Attendance Controller — Phase 2
 *
 * Authorization policy (enforced via RBAC middleware on routes):
 *   check-in:   ATTENDANCE_CREATE (employees can check in for themselves; HR can specify employee_id)
 *   check-out:  ATTENDANCE_CREATE (same as check-in)
 *   GET list:   ATTENDANCE_READ (HR) or ATTENDANCE_READ_OWN (employee, filtered to own)
 *   GET by id:  ATTENDANCE_READ | ATTENDANCE_READ_OWN
 *   PUT :id:    ATTENDANCE_UPDATE (HR/Admin only for corrections)
 */

const attendanceService = require('../services/attendance.service');
const { PERMISSIONS, ROLES } = require('../config/rbacConstants');
const AppError = require('../utils/appError');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * POST /api/v1/attendance/check-in
 * Employee checks themselves in; HR can specify employee_id.
 */
exports.checkIn = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRoles = req.user.roles || [];
    const userPermissions = req.user.permissions || [];

    const isHR = userRoles.includes(ROLES.ADMIN) ||
      userRoles.includes(ROLES.HR_MANAGER) ||
      userRoles.includes(ROLES.HR_PAYROLL_MANAGER) ||
      userPermissions.includes(PERMISSIONS.ATTENDANCE_UPDATE);

    // Only HR users can specify a different employee_id
    let employeeId = null;
    if (req.body.employee_id) {
      if (!isHR) {
        return next(new AppError('You cannot check in on behalf of another employee', 403, 'FORBIDDEN'));
      }
      employeeId = req.body.employee_id;
    }

    const record = await attendanceService.checkIn({
      userId,
      employeeId,
      notes: req.body.notes,
      createdBy: userId,
    });

    return res.status(201).json({ success: true, data: record, message: 'Checked in successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/attendance/check-out
 */
exports.checkOut = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRoles = req.user.roles || [];
    const userPermissions = req.user.permissions || [];

    const isHR = userRoles.includes(ROLES.ADMIN) ||
      userRoles.includes(ROLES.HR_MANAGER) ||
      userRoles.includes(ROLES.HR_PAYROLL_MANAGER) ||
      userPermissions.includes(PERMISSIONS.ATTENDANCE_UPDATE);

    let employeeId = null;
    if (req.body.employee_id) {
      if (!isHR) {
        return next(new AppError('You cannot check out on behalf of another employee', 403, 'FORBIDDEN'));
      }
      employeeId = req.body.employee_id;
    }

    const record = await attendanceService.checkOut({
      userId,
      employeeId,
      notes: req.body.notes,
      updatedBy: userId,
    });

    return sendSuccess(res, { data: record, message: 'Checked out successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/attendance
 * HR: returns all attendance with filters.
 * Employee: returns only own attendance.
 */
exports.getAttendance = async (req, res, next) => {
  try {
    const userRoles = req.user.roles || [];
    const userPermissions = req.user.permissions || [];
    const userId = req.user.id;

    const isHR = userRoles.includes(ROLES.ADMIN) ||
      userPermissions.includes(PERMISSIONS.ATTENDANCE_READ);

    let filters = { ...req.query };

    // Employees can only see their own records
    if (!isHR) {
      // Resolve employee_id from user
      try {
        const employee = await attendanceService.getEmployeeByUserId(userId);
        filters.employee_id = employee.id;
      } catch (err) {
        return res.status(200).json({ success: true, data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
      }
    }

    const result = await attendanceService.getAttendance(filters);

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/attendance/:id
 */
exports.getAttendanceById = async (req, res, next) => {
  try {
    const userRoles = req.user.roles || [];
    const userPermissions = req.user.permissions || [];
    const userId = req.user.id;

    const record = await attendanceService.getAttendanceById(req.params.id);

    const isHR = userRoles.includes(ROLES.ADMIN) || userPermissions.includes(PERMISSIONS.ATTENDANCE_READ);

    if (!isHR) {
      // Employee: can only view own record
      const employee = await attendanceService.getEmployeeByUserId(userId);
      if (record.employee_id !== employee.id) {
        return next(new AppError('Access denied', 403, 'FORBIDDEN'));
      }
    }

    return sendSuccess(res, { data: record });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/attendance/:id
 * Attendance correction — HR/Admin only.
 * Requires correction_reason in body.
 */
exports.correctAttendance = async (req, res, next) => {
  try {
    const record = await attendanceService.correctAttendance({
      attendanceId: req.params.id,
      corrections: req.body,
      updatedBy: req.user.id,
    });

    return sendSuccess(res, { data: record, message: 'Attendance corrected successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/employees/:id/attendance
 */
exports.getEmployeeAttendance = async (req, res, next) => {
  try {
    const userRoles = req.user.roles || [];
    const userPermissions = req.user.permissions || [];
    const userId = req.user.id;
    const targetEmployeeId = req.params.id;

    const isHR = userRoles.includes(ROLES.ADMIN) || userPermissions.includes(PERMISSIONS.ATTENDANCE_READ);

    if (!isHR) {
      // Verify caller owns this employee record
      const myEmployee = await attendanceService.getEmployeeByUserId(userId);
      if (myEmployee.id !== targetEmployeeId) {
        return next(new AppError('Access denied', 403, 'FORBIDDEN'));
      }
    }

    const result = await attendanceService.getEmployeeAttendance(targetEmployeeId, req.query);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};
