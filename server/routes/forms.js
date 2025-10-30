// server/routes/forms.js
const express = require('express');
const router = express.Router();
const { createForm, getActiveForms } = require('../controllers/formController');
// const auth = require('../middleware/auth'); // We'd have auth middleware here

router.post('/', createForm); // Add auth middleware: router.post('/', auth, createForm)
router.get('/active', getActiveForms); // Add auth middleware

module.exports = router;