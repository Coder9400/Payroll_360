/**
 * Employee Routes
 *
 * GET    /api/employees              - List employees
 * GET    /api/employees/:id          - Get single employee
 * POST   /api/employees              - Create employee
 * PUT    /api/employees/:id          - Full employee update
 * PATCH  /api/employees/:id/status   - Update employment status only
 *
 * Sub-routes:
 * GET    /api/employees/:id/contracts            - Contract history
 * GET    /api/employees/:id/applicable-contract  - Applicable contract for payroll
 * GET    /api/employees/:id/schedule             - Active working schedule
 * GET    /api/employees/:id/attendance           - Employee attendance history
 */

const { Router } = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { requirePermission, requireAnyPermission } = require('../middleware/rbac.middleware');
const { PERMISSIONS } = require('../config/rbacConstants');
const {
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  patchEmployeeStatus,
} = require('../controllers/employee.controller');
const contractController = require('../controllers/contract.controller');
const scheduleController = require('../controllers/schedule.controller');
const attendanceController = require('../controllers/attendance.controller');

const router = Router();

router.use(requireAuth());

/**
 * @route   GET /api/employees
 * @desc    List employees. Query: ?departmentId=&positionId=&status=&includeInactive=
 * @access  employee:read
 */
router.get('/', requirePermission(PERMISSIONS.EMPLOYEE_READ), listEmployees);

/**
 * @route   GET /api/employees/:id
 * @desc    Get a single employee by ID
 * @access  employee:read, employee:read_own
 */
router.get('/:id', requireAnyPermission(PERMISSIONS.EMPLOYEE_READ, PERMISSIONS.EMPLOYEE_READ_OWN), getEmployee);

/**
 * @route   POST /api/employees
 * @desc    Create a new employee record
 * @access  employee:create (HR Manager, HR Payroll Manager, Admin)
 */
router.post('/', requirePermission(PERMISSIONS.EMPLOYEE_CREATE), createEmployee);

/**
 * @route   PUT /api/employees/:id
 * @desc    Update employee personal/org details
 * @access  employee:update (HR Manager, HR Payroll Manager, Admin)
 */
router.put('/:id', requirePermission(PERMISSIONS.EMPLOYEE_UPDATE), updateEmployee);

/**
 * @route   PATCH /api/employees/:id/status
 * @desc    Change employment status: active | inactive | on_leave | terminated | probation
 * @access  employee:update (HR Manager, HR Payroll Manager, Admin)
 */
router.patch('/:id/status', requirePermission(PERMISSIONS.EMPLOYEE_UPDATE), patchEmployeeStatus);

// Phase 4: Employee Contract & Schedule sub-routes
router.get('/:id/contracts', requireAnyPermission(PERMISSIONS.CONTRACT_READ, PERMISSIONS.CONTRACT_READ_OWN, 'read:contracts'), contractController.getEmployeeContractHistory);
router.get('/:id/applicable-contract', requireAnyPermission(PERMISSIONS.CONTRACT_READ, PERMISSIONS.CONTRACT_READ_OWN, 'read:contracts'), contractController.getApplicableContract);
router.get('/:id/schedule', requireAnyPermission(PERMISSIONS.EMPLOYEE_READ, PERMISSIONS.EMPLOYEE_READ_OWN, 'read:hr_master'), scheduleController.getEmployeeSchedule);

// Phase 5: Employee Attendance sub-route
router.get('/:id/attendance', requireAnyPermission(PERMISSIONS.ATTENDANCE_READ, PERMISSIONS.ATTENDANCE_READ_OWN, 'attendance:read'), attendanceController.getEmployeeAttendance);

module.exports = router;
