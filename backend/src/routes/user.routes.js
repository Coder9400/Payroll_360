const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { PERMISSIONS } = require('../config/rbacConstants');

router.use(requireAuth());

// HR Provisioning (Admin only)
router.post('/hr', requirePermission(PERMISSIONS.ADMIN_USERS_MANAGE), userController.createHrUser);

module.exports = router;
