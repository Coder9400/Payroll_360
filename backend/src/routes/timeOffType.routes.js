const express = require('express');
const router = express.Router();
const validate = require('../middleware/validate.middleware');
const { createTimeOffTypeSchema, updateTimeOffTypeSchema } = require('../validators/hr.validator');
const timeOffTypeController = require('../controllers/timeOffType.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');

router.use(requireAuth());

router.post('/', requirePermission('create:hr_master'), validate(createTimeOffTypeSchema), timeOffTypeController.createTimeOffType);
router.get('/', requirePermission('read:hr_master'), timeOffTypeController.getTimeOffTypes);
router.get('/:id', requirePermission('read:hr_master'), timeOffTypeController.getTimeOffTypeById);

module.exports = router;
