const { Router } = require('express');
const config = require('../config/env');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const testRbacRoutes = require('./testRbac.routes');

// HR Master Data Routes (Phase 1)
const departmentRoutes = require('./department.routes');
const jobPositionRoutes = require('./jobPosition.routes');
const employeeRoutes = require('./employee.routes');
const scheduleRoutes = require('./schedule.routes');
const contractRoutes = require('./contract.routes');
const timeOffTypeRoutes = require('./timeOffType.routes');
const userRoutes = require('./user.routes');
const dashboardRoutes = require('./dashboard.routes');

// Operational HR Routes (Phase 2)
const attendanceRoutes = require('./attendance.routes');
const timeOffRoutes = require('./timeOff.routes');

// Payroll Routes (Phase 4+5)
const payrollRoutes = require('./payroll.routes');
const payrunRoutes  = require('./payrun.routes');
const payslipRoutes = require('./payslip.routes');
const settingsRoutes = require('./settings.routes');
const aiRoutes = require('./ai.routes');

const router = Router();

// Core & Foundation routes
router.use('/health', healthRoutes);

// Authentication & Identity routes
router.use('/auth', authRoutes);

// RBAC & Permission Verification routes (Enabled in non-production environments)
if (!config.isProduction && process.env.NODE_ENV !== 'production') {
  router.use('/test', testRbacRoutes);
}

// Phase 1: HR Master Data Modules
router.use('/departments', departmentRoutes);
router.use('/job-positions', jobPositionRoutes);
router.use('/employees', employeeRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/contracts', contractRoutes);
router.use('/time-off-types', timeOffTypeRoutes);

// User Provisioning Routes (Admin)
router.use('/users', userRoutes);

// Dashboard Routes
router.use('/dashboard', dashboardRoutes);

// Phase 2: Operational HR Modules
router.use('/attendance', attendanceRoutes);
router.use('/time-off', timeOffRoutes);

// Phase 4+5: Payroll Modules
router.use('/payroll', payrollRoutes);
router.use('/payruns', payrunRoutes);
router.use('/payslips', payslipRoutes);

// Company settings
router.use('/settings', settingsRoutes);

// AI features
router.use('/ai', aiRoutes);

module.exports = router;
