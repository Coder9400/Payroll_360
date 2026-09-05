const { Router } = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');
const { sendSuccess } = require('../utils/apiResponse');
const { ROLES, PERMISSIONS } = require('../config/rbacConstants');

const router = Router();

// Public route (no auth required)
router.get('/public', (req, res) => {
  return sendSuccess(res, {
    data: { access: 'public', timestamp: new Date().toISOString() },
    message: 'Public resource accessed successfully',
  });
});

// Any authenticated user
router.get('/authenticated', requireAuth(), (req, res) => {
  return sendSuccess(res, {
    data: {
      userId: req.user.id,
      email: req.user.email,
      roles: req.user.roles,
    },
    message: 'Authenticated resource accessed successfully',
  });
});

// Employee self-service test route (Employee, Admin)
router.get('/employee-only', requireAuth(), requireRole(ROLES.EMPLOYEE), (req, res) => {
  return sendSuccess(res, {
    data: { role: 'employee', access: 'granted' },
    message: 'Employee portal endpoint accessed',
  });
});

// HR Management test route (HR Manager, HR Payroll Manager, Admin)
router.get('/hr-access', requireAuth(), requirePermission(PERMISSIONS.EMPLOYEE_READ), (req, res) => {
  return sendSuccess(res, {
    data: { module: 'hr', access: 'granted' },
    message: 'HR resource accessed successfully',
  });
});

// Payroll management access (HR Payroll User, HR Payroll Manager, Admin)
router.get('/payroll-access', requireAuth(), requirePermission(PERMISSIONS.PAYROLL_READ), (req, res) => {
  return sendSuccess(res, {
    data: { module: 'payroll', access: 'granted' },
    message: 'Payroll management resource accessed successfully',
  });
});

// Payroll processing (HR Payroll User, HR Payroll Manager, Admin)
router.get('/payroll-process', requireAuth(), requirePermission(PERMISSIONS.PAYROLL_PROCESS), (req, res) => {
  return sendSuccess(res, {
    data: { module: 'payroll', action: 'process', access: 'granted' },
    message: 'Payroll calculation run permitted',
  });
});

// Salary structure management (HR Payroll Manager, Admin) - HR Payroll User and HR Manager CANNOT access
router.get(
  '/salary-structure-manage',
  requireAuth(),
  requirePermission(PERMISSIONS.SALARY_STRUCTURE_MANAGE),
  (req, res) => {
    return sendSuccess(res, {
      data: { module: 'salary_structure', action: 'manage', access: 'granted' },
      message: 'Salary structure management permitted',
    });
  }
);

// Admin-only route
router.get('/admin-only', requireAuth(), requireRole(ROLES.ADMIN), (req, res) => {
  return sendSuccess(res, {
    data: { role: 'admin', access: 'granted' },
    message: 'Admin console access granted',
  });
});

module.exports = router;
