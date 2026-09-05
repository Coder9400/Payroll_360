'use strict';

const { Router } = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { PERMISSIONS } = require('../config/rbacConstants');
const ctrl = require('../controllers/settings.controller');

const router = Router();

router.use(requireAuth());

router
  .route('/')
  .get(ctrl.getSettings)
  .patch(requirePermission(PERMISSIONS.ADMIN_SETTINGS_MANAGE), ctrl.updateSettings);

module.exports = router;
