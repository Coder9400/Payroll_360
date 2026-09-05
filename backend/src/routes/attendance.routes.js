/**
 * Attendance Routes — Phase 2
 *
 * Permissions:
 *   POST /check-in:     attendance:create (employee checks in for themselves; HR can specify employee_id)
 *   POST /check-out:    attendance:create
 *   GET  /:             attendance:read (HR) | attendance:read_own (employee — controller filters)
 *   GET  /:id:          attendance:read | attendance:read_own
 *   PUT  /:id:          attendance:update (HR correction only)
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const validate = require('../middleware/validate.middleware');
const attendanceController = require('../controllers/attendance.controller');
const {
  checkInSchema,
  checkOutSchema,
  correctAttendanceSchema,
} = require('../validators/attendance.validator');
const { PERMISSIONS } = require('../config/rbacConstants');

// All attendance routes require authentication
router.use(requireAuth());

// Employee self-service: check-in and check-out
router.post(
  '/check-in',
  requirePermission(PERMISSIONS.ATTENDANCE_CREATE),
  validate(checkInSchema),
  attendanceController.checkIn
);

router.post(
  '/check-out',
  requirePermission(PERMISSIONS.ATTENDANCE_CREATE),
  validate(checkOutSchema),
  attendanceController.checkOut
);

// List attendance records (HR: all; Employee: own — filtered in controller)
router.get(
  '/',
  requirePermission(PERMISSIONS.ATTENDANCE_READ_OWN),
  attendanceController.getAttendance
);

// Get single record
router.get(
  '/:id',
  requirePermission(PERMISSIONS.ATTENDANCE_READ_OWN),
  attendanceController.getAttendanceById
);

// HR/Admin correction only
router.put(
  '/:id',
  requirePermission(PERMISSIONS.ATTENDANCE_UPDATE),
  validate(correctAttendanceSchema),
  attendanceController.correctAttendance
);

module.exports = router;
