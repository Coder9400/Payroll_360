const { Router } = require('express');
const { signup, login, getMe, getRoles, assignRole } = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { ROLES } = require('../config/rbacConstants');

const router = Router();

// Public auth routes
router.post('/signup', signup);
router.post('/login', login);
router.get('/roles', getRoles);

// Protected auth routes
router.get('/me', requireAuth(), getMe);

// Admin-only role management
router.post('/assign-role', requireAuth(), requireRole(ROLES.ADMIN), assignRole);

module.exports = router;
