/**
 * Attendance Controller — Phase 5
 *
 * Implements strict RBAC and IDOR protection:
 * - Ordinary employees may only check in/out, view history, and submit regularization for themselves.
 * - Any attempt by an ordinary employee to manipulate or query another employee's attendance
 *   is strictly rejected with HTTP 403 Forbidden.
 * - HR Managers and Administrators hold organization-wide attendance management privileges.
 */

const attendanceService = require('../services/attendance.service');
const employeeRepo = require('../repositories/employee.repository');
const { successResponse } = require('../utils/apiResponse');
const AppError = require('../utils/appError');
const { PERMISSIONS, ROLES } = require('../config/rbacConstants');

/**
 * Determines whether the authenticated user has manager/admin level attendance authority.
 */
function isAttendanceManager(user) {
  if (!user) return false;
  const roles = user.roles || [];
  const perms = user.permissions || [];
  return (
    roles.includes(ROLES.ADMIN) ||
    roles.includes(ROLES.HR_MANAGER) ||
    roles.includes(ROLES.HR_PAYROLL_MANAGER) ||
    perms.includes(PERMISSIONS.ADMIN_ALL) ||
    perms.includes(PERMISSIONS.ATTENDANCE_APPROVE) ||
    perms.includes('attendance:manage')
  );
}

/**
 * Resolves the authenticated user's associated employee record.
 */
async function getAuthenticatedEmployee(req) {
  if (req.user?.employee) return req.user.employee;

  // 1. If req.user already has an employee_id attached
  if (req.user?.employee_id) {
    const emp = await employeeRepo.findById(req.user.employee_id);
    if (emp) {
      req.user.employee = emp;
      return emp;
    }
  }

  // 2. Check if user.id directly matches an employee ID (mock/seeded environment)
  if (req.user?.id) {
    const empById = await employeeRepo.findById(req.user.id);
    if (empById) {
      req.user.employee = empById;
      req.user.employee_id = empById.id;
      return empById;
    }
  }

  // 3. Match employee by user_id
  if (req.user?.id) {
    try {
      const all = await employeeRepo.findAll({ includeInactive: true });
      const empByUserId = all.find((e) => e.user_id === req.user.id);
      if (empByUserId) {
        req.user.employee = empByUserId;
        req.user.employee_id = empByUserId.id;
        return empByUserId;
      }
    } catch {
      // Fallback
    }
  }

  // 4. Match employee by email
  if (req.user?.email) {
    try {
      const empByEmail = await employeeRepo.findByEmail(req.user.email);
      if (empByEmail) {
        req.user.employee = empByEmail;
        req.user.employee_id = empByEmail.id;
        return empByEmail;
      }
    } catch {
      // Fallback
    }
  }

  return null;
}

/**
 * GET /api/attendance/current
 * Retrieves the currently active session for the authenticated employee.
 */
