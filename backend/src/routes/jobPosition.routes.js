const express = require('express');
const router = express.Router();
const validate = require('../middleware/validate.middleware');
const { createJobPositionSchema, updateJobPositionSchema } = require('../validators/hr.validator');
const jobPositionController = require('../controllers/jobPosition.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');

router.use(requireAuth());

router.post('/', requirePermission('create:hr_master'), validate(createJobPositionSchema), jobPositionController.createJobPosition);
router.get('/', requirePermission('read:hr_master'), jobPositionController.getJobPositions);
router.get('/:id', requirePermission('read:hr_master'), jobPositionController.getJobPositionById);
router.put('/:id', requirePermission('update:hr_master'), validate(updateJobPositionSchema), jobPositionController.updateJobPosition);
router.delete('/:id', requirePermission('delete:hr_master'), jobPositionController.deleteJobPosition);

module.exports = router;
