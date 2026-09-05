/**
 * Time Off Controller — Phase 2
 *
 * Authorization is enforced via RBAC middleware on routes.
 * Additional self-access checks are done inside controller methods
 * to protect employee data isolation.
 *
 * Leave routing: a request's recipient_user_id is the specific approver it
 * was addressed to (defaults to the employee's manager). isHRUser() is
 * always an override — HR/Admin can act on any request in their tenant
 * regardless of who it was routed to, so a request never gets stuck if the
 * chosen recipient is unavailable.
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

/**
 * A request can be acted on (approved/refused) by its chosen recipient, or
 * by any HR/Admin in the tenant as a fallback.
 */
function canActOnRequest(req, request) {
  return isHRUser(req) || request.recipient_user_id === req.user.id;
}

// ---------------------------------------------------------------------------
// TIME OFF TYPES (Re-export Phase 1 data)
// ---------------------------------------------------------------------------

exports.getTimeOffTypes = async (req, res, next) => {
  try {
    const data = await timeOffService.getTimeOffTypes(req.user.tenantId, req.query);
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
    const data = await timeOffService.createAllocation(req.user.tenantId, {
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
    const result = await timeOffService.getAllocations(req.user.tenantId, req.query);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.getAllocationById = async (req, res, next) => {
  try {
    const data = await timeOffService.getAllocationById(req.user.tenantId, req.params.id);
    return sendSuccess(res, { data });
  } catch (error) {
    next(error);
  }
};

exports.updateAllocation = async (req, res, next) => {
  try {
    const data = await timeOffService.updateAllocation(req.user.tenantId, req.params.id, req.body);
    return sendSuccess(res, { data, message: 'Allocation updated successfully' });
  } catch (error) {
    next(error);
  }
};

exports.deleteAllocation = async (req, res, next) => {
  try {
    await timeOffService.deleteAllocation(req.user.tenantId, req.params.id);
    return sendSuccess(res, { data: null, message: 'Allocation deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.approveAllocation = async (req, res, next) => {
  try {
    const data = await timeOffService.approveAllocation(req.user.tenantId, req.params.id, req.user.id);
    return sendSuccess(res, { data, message: 'Allocation approved successfully' });
  } catch (error) {
    next(error);
  }
};

exports.refuseAllocation = async (req, res, next) => {
  try {
    const data = await timeOffService.refuseAllocation(req.user.tenantId, req.params.id, req.user.id, req.body.refusal_reason);
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
      if (!req.user.employee) {
        return next(new AppError('No employee record linked to this user', 400, 'BAD_REQUEST'));
      }
      employeeId = req.user.employee.id;
    }

    if (!employeeId) {
      return next(new AppError('employee_id is required', 400, 'BAD_REQUEST'));
    }

    const data = await timeOffService.createRequest(req.user.tenantId, {
      employee_id: employeeId,
      time_off_type_id: req.body.time_off_type_id,
      start_date: req.body.start_date,
      end_date: req.body.end_date,
      reason: req.body.reason,
      duration_hours: req.body.duration_hours,
      recipient_user_id: req.body.recipient_user_id,
      submittedBy: userId,
    });

    return res.status(201).json({ success: true, data, message: 'Time off request created' });
  } catch (error) {
    next(error);
  }
};

exports.getRequests = async (req, res, next) => {
  try {
    const userHR = isHRUser(req);

    let filters = { ...req.query };

    // `?recipient=me` scopes to the caller's own "sent to me" approval inbox —
    // available to anyone (not just HR), since any employee can be someone
    // else's chosen recipient (e.g. a manager who isn't an HR role).
    if (filters.recipient === 'me') {
      filters.recipient_user_id = req.user.id;
      delete filters.recipient;
    } else if (!userHR) {
      // Employee (no HR-wide view, didn't ask for their own approval inbox): only own requests
      if (!req.user.employee) {
        return res.status(200).json({ success: true, data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
      }
      filters.employee_id = req.user.employee.id;
    }

    const result = await timeOffService.getRequests(req.user.tenantId, filters);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.getRequestById = async (req, res, next) => {
  try {
    const userHR = isHRUser(req);

    const data = await timeOffService.getRequestById(req.user.tenantId, req.params.id);

    if (!userHR && data.recipient_user_id !== req.user.id) {
      if (!req.user.employee || data.employee_id !== req.user.employee.id) {
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
    const userHR = isHRUser(req);

    const existing = await timeOffService.getRequestById(req.user.tenantId, req.params.id);

    if (!userHR) {
      if (!req.user.employee || existing.employee_id !== req.user.employee.id) {
        return next(new AppError('Access denied', 403, 'FORBIDDEN'));
      }
    }

    const data = await timeOffService.updateRequest(req.user.tenantId, req.params.id, req.body, existing.employee_id);
    return sendSuccess(res, { data, message: 'Request updated successfully' });
  } catch (error) {
    next(error);
  }
};

exports.deleteRequest = async (req, res, next) => {
  try {
    const userHR = isHRUser(req);

    const existing = await timeOffService.getRequestById(req.user.tenantId, req.params.id);

    if (!userHR) {
      if (!req.user.employee || existing.employee_id !== req.user.employee.id) {
        return next(new AppError('Access denied', 403, 'FORBIDDEN'));
      }
    }

    await timeOffService.deleteRequest(req.user.tenantId, req.params.id);
    return sendSuccess(res, { data: null, message: 'Request deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.approveRequest = async (req, res, next) => {
  try {
    const existing = await timeOffService.getRequestById(req.user.tenantId, req.params.id);
    if (!canActOnRequest(req, existing)) {
      return next(new AppError('Only the chosen recipient or HR/Admin can approve this request', 403, 'FORBIDDEN'));
    }
    const data = await timeOffService.approveRequest(req.user.tenantId, req.params.id, req.user.id);
    return sendSuccess(res, { data, message: 'Request approved successfully' });
  } catch (error) {
    next(error);
  }
};

exports.refuseRequest = async (req, res, next) => {
  try {
    const existing = await timeOffService.getRequestById(req.user.tenantId, req.params.id);
    if (!canActOnRequest(req, existing)) {
      return next(new AppError('Only the chosen recipient or HR/Admin can refuse this request', 403, 'FORBIDDEN'));
    }
    const data = await timeOffService.refuseRequest(req.user.tenantId, req.params.id, req.user.id, req.body.refusal_reason);
    return sendSuccess(res, { data, message: 'Request refused' });
  } catch (error) {
    next(error);
  }
};

exports.cancelRequest = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userHR = isHRUser(req);

    const existing = await timeOffService.getRequestById(req.user.tenantId, req.params.id);

    if (!userHR) {
      if (!req.user.employee || existing.employee_id !== req.user.employee.id) {
        return next(new AppError('Access denied', 403, 'FORBIDDEN'));
      }
    }

    const data = await timeOffService.cancelRequest(req.user.tenantId, req.params.id, userId);
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
    const userHR = isHRUser(req);
    const targetEmployeeId = req.params.id;

    if (!userHR) {
      if (!req.user.employee || req.user.employee.id !== targetEmployeeId) {
        return next(new AppError('Access denied', 403, 'FORBIDDEN'));
      }
    }

    const data = await timeOffService.getEmployeeBalances(req.user.tenantId, targetEmployeeId);
    return sendSuccess(res, { data });
  } catch (error) {
    next(error);
  }
};

exports.getEmployeeRequests = async (req, res, next) => {
  try {
    const userHR = isHRUser(req);
    const targetEmployeeId = req.params.id;

    if (!userHR) {
      if (!req.user.employee || req.user.employee.id !== targetEmployeeId) {
        return next(new AppError('Access denied', 403, 'FORBIDDEN'));
      }
    }

    const result = await timeOffService.getRequests(req.user.tenantId, { ...req.query, employee_id: targetEmployeeId });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

/**
 * Candidates an employee can route their leave request to (manager + tenant
 * HR/Admin), for the request form's "Send to" picker.
 */
exports.getApprovalCandidates = async (req, res, next) => {
  try {
    const userHR = isHRUser(req);
    const targetEmployeeId = req.params.id;

    if (!userHR) {
      if (!req.user.employee || req.user.employee.id !== targetEmployeeId) {
        return next(new AppError('Access denied', 403, 'FORBIDDEN'));
      }
    }

    const data = await timeOffService.getApprovalCandidates(req.user.tenantId, targetEmployeeId);
    return sendSuccess(res, { data });
  } catch (error) {
    next(error);
  }
};
