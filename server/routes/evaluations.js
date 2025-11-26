const express = require('express');
const router = express.Router();
const evaluationController = require('../controllers/evaluationController');
const auth = require('../middleware/auth');

// Order matters! Put specific static routes BEFORE dynamic :formName routes
router.get('/global-analytics', auth, evaluationController.getGlobalAnalytics); // ✅ NEW Route

router.post('/:formName', auth, evaluationController.submitEvaluation);
router.get('/:formName', auth, evaluationController.getEvaluations);
router.get('/:formName/evaluated-interns', auth, evaluationController.getEvaluatedInterns); // Keep this
router.get('/:formName/:evaluationId', auth, evaluationController.getEvaluation);
router.put('/:formName/:evaluationId', auth, evaluationController.updateEvaluation);
router.delete('/:formName/:evaluationId', auth, evaluationController.deleteEvaluation);

module.exports = router;