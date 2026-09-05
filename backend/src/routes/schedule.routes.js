const express = require('express');
const router = express.Router();
const validate = require('../middleware/validate.middleware');
const { createWorkingScheduleSchema, updateWorkingScheduleSchema, assignScheduleSchema } = require('../validators/hr.validator');
const scheduleController = require('../controllers/schedule.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAnyPermission } = require('../middleware/rbac.middleware');
const { PERMISSIONS } = require('../config/rbacConstants');

router.use(requireAuth());

// POST /api/schedules
router.post(
  '/',
  requireAnyPermission('create:hr_master', 'hr_master:create', PERMISSIONS.EMPLOYEE_CREATE, 'admin:all'),
  validate(createWorkingScheduleSchema),
  scheduleController.createSchedule
);

// GET /api/schedules
router.get(
  '/',
  requireAnyPermission('read:hr_master', 'hr_master:read', PERMISSIONS.EMPLOYEE_READ, 'admin:all'),
  scheduleController.getSchedules
);

// POST /api/schedules/assign
router.post(
  '/assign',
  requireAnyPermission('create:hr_master', 'hr_master:create', PERMISSIONS.EMPLOYEE_UPDATE, 'admin:all'),
  validate(assignScheduleSchema),
  scheduleController.assignSchedule
);

// GET /api/schedules/employee/:employeeId
router.get(
  '/employee/:employeeId',
  requireAnyPermission('read:hr_master', 'hr_master:read', PERMISSIONS.EMPLOYEE_READ, PERMISSIONS.EMPLOYEE_READ_OWN),
  scheduleController.getEmployeeSchedule
);

// GET /api/schedules/:id
router.get(
  '/:id',
  requireAnyPermission('read:hr_master', 'hr_master:read', PERMISSIONS.EMPLOYEE_READ, 'admin:all'),
  scheduleController.getScheduleById
);

// PUT /api/schedules/:id
router.put(
  '/:id',
  requireAnyPermission('create:hr_master', 'update:hr_master', PERMISSIONS.EMPLOYEE_UPDATE, 'admin:all'),
  validate(updateWorkingScheduleSchema),
  scheduleController.updateSchedule
);

module.exports = router;

