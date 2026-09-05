const { Router } = require('express');
const config = require('../config/env');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const testRbacRoutes = require('./testRbac.routes');

// HR Master Data Routes
const departmentRoutes = require('./department.routes');
const jobPositionRoutes = require('./jobPosition.routes');
const employeeRoutes = require('./employee.routes');
const scheduleRoutes = require('./schedule.routes');
const contractRoutes = require('./contract.routes');
const timeOffTypeRoutes = require('./timeOffType.routes');

const router = Router();

// Core & Foundation routes
router.use('/health', healthRoutes);

// Authentication & Identity routes
router.use('/auth', authRoutes);

// RBAC & Permission Verification routes (Enabled in non-production environments)
if (!config.isProduction && process.env.NODE_ENV !== 'production') {
  router.use('/test', testRbacRoutes);
}

// HR Master Data Modules
router.use('/departments', departmentRoutes);
router.use('/job-positions', jobPositionRoutes);
router.use('/employees', employeeRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/contracts', contractRoutes);
router.use('/time-off-types', timeOffTypeRoutes);

// Future Payroll Modules
// router.use('/payroll', payrollRoutes);
// router.use('/payslips', payslipRoutes);
// router.use('/salary-structures', salaryStructureRoutes);

module.exports = router;

