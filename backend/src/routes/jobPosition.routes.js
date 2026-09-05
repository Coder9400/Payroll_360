const express = require('express');
const router = express.Router();
const validate = require('../middleware/validate.middleware');
const { createJobPositionSchema, updateJobPositionSchema } = require('../validators/hr.validator');
const jobPositionController = require('../controllers/jobPosition.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { ROLES } = require('../config/rbacConstants');

router.use(requireAuth());

router.post('/', requireRole(ROLES.ADMIN, ROLES.HR_MANAGER), validate(createJobPositionSchema), jobPositionController.createJobPosition);
router.get('/', jobPositionController.getJobPositions);
router.get('/:id', jobPositionController.getJobPositionById);
router.put('/:id', requireRole(ROLES.ADMIN, ROLES.HR_MANAGER), validate(updateJobPositionSchema), jobPositionController.updateJobPosition);
router.delete('/:id', requireRole(ROLES.ADMIN, ROLES.HR_MANAGER), jobPositionController.deleteJobPosition);

module.exports = router;
