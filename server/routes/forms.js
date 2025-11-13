// server/routes/forms.js
const express = require('express');
const router = express.Router();
const { createForm, getActiveForms, getAllForms } = require('../controllers/formController');
const auth = require('../middleware/auth');

// @route   POST api/forms
// @desc    Create a new form
router.post('/', auth, createForm);

// @route   GET api/forms/active
// @desc    Get active forms for logged-in tutor
router.get('/active', auth, getActiveForms);

// @route   GET api/forms
// @desc    Get all form definitions (used by Admin Visualization dashboard)
router.get('/', auth, getAllForms);

module.exports = router;