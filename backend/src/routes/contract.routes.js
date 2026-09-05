const express = require('express');
const router = express.Router();
const validate = require('../middleware/validate.middleware');
const { createContractSchema, updateContractSchema } = require('../validators/hr.validator');
const contractController = require('../controllers/contract.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAnyPermission } = require('../middleware/rbac.middleware');
const { PERMISSIONS } = require('../config/rbacConstants');

router.use(requireAuth());

// POST /api/contracts
router.post(
  '/',
  requireAnyPermission(PERMISSIONS.CONTRACT_CREATE, 'create:contracts'),
  validate(createContractSchema),
  contractController.createContract
);

// GET /api/contracts
router.get(
  '/',
  requireAnyPermission(PERMISSIONS.CONTRACT_READ, 'read:contracts'),
  contractController.getContracts
);

// GET /api/contracts/applicable/:employeeId
router.get(
  '/applicable/:employeeId',
  requireAnyPermission(PERMISSIONS.CONTRACT_READ, PERMISSIONS.CONTRACT_READ_OWN, 'read:contracts'),
  contractController.getApplicableContract
);

// GET /api/contracts/applicable/:employeeId/:date
router.get(
  '/applicable/:employeeId/:date',
  requireAnyPermission(PERMISSIONS.CONTRACT_READ, PERMISSIONS.CONTRACT_READ_OWN, 'read:contracts'),
  contractController.getApplicableContract
);

// GET /api/contracts/employee/:employeeId
router.get(
  '/employee/:employeeId',
  requireAnyPermission(PERMISSIONS.CONTRACT_READ, PERMISSIONS.CONTRACT_READ_OWN, 'read:contracts'),
  contractController.getEmployeeContractHistory
);

// GET /api/contracts/:id
router.get(
  '/:id',
  requireAnyPermission(PERMISSIONS.CONTRACT_READ, PERMISSIONS.CONTRACT_READ_OWN, 'read:contracts'),
  contractController.getContractById
);

// PUT /api/contracts/:id
router.put(
  '/:id',
  requireAnyPermission(PERMISSIONS.CONTRACT_UPDATE, 'create:contracts', 'update:contracts'),
  validate(updateContractSchema),
  contractController.updateContract
);

module.exports = router;

