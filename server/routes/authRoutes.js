const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const { registerValidationRules, loginValidationRules } = require('../middleware/validator');
const { authRateLimiter } = require('../middleware/rateLimiter');

router.post('/register', authRateLimiter, registerValidationRules, authController.register);
router.post('/login', authRateLimiter, loginValidationRules, authController.login);
router.get('/me', authMiddleware, authController.getMe);
router.post('/seed-demo', authMiddleware, authController.seedDemo);

module.exports = router;
