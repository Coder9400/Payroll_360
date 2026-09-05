const express = require('express');
const router = express.Router();
const validate = require('../middleware/validate.middleware');
const { createEmployeeSchema, updateEmployeeSchema } = require('../validators/hr.validator');
const employeeController = require('../controllers/employee.controller');
const attendanceController = require('../controllers/attendance.controller');
const timeOffController = require('../controllers/timeOff.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { PERMISSIONS } = require('../config/rbacConstants');

router.use(requireAuth());

// Phase 1: Employee CRUD
router.post('/', requirePermission('create:employees'), validate(createEmployeeSchema), employeeController.createEmployee);
router.get('/', requirePermission('read:employees'), employeeController.getEmployees);
router.get('/:id', requirePermission('read:employees'), employeeController.getEmployeeById);
router.put('/:id', requirePermission('update:employees'), validate(updateEmployeeSchema), employeeController.updateEmployee);

// Phase 2: Employee attendance sub-routes
router.get('/:id/attendance', requirePermission(PERMISSIONS.ATTENDANCE_READ_OWN), attendanceController.getEmployeeAttendance);

// Phase 2: Employee time off sub-routes
router.get('/:id/time-off/balances', requirePermission(PERMISSIONS.LEAVE_READ_OWN), timeOffController.getEmployeeBalances);
router.get('/:id/time-off', requirePermission(PERMISSIONS.LEAVE_READ_OWN), timeOffController.getEmployeeRequests);

module.exports = router;
