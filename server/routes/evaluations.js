const express = require('express');
const router = express.Router();
const evaluationController = require('../controllers/evaluationController');
const auth = require('../middleware/auth');

router.post('/:formName', auth, evaluationController.submitEvaluation);
router.get('/:formName', auth, evaluationController.getEvaluations);
router.get('/:formName/:evaluationId', auth, evaluationController.getEvaluation);
router.put('/:formName/:evaluationId', auth, evaluationController.updateEvaluation);
router.delete('/:formName/:evaluationId', auth, evaluationController.deleteEvaluation);



module.exports = router;
