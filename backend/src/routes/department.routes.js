const express = require('express');
const router = express.Router();
const validate = require('../middleware/validate.middleware');
const { createDepartmentSchema, updateDepartmentSchema } = require('../validators/hr.validator');
const departmentController = require('../controllers/department.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { ROLES, PERMISSIONS } = require('../config/rbacConstants');

router.use(requireAuth());

router.post('/', requireRole(ROLES.ADMIN, ROLES.HR_MANAGER), validate(createDepartmentSchema), departmentController.createDepartment);
router.get('/', departmentController.getDepartments);
router.get('/:id', departmentController.getDepartmentById);
router.put('/:id', requireRole(ROLES.ADMIN, ROLES.HR_MANAGER), validate(updateDepartmentSchema), departmentController.updateDepartment);
router.delete('/:id', requireRole(ROLES.ADMIN, ROLES.HR_MANAGER), departmentController.deleteDepartment);

module.exports = router;
