// server/routes/users.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const { validatePasswordUpdate } = require('../middleware/validation');

// @route   GET api/users
// @desc    Get users (optionally by role)
router.get('/', auth, userController.getUsersByRole);

// @route   POST api/users
// @desc    Create a new user (with hashing)
router.post('/', auth, userController.createUser);

// @route   PUT api/users/admin/password
// @desc    Update admin password securely
router.put('/admin/password', auth, validatePasswordUpdate, userController.updateAdminPassword);

module.exports = router;