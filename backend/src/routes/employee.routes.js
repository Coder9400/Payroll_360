const express = require('express');
const router = express.Router();
const validate = require('../middleware/validate.middleware');
const { createEmployeeSchema, updateEmployeeSchema } = require('../validators/hr.validator');
const employeeController = require('../controllers/employee.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');

router.use(requireAuth());

router.post('/', requirePermission('create:employees'), validate(createEmployeeSchema), employeeController.createEmployee);
router.get('/', requirePermission('read:employees'), employeeController.getEmployees);
router.get('/:id', requirePermission('read:employees'), employeeController.getEmployeeById);
router.put('/:id', requirePermission('update:employees'), validate(updateEmployeeSchema), employeeController.updateEmployee);

module.exports = router;
