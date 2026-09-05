const express = require('express');
const router = express.Router();
const validate = require('../middleware/validate.middleware');
const { createWorkingScheduleSchema } = require('../validators/hr.validator');
const scheduleController = require('../controllers/schedule.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { ROLES } = require('../config/rbacConstants');

router.use(requireAuth());

router.post('/', requireRole(ROLES.ADMIN, ROLES.HR_MANAGER), validate(createWorkingScheduleSchema), scheduleController.createSchedule);
router.get('/', scheduleController.getSchedules);
router.get('/:id', scheduleController.getScheduleById);

module.exports = router;
