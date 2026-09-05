const { Router } = require('express');
const config = require('../config/env');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const departmentRoutes = require('./department.routes');
const positionRoutes = require('./position.routes');
const employeeRoutes = require('./employee.routes');
const contractRoutes = require('./contract.routes');
const scheduleRoutes = require('./schedule.routes');
const attendanceRoutes = require('./attendance.routes');
const testRbacRoutes = require('./testRbac.routes');

const router = Router();

// Core & Foundation routes
router.use('/health', healthRoutes);

// Authentication & Identity routes
router.use('/auth', authRoutes);

// Phase 3: Employee & Organization Management
router.use('/departments', departmentRoutes);
router.use('/positions', positionRoutes);
router.use('/employees', employeeRoutes);

// Phase 4: Contracts & Working Schedules
router.use('/contracts', contractRoutes);
router.use('/schedules', scheduleRoutes);

// Phase 5: Attendance, Regularization & Overtime
router.use('/attendance', attendanceRoutes);

// RBAC & Permission Verification routes (Enabled in non-production environments only)
if (!config.isProduction && process.env.NODE_ENV !== 'production') {
  router.use('/test', testRbacRoutes);
}

module.exports = router;
