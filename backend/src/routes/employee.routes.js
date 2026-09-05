/**
 * Employee Routes
 *
 * GET    /api/employees              - List employees
 * GET    /api/employees/:id          - Get single employee
 * POST   /api/employees              - Create employee
 * PUT    /api/employees/:id          - Full employee update
 * PATCH  /api/employees/:id/status   - Update employment status only
 */

const { Router } = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { PERMISSIONS } = require('../config/rbacConstants');
const {
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  patchEmployeeStatus,
} = require('../controllers/employee.controller');

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
 * @access  employee:read
 */
router.get('/:id', requirePermission(PERMISSIONS.EMPLOYEE_READ), getEmployee);

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

module.exports = router;
