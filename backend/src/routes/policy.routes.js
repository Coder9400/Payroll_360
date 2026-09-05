const express = require('express');
const router = express.Router();
const policyController = require('../controllers/policy.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { PERMISSIONS } = require('../config/rbacConstants');

router.use(requireAuth());

// Anyone can read policies
router.get('/', policyController.getPolicies);
router.get('/:id', policyController.getPolicyById);

// Acknowledge policy (Only employees)
router.post('/:id/acknowledge', policyController.acknowledgePolicy);

module.exports = router;
