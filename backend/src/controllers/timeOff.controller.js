/**
 * Time Off Controller — Phase 2
 *
 * Authorization is enforced via RBAC middleware on routes.
 * Additional self-access checks are done inside controller methods
 * to protect employee data isolation.
 */

const timeOffService = require('../services/timeOff.service');
const attendanceService = require('../services/attendance.service');
const { PERMISSIONS, ROLES } = require('../config/rbacConstants');
const AppError = require('../utils/appError');
const { sendSuccess } = require('../utils/apiResponse');

// ---------------------------------------------------------------------------
// HELPER: Determine if requester is HR
// ---------------------------------------------------------------------------
function isHRUser(req) {
  const userRoles = req.user.roles || [];
  const userPermissions = req.user.permissions || [];
  return (
    userRoles.includes(ROLES.ADMIN) ||
    userPermissions.includes(PERMISSIONS.LEAVE_APPROVE) ||
    userPermissions.includes(PERMISSIONS.LEAVE_READ)
  );
}

// ---------------------------------------------------------------------------
// TIME OFF TYPES (Re-export Phase 1 data)
// ---------------------------------------------------------------------------

exports.getTimeOffTypes = async (req, res, next) => {
  try {
    const data = await timeOffService.getTimeOffTypes(req.query);
    return sendSuccess(res, { data });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// ALLOCATIONS
// ---------------------------------------------------------------------------

exports.createAllocation = async (req, res, next) => {
  try {
    const data = await timeOffService.createAllocation({
      ...req.body,
      createdBy: req.user.id,
    });
    return res.status(201).json({ success: true, data, message: 'Allocation created successfully' });
  } catch (error) {
    next(error);
  }
};

exports.getAllocations = async (req, res, next) => {
  try {
    const result = await timeOffService.getAllocations(req.query);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.getAllocationById = async (req, res, next) => {
  try {
    const data = await timeOffService.getAllocationById(req.params.id);
    return sendSuccess(res, { data });
  } catch (error) {
    next(error);
  }
};

exports.updateAllocation = async (req, res, next) => {
  try {
    const data = await timeOffService.updateAllocation(req.params.id, req.body);
    return sendSuccess(res, { data, message: 'Allocation updated successfully' });
  } catch (error) {
    next(error);
  }
};

exports.deleteAllocation = async (req, res, next) => {
  try {
    await timeOffService.deleteAllocation(req.params.id);
    return sendSuccess(res, { data: null, message: 'Allocation deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.approveAllocation = async (req, res, next) => {
  try {
    const data = await timeOffService.approveAllocation(req.params.id, req.user.id);
    return sendSuccess(res, { data, message: 'Allocation approved successfully' });
  } catch (error) {
    next(error);
  }
};

exports.refuseAllocation = async (req, res, next) => {
  try {
    const data = await timeOffService.refuseAllocation(req.params.id, req.user.id, req.body.refusal_reason);
    return sendSuccess(res, { data, message: 'Allocation refused' });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// REQUESTS
// ---------------------------------------------------------------------------

exports.createRequest = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userHR = isHRUser(req);

    // Determine employee_id: HR can specify; employee defaults to themselves
    let employeeId = req.body.employee_id;
    if (!userHR) {
      // Employee: resolve from auth user, ignore any employee_id in body
      const myEmployee = await attendanceService.getEmployeeByUserId(userId);
      employeeId = myEmployee.id;
    }

    if (!employeeId) {
      return next(new AppError('employee_id is required', 400, 'BAD_REQUEST'));
    }

    const data = await timeOffService.createRequest({
      employee_id: employeeId,
      time_off_type_id: req.body.time_off_type_id,
      start_date: req.body.start_date,
      end_date: req.body.end_date,
      reason: req.body.reason,
      duration_hours: req.body.duration_hours,
      submittedBy: userId,
    });

    return res.status(201).json({ success: true, data, message: 'Time off request created' });
  } catch (error) {
    next(error);
  }
};

exports.getRequests = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userHR = isHRUser(req);

    let filters = { ...req.query };

    if (!userHR) {
      // Employee: only own requests
      try {
        const myEmployee = await attendanceService.getEmployeeByUserId(userId);
        filters.employee_id = myEmployee.id;
      } catch (_) {
        return res.status(200).json({ success: true, data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
      }
    }

    const result = await timeOffService.getRequests(filters);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.getRequestById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userHR = isHRUser(req);

    const data = await timeOffService.getRequestById(req.params.id);

    if (!userHR) {
      const myEmployee = await attendanceService.getEmployeeByUserId(userId);
      if (data.employee_id !== myEmployee.id) {
        return next(new AppError('Access denied', 403, 'FORBIDDEN'));
      }
    }

    return sendSuccess(res, { data });
  } catch (error) {
    next(error);
  }
};

exports.updateRequest = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userHR = isHRUser(req);

    const existing = await timeOffService.getRequestById(req.params.id);

    if (!userHR) {
      const myEmployee = await attendanceService.getEmployeeByUserId(userId);
      if (existing.employee_id !== myEmployee.id) {
        return next(new AppError('Access denied', 403, 'FORBIDDEN'));
      }
    }

    const data = await timeOffService.updateRequest(req.params.id, req.body, existing.employee_id);
    return sendSuccess(res, { data, message: 'Request updated successfully' });
  } catch (error) {
    next(error);
  }
};

exports.deleteRequest = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userHR = isHRUser(req);

    const existing = await timeOffService.getRequestById(req.params.id);

    if (!userHR) {
      const myEmployee = await attendanceService.getEmployeeByUserId(userId);
      if (existing.employee_id !== myEmployee.id) {
        return next(new AppError('Access denied', 403, 'FORBIDDEN'));
      }
    }

    await timeOffService.deleteRequest(req.params.id);
    return sendSuccess(res, { data: null, message: 'Request deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.approveRequest = async (req, res, next) => {
  try {
    const data = await timeOffService.approveRequest(req.params.id, req.user.id);
    return sendSuccess(res, { data, message: 'Request approved successfully' });
  } catch (error) {
    next(error);
  }
};

exports.refuseRequest = async (req, res, next) => {
  try {
    const data = await timeOffService.refuseRequest(req.params.id, req.user.id, req.body.refusal_reason);
    return sendSuccess(res, { data, message: 'Request refused' });
  } catch (error) {
    next(error);
  }
};

exports.cancelRequest = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userHR = isHRUser(req);

    const existing = await timeOffService.getRequestById(req.params.id);

    if (!userHR) {
      const myEmployee = await attendanceService.getEmployeeByUserId(userId);
      if (existing.employee_id !== myEmployee.id) {
        return next(new AppError('Access denied', 403, 'FORBIDDEN'));
      }
    }

    const data = await timeOffService.cancelRequest(req.params.id, userId);
    return sendSuccess(res, { data, message: 'Request cancelled. Balance restored if applicable.' });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// EMPLOYEE BALANCE
// ---------------------------------------------------------------------------

exports.getEmployeeBalances = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userHR = isHRUser(req);
    const targetEmployeeId = req.params.id;

    if (!userHR) {
      const myEmployee = await attendanceService.getEmployeeByUserId(userId);
      if (myEmployee.id !== targetEmployeeId) {
        return next(new AppError('Access denied', 403, 'FORBIDDEN'));
      }
    }

    const data = await timeOffService.getEmployeeBalances(targetEmployeeId);
    return sendSuccess(res, { data });
  } catch (error) {
    next(error);
  }
};

exports.getEmployeeRequests = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userHR = isHRUser(req);
    const targetEmployeeId = req.params.id;

    if (!userHR) {
      const myEmployee = await attendanceService.getEmployeeByUserId(userId);
      if (myEmployee.id !== targetEmployeeId) {
        return next(new AppError('Access denied', 403, 'FORBIDDEN'));
      }
    }

    const result = await timeOffService.getRequests({ ...req.query, employee_id: targetEmployeeId });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};
