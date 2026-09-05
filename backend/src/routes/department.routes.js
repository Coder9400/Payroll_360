/**
 * Department Routes
 *
 * GET  /api/departments          - List departments (HR Manager, HR Payroll Manager, Admin)
 * POST /api/departments          - Create department (HR Manager, HR Payroll Manager, Admin)
 * PUT  /api/departments/:id      - Update department (HR Manager, HR Payroll Manager, Admin)
 */

const { Router } = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { PERMISSIONS } = require('../config/rbacConstants');
const {
  listDepartments,
  createDepartment,
  updateDepartment,
} = require('../controllers/department.controller');

const router = Router();

// All department routes require authentication
router.use(requireAuth());

/**
 * @route   GET /api/departments
 * @desc    List all active departments
 * @access  Any authenticated user with employee:read
 */
router.get('/', requirePermission(PERMISSIONS.EMPLOYEE_READ), listDepartments);

/**
 * @route   POST /api/departments
 * @desc    Create a new department
 * @access  HR Manager, HR Payroll Manager, Admin (employee:create)
 */
router.post('/', requirePermission(PERMISSIONS.EMPLOYEE_CREATE), createDepartment);

/**
 * @route   PUT /api/departments/:id
 * @desc    Update an existing department
 * @access  HR Manager, HR Payroll Manager, Admin (employee:update)
 */
router.put('/:id', requirePermission(PERMISSIONS.EMPLOYEE_UPDATE), updateDepartment);

module.exports = router;
