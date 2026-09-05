/**
 * Payslip Routes
 * ──────────────
 * Payslip access — read-only for employees (own only), full access for payroll roles.
 */

'use strict';

const { Router } = require('express');
const { requireAuth }       = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { PERMISSIONS }       = require('../config/rbacConstants');
const ctrl = require('../controllers/payrun.controller');

const router = Router();

router.use(requireAuth());

// Employee self-service — view own payslips
router.get(
  '/me',
  requirePermission(PERMISSIONS.PAYSLIP_READ_OWN),
  ctrl.getMyPayslips
);

// HR/Payroll — list all payslips (with optional filters)
router.get(
  '/',
  requirePermission(PERMISSIONS.PAYSLIP_READ_ALL),
  ctrl.listPayslips
);

// Individual payslip — RBAC enforced inside service
router.get(
  '/:id',
  requirePermission(PERMISSIONS.PAYSLIP_READ_OWN), // minimum; service checks ownership
  ctrl.getPayslip
);

module.exports = router;
