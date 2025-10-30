const express = require('express');
const router = express.Router();
const { addIntern, getAllInterns } = require('../controllers/internController');
// const auth = require('../middleware/auth'); // You would protect these routes with auth middleware

// @route   POST api/interns
// @desc    Add a new intern
router.post('/', addIntern);

// @route   GET api/interns
// @desc    Get all interns
router.get('/', getAllInterns);

module.exports = router;