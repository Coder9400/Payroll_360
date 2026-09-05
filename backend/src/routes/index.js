const { Router } = require('express');
const config = require('../config/env');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const testRbacRoutes = require('./testRbac.routes');

const router = Router();

// Core & Foundation routes
router.use('/health', healthRoutes);

// Authentication & Identity routes
router.use('/auth', authRoutes);

// RBAC & Permission Verification routes (Enabled in non-production environments)
if (!config.isProduction && process.env.NODE_ENV !== 'production') {
  router.use('/test', testRbacRoutes);
}

module.exports = router;
