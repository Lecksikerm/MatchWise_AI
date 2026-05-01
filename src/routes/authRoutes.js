const express = require('express');
const authController = require('../controllers/authController');
const protect = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');
const { registerSchema, loginSchema } = require('../validators/authValidator');

const router = express.Router();

router.post('/register', validateRequest(registerSchema), authController.register);
router.post('/login', validateRequest(loginSchema), authController.login);
router.get('/me', protect, authController.getMe);

module.exports = router;