/**
 * Time Off Routes — Phase 2
 *
 * Permissions:
 *   Types:          authenticated (read-only)
 *   Allocations:    leave:create/read/update/delete (HR), leave:read_own (employee)
 *   Requests:       leave:create/read (employee for own), leave:approve (HR)
 *   Balance:        leave:read_own (employee) | leave:read (HR)
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const timeOffController = require('../controllers/timeOff.controller');
const {
  createAllocationSchema,
  updateAllocationSchema,
  refuseAllocationSchema,
  createRequestSchema,
  updateRequestSchema,
  refuseRequestSchema,
  cancelRequestSchema,
} = require('../validators/attendance.validator');
const { PERMISSIONS } = require('../config/rbacConstants');

// All time off routes require authentication
router.use(requireAuth());

// ---------------------------------------------------------------------------
// TYPES (Phase 1 data, re-exposed under time-off/types)
// ---------------------------------------------------------------------------
router.get('/types', timeOffController.getTimeOffTypes);

// ---------------------------------------------------------------------------
// ALLOCATIONS
// ---------------------------------------------------------------------------
router.post(
  '/allocations',
  requirePermission(PERMISSIONS.LEAVE_CREATE),
  validate(createAllocationSchema),
  timeOffController.createAllocation
);

router.get(
  '/allocations',
  requirePermission(PERMISSIONS.LEAVE_READ),
  timeOffController.getAllocations
);

router.get(
  '/allocations/:id',
  requirePermission(PERMISSIONS.LEAVE_READ),
  timeOffController.getAllocationById
);

router.put(
  '/allocations/:id',
  requirePermission(PERMISSIONS.LEAVE_UPDATE),
  validate(updateAllocationSchema),
  timeOffController.updateAllocation
);

router.delete(
  '/allocations/:id',
  requirePermission(PERMISSIONS.LEAVE_DELETE),
  timeOffController.deleteAllocation
);

router.post(
  '/allocations/:id/approve',
  requirePermission(PERMISSIONS.LEAVE_APPROVE),
  timeOffController.approveAllocation
);

router.post(
  '/allocations/:id/refuse',
  requirePermission(PERMISSIONS.LEAVE_APPROVE),
  validate(refuseAllocationSchema),
  timeOffController.refuseAllocation
);

// ---------------------------------------------------------------------------
// REQUESTS
// ---------------------------------------------------------------------------
router.post(
  '/requests',
  requirePermission(PERMISSIONS.LEAVE_CREATE),
  validate(createRequestSchema),
  timeOffController.createRequest
);

router.get(
  '/requests',
  requirePermission(PERMISSIONS.LEAVE_READ_OWN),
  timeOffController.getRequests
);

router.get(
  '/requests/:id',
  requirePermission(PERMISSIONS.LEAVE_READ_OWN),
  timeOffController.getRequestById
);

router.put(
  '/requests/:id',
  requirePermission(PERMISSIONS.LEAVE_UPDATE),
  validate(updateRequestSchema),
  timeOffController.updateRequest
);

router.delete(
  '/requests/:id',
  requirePermission(PERMISSIONS.LEAVE_DELETE),
  timeOffController.deleteRequest
);

// No route-level permission gate here on purpose: requirePermission() requires
// ALL listed permissions (AND, not OR), so it can't express "HR/Admin OR the
// request's chosen recipient" — a plain employee acting as someone's manager
// would never hold leave:approve. Authorization is instead fully enforced in
// the controller via canActOnRequest() (isHRUser() OR recipient_user_id match).
router.post(
  '/requests/:id/approve',
  timeOffController.approveRequest
);

router.post(
  '/requests/:id/refuse',
  validate(refuseRequestSchema),
  timeOffController.refuseRequest
);

router.post(
  '/requests/:id/cancel',
  requirePermission(PERMISSIONS.LEAVE_CREATE), // employees can cancel own; controller verifies ownership
  validate(cancelRequestSchema),
  timeOffController.cancelRequest
);

module.exports = router;
