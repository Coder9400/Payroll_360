/**
 * Payrun Routes
 * ─────────────
 * Payruns lifecycle + Payslip access.
 *
 * RBAC:
 *   Payruns (create/compute/validate/markPaid): payroll:process (payroll manager, payroll user, admin)
 *   Payslips (read all): payslip:read_all
 *   Payslips (read own): payslip:read_own
 */

'use strict';

const { Router } = require('express');
const { requireAuth }       = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { PERMISSIONS }       = require('../config/rbacConstants');
const ctrl = require('../controllers/payrun.controller');

const router = Router();

router.use(requireAuth());

// ── Payruns ───────────────────────────────────────────────────────────────────
router
  .route('/')
  .get(requirePermission(PERMISSIONS.PAYROLL_READ), ctrl.listPayruns)
  .post(requirePermission(PERMISSIONS.PAYROLL_PROCESS), ctrl.createPayrun);

router
  .route('/:id')
  .get(requirePermission(PERMISSIONS.PAYROLL_READ), ctrl.getPayrun);

router.get(
  '/:id/eligible-employees',
  requirePermission(PERMISSIONS.PAYROLL_PROCESS),
  ctrl.getEligibleEmployees
);

router.post(
  '/:id/compute',
  requirePermission(PERMISSIONS.PAYROLL_PROCESS),
  ctrl.computePayrun
);

router.post(
  '/:id/validate',
  requirePermission(PERMISSIONS.PAYROLL_APPROVE),
  ctrl.validatePayrun
);

router.post(
  '/:id/mark-paid',
  requirePermission(PERMISSIONS.PAYROLL_LOCK),
  ctrl.markAsPaid
);

module.exports = router;
