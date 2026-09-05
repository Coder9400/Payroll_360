const express = require('express');
const router = express.Router();
const validate = require('../middleware/validate.middleware');
const { createTimeOffTypeSchema, updateTimeOffTypeSchema } = require('../validators/hr.validator');
const timeOffTypeController = require('../controllers/timeOffType.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { ROLES } = require('../config/rbacConstants');

router.use(requireAuth());

router.post('/', requireRole(ROLES.ADMIN, ROLES.HR_MANAGER), validate(createTimeOffTypeSchema), timeOffTypeController.createTimeOffType);
router.get('/', timeOffTypeController.getTimeOffTypes);
router.get('/:id', timeOffTypeController.getTimeOffTypeById);

module.exports = router;
