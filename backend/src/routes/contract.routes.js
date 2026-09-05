const express = require('express');
const router = express.Router();
const validate = require('../middleware/validate.middleware');
const { createContractSchema, updateContractSchema } = require('../validators/hr.validator');
const contractController = require('../controllers/contract.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');

router.use(requireAuth());

router.post('/', requirePermission('create:contracts'), validate(createContractSchema), contractController.createContract);
router.get('/', requirePermission('read:contracts'), contractController.getContracts);
router.get('/:id', requirePermission('read:contracts'), contractController.getContractById);
router.patch('/:id', requirePermission('update:contracts'), validate(updateContractSchema), contractController.updateContract);
router.get('/applicable/:employeeId/:date', requirePermission('read:contracts'), contractController.getApplicableContract);

module.exports = router;