exports.getCurrentSession = async (req, res, next) => {
  try {
    const authEmp = await getAuthenticatedEmployee(req);
    const empId = authEmp ? authEmp.id : req.user?.id;
    if (!empId) {
      return successResponse(res, null, 'No active employee profile associated with user', 200);
    }
    const record = await attendanceService.findOpenRecord(empId);
    return successResponse(res, record, 'Current session retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/attendance/check-in
 */
exports.checkIn = async (req, res, next) => {
  try {
    const isManager = isAttendanceManager(req.user);
    const authEmp = await getAuthenticatedEmployee(req);
    const requestedEmployeeId = req.body?.employee_id || req.body?.employeeId;

    let targetEmployeeId = null;

    if (isManager) {
      // Managers can check in on behalf of specified employee or themselves
      targetEmployeeId = requestedEmployeeId || authEmp?.id || req.user?.id;
    } else {
      // Normal employee: MUST only check in for themselves
      const selfId = authEmp ? authEmp.id : req.user?.id;
      if (!selfId) {
        throw new AppError('Authenticated user is not associated with an employee profile', 400, 'NO_EMPLOYEE_PROFILE');
      }
      if (requestedEmployeeId && requestedEmployeeId !== selfId) {
        throw new AppError('Access denied: You can only record attendance for yourself', 403, 'FORBIDDEN');
      }
      targetEmployeeId = selfId;
    }

    if (!targetEmployeeId) {
      throw new AppError('employee_id is required for check-in', 400, 'VALIDATION_ERROR');
    }

    const checkInTime = req.body?.check_in || req.body?.checkIn;
    const notes = req.body?.notes;

    const record = await attendanceService.checkIn({
      employeeId: targetEmployeeId,
      checkInTime,
      notes,
    });

    return successResponse(res, record, 'Check-in recorded successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/attendance/check-out
 */
exports.checkOut = async (req, res, next) => {
  try {
    const isManager = isAttendanceManager(req.user);
    const authEmp = await getAuthenticatedEmployee(req);
    const requestedEmployeeId = req.body?.employee_id || req.body?.employeeId;

    let targetEmployeeId = null;

    if (isManager) {
      targetEmployeeId = requestedEmployeeId || authEmp?.id || req.user?.id;
    } else {
      const selfId = authEmp ? authEmp.id : req.user?.id;
      if (!selfId) {
        throw new AppError('Authenticated user is not associated with an employee profile', 400, 'NO_EMPLOYEE_PROFILE');
      }
      if (requestedEmployeeId && requestedEmployeeId !== selfId) {
        throw new AppError('Access denied: You can only record attendance for yourself', 403, 'FORBIDDEN');
      }
      targetEmployeeId = selfId;
    }

    if (!targetEmployeeId) {
      throw new AppError('employee_id is required for check-out', 400, 'VALIDATION_ERROR');
    }

    const checkOutTime = req.body?.check_out || req.body?.checkOut;
    const notes = req.body?.notes;

    const record = await attendanceService.checkOut({
      employeeId: targetEmployeeId,
      checkOutTime,
      notes,
    });

    return successResponse(res, record, 'Check-out recorded successfully', 200);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/attendance/history or GET /api/attendance
 */
exports.getAttendanceHistory = async (req, res, next) => {
  try {
    const isManager = isAttendanceManager(req.user);
    const authEmp = await getAuthenticatedEmployee(req);
    const requestedEmployeeId = req.query?.employee_id || req.query?.employeeId;

    let effectiveEmployeeId = null;

    if (isManager) {
      effectiveEmployeeId = requestedEmployeeId || null;
    } else {
      const selfId = authEmp ? authEmp.id : req.user?.id;
      if (requestedEmployeeId && requestedEmployeeId !== selfId) {
        throw new AppError('Access denied: You can only view your own attendance history', 403, 'FORBIDDEN');
      }
      effectiveEmployeeId = selfId;
    }

    const {
      page = 1,
      limit = 20,
      status,
      startDate,
      endDate,
    } = req.query;

    const result = await attendanceService.getAttendanceHistory({
      employeeId: effectiveEmployeeId,
      startDate,
      endDate,
      status,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    return successResponse(res, result.records, 'Attendance history retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/attendance/employee/:employeeId or GET /api/employees/:id/attendance
 */
exports.getEmployeeAttendance = async (req, res, next) => {
  try {
    const isManager = isAttendanceManager(req.user);
    const authEmp = await getAuthenticatedEmployee(req);
    const targetEmployeeId = req.params?.employeeId || req.params?.id;

    if (!isManager) {
      const selfId = authEmp ? authEmp.id : req.user?.id;
      if (targetEmployeeId !== selfId) {
        throw new AppError('Access denied: You can only view your own attendance records', 403, 'FORBIDDEN');
      }
    }

    const { page = 1, limit = 20, status, startDate, endDate } = req.query;

    const result = await attendanceService.getEmployeeAttendance(targetEmployeeId, {
      startDate,
      endDate,
      status,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    return successResponse(res, result.records, 'Employee attendance retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/attendance/regularization
 */
exports.createRegularizationRequest = async (req, res, next) => {
  try {
    const isManager = isAttendanceManager(req.user);
    const authEmp = await getAuthenticatedEmployee(req);
    const requestedEmployeeId = req.body?.employee_id || req.body?.employeeId;

    let targetEmployeeId = null;

    if (isManager) {
      targetEmployeeId = requestedEmployeeId || authEmp?.id || req.user?.id;
    } else {
      const selfId = authEmp ? authEmp.id : req.user?.id;
      if (requestedEmployeeId && requestedEmployeeId !== selfId) {
        throw new AppError('Access denied: You can only submit regularization requests for your own attendance', 403, 'FORBIDDEN');
      }
      targetEmployeeId = selfId;
    }

    const attId = req.body?.attendance_id || req.body?.attendanceId;
    const attendanceRecord = await attendanceService.getAttendanceById(attId);

    // Prevent regularizing another employee's record
    if (!isManager && attendanceRecord.employee_id !== targetEmployeeId) {
      throw new AppError('Access denied: You can only regularize your own attendance record', 403, 'FORBIDDEN');
    }

    const reqIn = req.body?.requested_check_in || req.body?.requestedCheckIn;
    const reqOut = req.body?.requested_check_out || req.body?.requestedCheckOut;
    const reason = req.body?.reason;
    const requestedBy = req.user?.id;

    const result = await attendanceService.createRegularizationRequest({
      attendanceId: attId,
      requestedCheckIn: reqIn,
      requestedCheckOut: reqOut,
      reason,
      requestedBy,
      employeeId: targetEmployeeId,
    });

    return successResponse(res, result, 'Regularization request submitted successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/attendance/regularization
 */
exports.listRegularizationRequests = async (req, res, next) => {
  try {
    const isManager = isAttendanceManager(req.user);
    const authEmp = await getAuthenticatedEmployee(req);
    const requestedEmployeeId = req.query?.employee_id || req.query?.employeeId;

    let effectiveEmployeeId = null;

    if (isManager) {
      effectiveEmployeeId = requestedEmployeeId || null;
    } else {
      const selfId = authEmp ? authEmp.id : req.user?.id;
      if (requestedEmployeeId && requestedEmployeeId !== selfId) {
        throw new AppError('Access denied: You can only view your own regularization requests', 403, 'FORBIDDEN');
      }
      effectiveEmployeeId = selfId;
    }

    const { page = 1, limit = 20, status } = req.query;

    const result = await attendanceService.listRegularizationRequests({
      employeeId: effectiveEmployeeId,
      status,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    return successResponse(res, result.requests, 'Regularization requests retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/attendance/regularization/:id/approve
 */
exports.approveRegularization = async (req, res, next) => {
  try {
    const requestId = req.params.id;
    const approvedBy = req.user?.id;

    const result = await attendanceService.approveRegularization(requestId, approvedBy);
    return successResponse(res, result, 'Regularization request approved and attendance updated successfully', 200);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/attendance/regularization/:id/reject
 */
exports.rejectRegularization = async (req, res, next) => {
  try {
    const requestId = req.params.id;
    const rejectedBy = req.user?.id;
    const reason = req.body?.rejection_reason || req.body?.reason || 'Rejected by manager';

    const result = await attendanceService.rejectRegularization(requestId, rejectedBy, reason);
    return successResponse(res, result, 'Regularization request rejected successfully', 200);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/attendance/overtime
 */
exports.getOvertimeRecords = async (req, res, next) => {
  try {
    const isManager = isAttendanceManager(req.user);
    const authEmp = await getAuthenticatedEmployee(req);
    const requestedEmployeeId = req.query?.employee_id || req.query?.employeeId;

    let effectiveEmployeeId = null;

    if (isManager) {
      effectiveEmployeeId = requestedEmployeeId || null;
    } else {
      const selfId = authEmp ? authEmp.id : req.user?.id;
      if (requestedEmployeeId && requestedEmployeeId !== selfId) {
        throw new AppError('Access denied: You can only view your own overtime records', 403, 'FORBIDDEN');
      }
      effectiveEmployeeId = selfId;
    }

    const { page = 1, limit = 20, status, startDate, endDate } = req.query;

    const result = await attendanceService.listOvertimeRecords({
      employeeId: effectiveEmployeeId,
      startDate,
      endDate,
      status,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    return successResponse(res, result.records, 'Overtime records retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};
