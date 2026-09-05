/**
 * Position Routes
 *
 * GET  /api/positions             - List positions (any authenticated user with employee:read)
 * POST /api/positions             - Create position (HR Manager, HR Payroll Manager, Admin)
 * PUT  /api/positions/:id         - Update position (HR Manager, HR Payroll Manager, Admin)
 */

const { Router } = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { PERMISSIONS } = require('../config/rbacConstants');
const {
  listPositions,
  createPosition,
  updatePosition,
} = require('../controllers/position.controller');

const router = Router();

router.use(requireAuth());

/**
 * @route   GET /api/positions
 * @desc    List all active positions, optionally filtered by ?departmentId=<uuid>
 * @access  Any authenticated user with employee:read
 */
router.get('/', requirePermission(PERMISSIONS.EMPLOYEE_READ), listPositions);

/**
 * @route   POST /api/positions
 * @desc    Create a new position
 * @access  HR Manager, HR Payroll Manager, Admin (employee:create)
 */
router.post('/', requirePermission(PERMISSIONS.EMPLOYEE_CREATE), createPosition);

/**
 * @route   PUT /api/positions/:id
 * @desc    Update an existing position
 * @access  HR Manager, HR Payroll Manager, Admin (employee:update)
 */
router.put('/:id', requirePermission(PERMISSIONS.EMPLOYEE_UPDATE), updatePosition);

module.exports = router;
