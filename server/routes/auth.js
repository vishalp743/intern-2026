// server/routes/auth.js
const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');
const loginLimiter = require('../middleware/loginLimiter'); // ✅ Rate Limit
const { validateLogin } = require('../middleware/validation'); // ✅ Validation

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', loginLimiter, validateLogin, login);

// @route   POST api/auth/logout
router.post('/logout', (req, res) => {
  res.status(200).json({ msg: 'Logout successful' });
});

module.exports = router;