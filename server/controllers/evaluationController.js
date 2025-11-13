// server/controllers/evaluationController.js
const mongoose = require('mongoose');
const FormDefinition = require('../models/FormDefinition');
const User = require('../models/User');

// Helper function to calculate aggregated score from sub-scores
const calculateAggregatedScore = (subScores) => {
  if (!subScores || subScores.length === 0) return 0;
  const sum = subScores.reduce((acc, sub) => acc + sub.score, 0);
  return sum / subScores.length;
};

// Create Mongoose model dynamically
const createEvaluationModel = (formName) => {
  const collectionName = `${formName.toLowerCase().replace(/\s+/g, '_')}_evaluations`;
  if (mongoose.models[collectionName]) {
    return mongoose.models[collectionName];
  }

  const SubScoreSchema = new mongoose.Schema({
    subFieldName: { type: String, required: true },
    score: { type: Number, required: true, min: 0, max: 10 }
  }, { _id: false });

  const FieldScoreSchema = new mongoose.Schema({
    fieldName: { type: String, required: true },
    score: { type: Number, required: true, min: 0, max: 10 },
    subScores: [SubScoreSchema]
  }, { _id: false });

  const EvaluationSchema = new mongoose.Schema({
    intern: { type: mongoose.Schema.Types.ObjectId, ref: 'Intern', required: true },
    tutor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // New: Store scores for all fields (common + custom)
    fieldScores: [FieldScoreSchema],
    
    // Legacy: store individual common field scores for backwards compatibility
    technicalSkill: { type: Number },
    communication: { type: Number },
    problemSolving: { type: Number },
    teamwork: { type: Number },
    professionalism: { type: Number },
    
    // General comment
    comment: { type: String },
    
  }, { strict: false, timestamps: true });

  EvaluationSchema.index({ intern: 1 }, { unique: true });

  return mongoose.model(collectionName, EvaluationSchema);
};

// @desc    Submit an evaluation
// @route   POST /api/evaluations/:formName
// @access  Private (Tutor)
exports.submitEvaluation = async (req, res) => {
  const { formName } = req.params;
  const evaluationData = req.body;

  try {
    // 1. Get the tutor's email from the session
    // 1. Get tutor info from verified JWT token
const tutorEmail = req.user.email;
const tutorId = req.user.userId;

if (!tutorEmail || !tutorId) {
  return res.status(401).json({ msg: 'Authorization denied, invalid token.' });
}


    // 2. Find the tutor in the database using their email
    const tutorUser = await User.findOne({ email: tutorEmail });
    if (!tutorUser) {
      return res.status(404).json({ msg: 'Tutor from cookie not found in database.' });
    }

    // 3. Verify the form exists
    const formDef = await FormDefinition.findOne({ formName, status: 'Active' });
    if (!formDef) {
      return res.status(404).json({ msg: 'Active form not found' });
    }

    // 4. Create evaluation model
    const EvaluationModel = createEvaluationModel(formName);
    console.log(tutorUser._id);

    // 5. Process field scores - ensure aggregated scores are calculated
    const processedFieldScores = evaluationData.fieldScores.map(field => {
      // If subScores exist, calculate aggregated score
      if (field.subScores && field.subScores.length > 0) {
        const aggregatedScore = calculateAggregatedScore(field.subScores);
        return {
          fieldName: field.fieldName,
          score: aggregatedScore, // Average of all sub-scores
          subScores: field.subScores
        };
      } else {
        // No sub-scores, use the direct score
        return {
          fieldName: field.fieldName,
          score: field.score,
          subScores: []
        };
      }
    });

    // 6. Extract legacy field scores for backwards compatibility
    const technicalSkillField = processedFieldScores.find(f => f.fieldName === 'Technical Skill');
    const communicationField = processedFieldScores.find(f => f.fieldName === 'Communication');
    const problemSolvingField = processedFieldScores.find(f => f.fieldName === 'Problem Solving');
    const teamworkField = processedFieldScores.find(f => f.fieldName === 'Teamwork');
    const professionalismField = processedFieldScores.find(f => f.fieldName === 'Professionalism');

    // 7. Create the new evaluation
    const newEvaluation = new EvaluationModel({
      intern: evaluationData.intern,
      tutor: tutorUser._id,
      fieldScores: processedFieldScores,
      
      // Legacy fields
      technicalSkill: technicalSkillField?.score || 0,
      communication: communicationField?.score || 0,
      problemSolving: problemSolvingField?.score || 0,
      teamwork: teamworkField?.score || 0,
      professionalism: professionalismField?.score || 0,
      
      comment: evaluationData.comment || ''
    });

    await newEvaluation.save();

    res.status(201).json({
      msg: 'Evaluation submitted successfully',
      evaluation: newEvaluation
    });

  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ msg: 'An evaluation for this intern on this form already exists.' });
    }
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
};

