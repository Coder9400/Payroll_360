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
router.post('/', requirePermission(PERMISSIONS.EMPLOYEE_CREATE), validate(createEmployeeSchema), employeeController.createEmployee);
router.get('/', requirePermission(PERMISSIONS.EMPLOYEE_READ), employeeController.getEmployees);
router.get('/:id', requirePermission(PERMISSIONS.EMPLOYEE_READ, PERMISSIONS.EMPLOYEE_READ_OWN), employeeController.getEmployeeById);
router.put('/:id', requirePermission(PERMISSIONS.EMPLOYEE_UPDATE), validate(updateEmployeeSchema), employeeController.updateEmployee);

// Employee Progress Stats
router.get('/:id/progress', requirePermission(PERMISSIONS.ATTENDANCE_READ_OWN), employeeController.getProgressStats);

// Account Provisioning
router.post('/:id/provision-account', requirePermission(PERMISSIONS.EMPLOYEE_CREATE, PERMISSIONS.ADMIN_USERS_MANAGE), employeeController.provisionAccount);
router.post('/:id/disable-account', requirePermission(PERMISSIONS.EMPLOYEE_UPDATE, PERMISSIONS.ADMIN_USERS_MANAGE), employeeController.disableAccount);

// Phase 2: Employee attendance sub-routes
router.get('/:id/attendance', requirePermission(PERMISSIONS.ATTENDANCE_READ_OWN), attendanceController.getEmployeeAttendance);

// Phase 2: Employee time off sub-routes
router.get('/:id/time-off/balances', requirePermission(PERMISSIONS.LEAVE_READ_OWN), timeOffController.getEmployeeBalances);
router.get('/:id/time-off/approval-candidates', requirePermission(PERMISSIONS.LEAVE_READ_OWN), timeOffController.getApprovalCandidates);
router.get('/:id/time-off', requirePermission(PERMISSIONS.LEAVE_READ_OWN), timeOffController.getEmployeeRequests);

module.exports = router;
