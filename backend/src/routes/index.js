const { Router } = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const testRbacRoutes = require('./testRbac.routes');

const router = Router();

// Core & Foundation routes
router.use('/health', healthRoutes);

// Authentication & Identity routes
router.use('/auth', authRoutes);

// RBAC & Permission Verification routes
router.use('/test', testRbacRoutes);

// Future HR & Payroll Business modules will be registered here cleanly:
// router.use('/employees', employeeRoutes);
// router.use('/attendance', attendanceRoutes);
// router.use('/leaves', leaveRoutes);
// router.use('/contracts', contractRoutes);
// router.use('/payroll', payrollRoutes);
// router.use('/payslips', payslipRoutes);
// router.use('/salary-structures', salaryStructureRoutes);
// router.use('/salary-rules', salaryRuleRoutes);

module.exports = router;
