const express = require('express');
const router = express.Router();
const validate = require('../middleware/validate.middleware');
const { createDepartmentSchema, updateDepartmentSchema } = require('../validators/hr.validator');
const departmentController = require('../controllers/department.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');

router.use(requireAuth());

router.post('/', requirePermission('create:hr_master'), validate(createDepartmentSchema), departmentController.createDepartment);
router.get('/', requirePermission('read:hr_master'), departmentController.getDepartments);
router.get('/:id', requirePermission('read:hr_master'), departmentController.getDepartmentById);
router.put('/:id', requirePermission('update:hr_master'), validate(updateDepartmentSchema), departmentController.updateDepartment);
router.delete('/:id', requirePermission('delete:hr_master'), departmentController.deleteDepartment);

module.exports = router;
