const { Router } = require('express');
const { signup, signupCompany, login, logout, getMe, getRoles, assignRole } = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { ROLES } = require('../config/rbacConstants');

const router = Router();

// Public authentication routes
router.post('/signup', signup);
router.post('/signup-company', signupCompany);
router.post('/login', login);
router.post('/logout', logout);
router.get('/roles', getRoles);

// Protected user profile route
router.get('/me', requireAuth(), getMe);

// Privileged administrative role assignment
router.post('/assign-role', requireAuth(), requireRole(ROLES.ADMIN), assignRole);

module.exports = router;
