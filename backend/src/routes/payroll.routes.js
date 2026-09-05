/**
 * Payroll Routes
 * ──────────────
 * Salary Structures and Salary Rules endpoints.
 *
 * RBAC:
 *   GET  endpoints: salary_structure:read (payroll manager, payroll user, admin)
 *   POST/PATCH/DELETE: salary_structure:manage (payroll manager, admin only)
 *   Similarly for salary_rule:read vs salary_rule:manage
 */

'use strict';

const { Router } = require('express');
const { requireAuth }       = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { PERMISSIONS }       = require('../config/rbacConstants');
const ctrl = require('../controllers/salaryStructure.controller');

const router = Router();

// All payroll routes require authentication
router.use(requireAuth());

// ── Salary Structures ─────────────────────────────────────────────────────────
router
  .route('/salary-structures')
  .get(requirePermission(PERMISSIONS.SALARY_STRUCTURE_READ), ctrl.listStructures)
  .post(requirePermission(PERMISSIONS.SALARY_STRUCTURE_MANAGE), ctrl.createStructure);

router
  .route('/salary-structures/:id')
  .get(requirePermission(PERMISSIONS.SALARY_STRUCTURE_READ), ctrl.getStructure)
  .patch(requirePermission(PERMISSIONS.SALARY_STRUCTURE_MANAGE), ctrl.updateStructure)
  .delete(requirePermission(PERMISSIONS.SALARY_STRUCTURE_MANAGE), ctrl.deleteStructure);

// ── Salary Rules ──────────────────────────────────────────────────────────────
router
  .route('/salary-rules')
  .get(requirePermission(PERMISSIONS.SALARY_RULE_READ), ctrl.listRules)
  .post(requirePermission(PERMISSIONS.SALARY_RULE_MANAGE), ctrl.createRule);

router
  .route('/salary-rules/:id')
  .get(requirePermission(PERMISSIONS.SALARY_RULE_READ), ctrl.getRule)
  .patch(requirePermission(PERMISSIONS.SALARY_RULE_MANAGE), ctrl.updateRule)
  .delete(requirePermission(PERMISSIONS.SALARY_RULE_MANAGE), ctrl.deleteRule);

module.exports = router;
