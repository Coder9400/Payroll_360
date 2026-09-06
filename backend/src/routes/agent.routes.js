'use strict';

const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agent.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth());

// Start agent
router.post('/run-payroll', agentController.runPayroll);

// Poll status
router.get('/status/:jobId', agentController.getStatus);

// Approve proposal -> creates real payrun
router.post('/approve/:jobId', agentController.approve);

// Reject proposal
router.post('/reject/:jobId', agentController.reject);

module.exports = router;
