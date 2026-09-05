const { Router } = require('express');
const { signup, login, getMe, getRoles } = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = Router();

// Public auth routes
router.post('/signup', signup);
router.post('/login', login);
router.get('/roles', getRoles);

// Protected auth routes
router.get('/me', requireAuth(), getMe);

module.exports = router;
