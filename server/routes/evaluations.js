const express = require('express');
const router = express.Router();
const { submitEvaluation } = require('../controllers/evaluationController');

// This line tells Express:
// "When you get a POST request to a URL like '/api/evaluations/ANYTHING',
//  run the submitEvaluation function."
router.post('/:formName', submitEvaluation);

module.exports = router;