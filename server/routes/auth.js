// server/routes/auth.js
const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');

// @route   POST api/auth/login
// @desc    Authenticate user & get simple response
// @access  Public
router.post('/login', login);

// @route   POST api/auth/logout
// @desc    Logs user out (client-side will clear token)
// @access  Public
router.post('/logout', (req, res) => {
  // We don't need to do anything with the JWT on the server (it's stateless)
  // But we send a confirmation response.
  res.status(200).json({ msg: 'Logout successful' });
});

module.exports = router;