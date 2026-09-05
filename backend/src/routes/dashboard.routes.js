const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth());

router.get('/stats', dashboardController.getStats);

module.exports = router;
