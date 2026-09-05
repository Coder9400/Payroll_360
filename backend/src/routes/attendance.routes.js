const express = require('express');
const router = express.Router();
const validate = require('../middleware/validate.middleware');
const {
  checkInSchema,
  checkOutSchema,
  createRegularizationSchema,
  actionRegularizationSchema,
} = require('../validators/attendance.validator');
const attendanceController = require('../controllers/attendance.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAnyPermission } = require('../middleware/rbac.middleware');
const { PERMISSIONS } = require('../config/rbacConstants');

router.use(requireAuth());

// POST /api/attendance/check-in
router.post(
  '/check-in',
  requireAnyPermission(PERMISSIONS.ATTENDANCE_CREATE, PERMISSIONS.ATTENDANCE_READ_OWN, 'attendance:create'),
  validate(checkInSchema),
  attendanceController.checkIn
);

// POST /api/attendance/check-out
router.post(
  '/check-out',
  requireAnyPermission(PERMISSIONS.ATTENDANCE_CREATE, PERMISSIONS.ATTENDANCE_READ_OWN, 'attendance:create'),
  validate(checkOutSchema),
  attendanceController.checkOut
);

// GET /api/attendance/current
router.get(
  '/current',
  requireAnyPermission(PERMISSIONS.ATTENDANCE_CREATE, PERMISSIONS.ATTENDANCE_READ_OWN, 'attendance:read', 'attendance:create'),
  attendanceController.getCurrentSession
);

// GET /api/attendance/history or GET /api/attendance
router.get(
  '/history',
  requireAnyPermission(PERMISSIONS.ATTENDANCE_READ, PERMISSIONS.ATTENDANCE_READ_OWN, 'attendance:read'),
  attendanceController.getAttendanceHistory
);

router.get(
  '/',
  requireAnyPermission(PERMISSIONS.ATTENDANCE_READ, PERMISSIONS.ATTENDANCE_READ_OWN, 'attendance:read'),
  attendanceController.getAttendanceHistory
);

// GET /api/attendance/employee/:employeeId
router.get(
  '/employee/:employeeId',
  requireAnyPermission(PERMISSIONS.ATTENDANCE_READ, PERMISSIONS.ATTENDANCE_READ_OWN, 'attendance:read'),
  attendanceController.getEmployeeAttendance
);

// Regularization routes
router.post(
  '/regularization',
  requireAnyPermission(PERMISSIONS.ATTENDANCE_CREATE, PERMISSIONS.ATTENDANCE_READ_OWN, 'attendance:create'),
  validate(createRegularizationSchema),
  attendanceController.createRegularizationRequest
);

router.get(
  '/regularization',
  requireAnyPermission(PERMISSIONS.ATTENDANCE_READ, PERMISSIONS.ATTENDANCE_READ_OWN, 'attendance:read'),
  attendanceController.listRegularizationRequests
);

router.post(
  '/regularization/:id/approve',
  requireAnyPermission(PERMISSIONS.ATTENDANCE_APPROVE, 'attendance:approve', 'admin:all'),
  attendanceController.approveRegularization
);

router.post(
  '/regularization/:id/reject',
  requireAnyPermission(PERMISSIONS.ATTENDANCE_APPROVE, 'attendance:approve', 'admin:all'),
  validate(actionRegularizationSchema),
  attendanceController.rejectRegularization
);

// Overtime records
router.get(
  '/overtime',
  requireAnyPermission(PERMISSIONS.ATTENDANCE_READ, PERMISSIONS.ATTENDANCE_READ_OWN, 'attendance:read'),
  attendanceController.getOvertimeRecords
);

module.exports = router;
