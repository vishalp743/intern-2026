// server/routes/evaluations.js
const express = require('express');
const router = express.Router();
const { 
    submitEvaluation, 
    getEvaluation, 
    getEvaluations, 
    updateEvaluation, 
    deleteEvaluation 
} = require('../controllers/evaluationController');

// Submit a new evaluation
router.post('/:formName', submitEvaluation);

// Get all evaluations for a form
router.get('/:formName', getEvaluations);

// Get a specific evaluation by ID
router.get('/:formName/:evaluationId', getEvaluation);

// Update an evaluation
router.put('/:formName/:evaluationId', updateEvaluation);

// Delete an evaluation
router.delete('/:formName/:evaluationId', deleteEvaluation);

module.exports = router;