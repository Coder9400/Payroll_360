const express = require('express');
const router = express.Router();
const validate = require('../middleware/validate.middleware');
const { createWorkingScheduleSchema } = require('../validators/hr.validator');
const scheduleController = require('../controllers/schedule.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');

router.use(requireAuth());

router.post('/', requirePermission('create:hr_master'), validate(createWorkingScheduleSchema), scheduleController.createSchedule);
router.get('/', requirePermission('read:hr_master'), scheduleController.getSchedules);
router.get('/:id', requirePermission('read:hr_master'), scheduleController.getScheduleById);

module.exports = router;
