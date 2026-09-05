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

// Operational HR Routes (Phase 2)
const attendanceRoutes = require('./attendance.routes');
const timeOffRoutes = require('./timeOff.routes');

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

// Phase 2: Operational HR Modules
router.use('/attendance', attendanceRoutes);
router.use('/time-off', timeOffRoutes);

// Future Payroll Modules (Phase 3+)
// router.use('/payroll', payrollRoutes);
// router.use('/payslips', payslipRoutes);
// router.use('/salary-structures', salaryStructureRoutes);

module.exports = router;
