// server/routes/forms.js
const express = require('express');
const router = express.Router();
const { createForm, getActiveForms } = require('../controllers/formController');
const auth = require('../middleware/auth');

// ✅ Both handlers are real functions from the controller
router.post('/', auth, createForm);
router.get('/active', auth, getActiveForms);

module.exports = router;
