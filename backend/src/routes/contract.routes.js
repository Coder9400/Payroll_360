const express = require('express');
const router = express.Router();
const validate = require('../middleware/validate.middleware');
const { createContractSchema, updateContractSchema } = require('../validators/hr.validator');
const contractController = require('../controllers/contract.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { PERMISSIONS } = require('../config/rbacConstants');

router.use(requireAuth());

router.post('/', requirePermission(PERMISSIONS.CONTRACT_CREATE), validate(createContractSchema), contractController.createContract);
router.get('/', requirePermission(PERMISSIONS.CONTRACT_READ), contractController.getContracts);
router.get('/:id', requirePermission(PERMISSIONS.CONTRACT_READ), contractController.getContractById);
router.patch('/:id', requirePermission(PERMISSIONS.CONTRACT_UPDATE), validate(updateContractSchema), contractController.updateContract);
router.get('/applicable/:employeeId/:date', requirePermission(PERMISSIONS.CONTRACT_READ), contractController.getApplicableContract);

module.exports = router;
