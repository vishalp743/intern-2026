// server/routes/interns.js
const express = require('express');
const router = express.Router();
const { 
    addIntern, 
    getAllInterns, 
    getInternById, 
    updateIntern, 
    deleteIntern 
} = require('../controllers/internController');

// @route   POST api/interns
// @desc    Add a new intern
router.post('/', addIntern);

// @route   GET api/interns
// @desc    Get all interns
router.get('/', getAllInterns);

// @route   GET api/interns/:id
// @desc    Get intern by ID
router.get('/:id', getInternById);

// @route   PUT api/interns/:id
// @desc    Update an intern
router.put('/:id', updateIntern);

// @route   DELETE api/interns/:id
// @desc    Delete an intern
router.delete('/:id', deleteIntern);

module.exports = router;