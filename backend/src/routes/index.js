const { Router } = require('express');
const config = require('../config/env');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const departmentRoutes = require('./department.routes');
const positionRoutes = require('./position.routes');
const employeeRoutes = require('./employee.routes');
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

// RBAC & Permission Verification routes (Enabled in non-production environments only)
if (!config.isProduction && process.env.NODE_ENV !== 'production') {
  router.use('/test', testRbacRoutes);
}

// Future HR & Payroll Business modules will be registered here cleanly:
// router.use('/attendance', attendanceRoutes);
// router.use('/leaves', leaveRoutes);
// router.use('/contracts', contractRoutes);
// router.use('/payroll', payrollRoutes);
// router.use('/payslips', payslipRoutes);
// router.use('/salary-structures', salaryStructureRoutes);
// router.use('/salary-rules', salaryRuleRoutes);

module.exports = router;