// @desc    Get evaluation by ID
// @route   GET /api/evaluations/:formName/:evaluationId
// @access  Private
exports.getEvaluation = async (req, res) => {
  const { formName, evaluationId } = req.params;

  try {
    const EvaluationModel = createEvaluationModel(formName);
    const evaluation = await EvaluationModel.findById(evaluationId)
      .populate('intern')
      .populate('tutor', 'name email');

    if (!evaluation) {
      return res.status(404).json({ msg: 'Evaluation not found' });
    }

    res.json(evaluation);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// @desc    Get all evaluations for a form
// @route   GET /api/evaluations/:formName
// @access  Private (Admin/Tutor)
exports.getEvaluations = async (req, res) => {
  const { formName } = req.params;

  try {
    const EvaluationModel = createEvaluationModel(formName);
    const evaluations = await EvaluationModel.find()
      .populate('intern')
      .populate('tutor', 'name email');

    res.json(evaluations);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// @desc    Update an evaluation
// @route   PUT /api/evaluations/:formName/:evaluationId
// @access  Private
exports.updateEvaluation = async (req, res) => {
  const { formName, evaluationId } = req.params;
  const evaluationData = req.body;

  try {
    const EvaluationModel = createEvaluationModel(formName);

    // Process field scores with aggregation
    const processedFieldScores = evaluationData.fieldScores.map(field => {
      if (field.subScores && field.subScores.length > 0) {
        const aggregatedScore = calculateAggregatedScore(field.subScores);
        return {
          fieldName: field.fieldName,
          score: aggregatedScore,
          subScores: field.subScores
        };
      } else {
        return {
          fieldName: field.fieldName,
          score: field.score,
          subScores: []
        };
      }
    });

    // Extract legacy scores
    const technicalSkillField = processedFieldScores.find(f => f.fieldName === 'Technical Skill');
    const communicationField = processedFieldScores.find(f => f.fieldName === 'Communication');
    const problemSolvingField = processedFieldScores.find(f => f.fieldName === 'Problem Solving');
    const teamworkField = processedFieldScores.find(f => f.fieldName === 'Teamwork');
    const professionalismField = processedFieldScores.find(f => f.fieldName === 'Professionalism');

    const evaluation = await EvaluationModel.findByIdAndUpdate(
      evaluationId,
      {
        fieldScores: processedFieldScores,
        technicalSkill: technicalSkillField?.score || 0,
        communication: communicationField?.score || 0,
        problemSolving: problemSolvingField?.score || 0,
        teamwork: teamworkField?.score || 0,
        professionalism: professionalismField?.score || 0,
        comment: evaluationData.comment
      },
      { new: true }
    ).populate('intern').populate('tutor', 'name email');

    res.json({ msg: 'Evaluation updated successfully', evaluation });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// @desc    Delete an evaluation
// @route   DELETE /api/evaluations/:formName/:evaluationId
// @access  Private
exports.deleteEvaluation = async (req, res) => {
  const { formName, evaluationId } = req.params;

  try {
    const EvaluationModel = createEvaluationModel(formName);
    const evaluation = await EvaluationModel.findByIdAndRemove(evaluationId);

    if (!evaluation) {
      return res.status(404).json({ msg: 'Evaluation not found' });
    }

    res.json({ msg: 'Evaluation deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
};