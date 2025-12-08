const mongoose = require('mongoose');
const FormDefinition = require('../models/FormDefinition');
const User = require('../models/User');
const Intern = require('../models/Intern');

// Helper function to calculate aggregated AND NORMALIZED score from sub-scores
const calculateAggregatedScore = (subScores, parentMaxValue) => {
  if (!subScores || subScores.length === 0) return 0;
  
  const sum = subScores.reduce((acc, sub) => acc + sub.score, 0);
  
  // Use the provided parentMaxValue, defaulting to 15 if something goes wrong
  const max = parentMaxValue || 15; 
  
  if (max === 0) return 0;
  
  const normalized = (sum / max) * 10;

  // SAFETY: Ensure it never exceeds 10
  return Math.min(normalized, 10);
};

// Helper function to determine final grade
const calculateFinalGrade = (finalScore) => {
  if (finalScore >= 9.0) return 'Excellent';
  if (finalScore >= 7.5) return 'Good';
  if (finalScore >= 6.0) return 'Average';
  if (finalScore >= 4.0) return 'Improvement Required';
  return 'Unsatisfactory'; // Below 4.0
};

// Create Mongoose model dynamically
const createEvaluationModel = (formName) => {
  const collectionName = `${formName.toLowerCase().replace(/\s+/g, '_')}_evaluations`;
  if (mongoose.models[collectionName]) {
    return mongoose.models[collectionName];
  }

  const SubScoreSchema = new mongoose.Schema({
    subFieldName: { type: String, required: true },
    score: { type: Number, required: true, min: 0, max: 5 } // Raw score (0-5)
  }, { _id: false });

  const FieldScoreSchema = new mongoose.Schema({
    fieldName: { type: String, required: true },
    // Ensure max is 10 here to match our normalization logic
    score: { type: Number, required: true, min: 0, max: 10 }, 
    subScores: [SubScoreSchema]
  }, { _id: false });

  const EvaluationSchema = new mongoose.Schema({
    intern: { type: mongoose.Schema.Types.ObjectId, ref: 'Intern', required: true },
    tutor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // Stores all fields
    fieldScores: [FieldScoreSchema],

    // Stores the final OVERALL normalized score (out of 10)
    finalScore: { type: Number },

    // Stores the final OVERALL grade
    finalGrade: { type: String },
    
    // Legacy fields (will store normalized 0-10 score)
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

// ✅ GET GLOBAL ANALYTICS (Updated to include comments)
exports.getGlobalAnalytics = async (req, res) => {
  try {
    // 1. Fetch all forms (Active & Inactive) to ensure complete history
    const forms = await FormDefinition.find({}); 
    
    // 2. Fetch all interns to ensure we list everyone
    const interns = await Intern.find();
    
    const studentMap = {}; // Map: internId -> { info, evaluations: [], metrics: {} }

    // Initialize map with all interns
    interns.forEach(intern => {
      studentMap[intern._id] = {
        _id: intern._id,
        name: intern.name,
        email: intern.email,
        evaluations: [],
        metrics: {}, // Cumulative metric sums
        totalScoreSum: 0,
        formCount: 0
      };
    });

    // 3. Iterate through every form and aggregate data
    for (const form of forms) {
      try {
        const Model = createEvaluationModel(form.formName);
        // Fetch evaluations for this form
        const evaluations = await Model.find().lean();
        
        for (const ev of evaluations) {
          const sId = ev.intern.toString();
          if (studentMap[sId]) {
            // Add to student's history
            studentMap[sId].evaluations.push({
              formId: form._id,
              formName: form.formName,
              date: ev.createdAt,
              finalScore: ev.finalScore || 0,
              finalGrade: ev.finalGrade || 'N/A',
              comment: ev.comment || 'No comment provided', // ✅ Include Comment
              fieldScores: ev.fieldScores || []
            });

            // Update totals for ranking
            studentMap[sId].totalScoreSum += (ev.finalScore || 0);
            studentMap[sId].formCount++;

            // Aggregate specific metrics (Technical, Communication, etc.)
            if (ev.fieldScores) {
              ev.fieldScores.forEach(field => {
                if (!studentMap[sId].metrics[field.fieldName]) {
                  studentMap[sId].metrics[field.fieldName] = { sum: 0, count: 0 };
                }
                studentMap[sId].metrics[field.fieldName].sum += field.score;
                studentMap[sId].metrics[field.fieldName].count++;
              });
            }
          }
        }
      } catch (err) {
        // Suppress errors for forms that might not have collections yet
      }
    }

    // 4. Calculate Averages and Finalize Data Structure
    const analyticsData = Object.values(studentMap).map(student => {
      const averageScore = student.formCount > 0 
        ? (student.totalScoreSum / student.formCount).toFixed(2) 
        : 0;

      // Calculate average for each metric
      const metricAverages = {};
      for (const [metricName, data] of Object.entries(student.metrics)) {
        metricAverages[metricName] = data.count > 0 
          ? (data.sum / data.count).toFixed(2) 
          : 0;
      }

      return {
        id: student._id,
        name: student.name,
        email: student.email,
        totalForms: student.formCount,
        averageScore: parseFloat(averageScore),
        metricScores: metricAverages,
        evaluations: student.evaluations.sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort history by date desc
      };
    });

    // 5. Sort by Global Rank (Average Score Descending)
    analyticsData.sort((a, b) => b.averageScore - a.averageScore);

    // Add Rank property
    const rankedData = analyticsData.map((student, index) => ({
      ...student,
      rank: index + 1
    }));

    res.json(rankedData);

  } catch (err) {
    console.error('Error fetching global analytics:', err.message);
    res.status(500).json({ msg: 'Server Error fetching analytics' });
  }
};

// ✅ SUBMIT EVALUATION (Keeps dynamic max calculation logic)
exports.submitEvaluation = async (req, res) => {
  const { formName } = req.params;
  const evaluationData = req.body; // Contains raw sub-scores (0-5) from client

  try {
    const tutorId = req.user.userId;
    if (!tutorId) {
      return res.status(401).json({ msg: 'Authorization denied, invalid token.' });
    }

    const tutorUser = await User.findById(tutorId);
    if (!tutorUser) {
      return res.status(404).json({ msg: 'Tutor not found in database.' });
    }

    const formDef = await FormDefinition.findOne({ formName, status: 'Active' });
    if (!formDef) {
      return res.status(404).json({ msg: 'Active form not found' });
    }

    const EvaluationModel = createEvaluationModel(formName);
    
    const allFormFields = [...(formDef.commonFields || []), ...(formDef.customFields || [])];

    // 5. Process field scores - calculate NORMALIZED (0-10) score
    const processedFieldScores = evaluationData.fieldScores.map(field => {
      const fieldDef = allFormFields.find(f => f.fieldName === field.fieldName);
      
      // Dynamic Max Calculation (Ignore DB Value if possible)
      let parentMaxValue = 15; 
      if (field.subScores && field.subScores.length > 0) {
          parentMaxValue = field.subScores.length * 5;
      } else if (fieldDef) {
          parentMaxValue = fieldDef.maxValue || 10; 
      }

      if (field.subScores && field.subScores.length > 0) {
        // Normalize based on true max (e.g. 15)
        const normalizedScore = calculateAggregatedScore(field.subScores, parentMaxValue);
        return {
          fieldName: field.fieldName,
          score: normalizedScore, 
          subScores: field.subScores 
        };
      } else {
        // Handle custom fields without sub-fields
        const normalizedScore = parentMaxValue > 0 ? (field.score / parentMaxValue) * 10 : 0;
        
        return {
          fieldName: field.fieldName,
          score: Math.min(normalizedScore, 10),
          subScores: []
        };
      }
    });

    // 6. Extract legacy field scores (which are now 0-10)
    const technicalSkillField = processedFieldScores.find(f => f.fieldName === 'Technical Competence');
    const communicationField = processedFieldScores.find(f => f.fieldName === 'Communication');
    const problemSolvingField = processedFieldScores.find(f => f.fieldName === 'Learning & Adaptability');
    const teamworkField = processedFieldScores.find(f => f.fieldName === 'Initiative & Ownership');
    const professionalismField = processedFieldScores.find(f => f.fieldName === 'Professionalism');

    // 7. Calculate Final Normalized Score (out of 10)
    const commonScores = [
      technicalSkillField?.score || 0,
      communicationField?.score || 0,
      problemSolvingField?.score || 0,
      teamworkField?.score || 0,
      professionalismField?.score || 0,
    ];
    
    // Average of the 5 main metrics
    const finalScore = commonScores.reduce((acc, score) => acc + score, 0) / commonScores.length;
    
    // 8. Calculate Final Grade
    const finalGrade = calculateFinalGrade(finalScore);

    // 9. Create the new evaluation
    const newEvaluation = new EvaluationModel({
      intern: evaluationData.intern,
      tutor: tutorUser._id,
      fieldScores: processedFieldScores,
      finalScore: Math.min(finalScore, 10), // Ensure safety cap
      finalGrade: finalGrade, 
      
      // Legacy fields (now normalized 0-10)
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
    if (err.name === 'ValidationError') {
       return res.status(400).json({ msg: `Validation Error: ${err.message}` });
    }
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
};

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


// ✅ UPDATE EVALUATION (Keeps dynamic max calculation logic)
exports.updateEvaluation = async (req, res) => {
  const { formName, evaluationId } = req.params;
  const evaluationData = req.body;

  try {
    const EvaluationModel = createEvaluationModel(formName);

    const formDef = await FormDefinition.findOne({ formName });
    if (!formDef) {
      return res.status(404).json({ msg: 'Form definition not found' });
    }
    
    const allFormFields = [...(formDef.commonFields || []), ...(formDef.customFields || [])];

    // Process field scores with aggregation (NORMALIZED)
    const processedFieldScores = evaluationData.fieldScores.map(field => {
      const fieldDef = allFormFields.find(f => f.fieldName === field.fieldName);
      
      // Dynamic Max Calculation
      let parentMaxValue = 15; 
      if (field.subScores && field.subScores.length > 0) {
          parentMaxValue = field.subScores.length * 5;
      } else if (fieldDef) {
          parentMaxValue = fieldDef.maxValue || 10;
      }

      if (field.subScores && field.subScores.length > 0) {
        const normalizedScore = calculateAggregatedScore(field.subScores, parentMaxValue);
        return {
          fieldName: field.fieldName,
          score: normalizedScore, // Normalized 0-10
          subScores: field.subScores // Raw 0-5
        };
      } else {
        const normalizedScore = parentMaxValue > 0 ? (field.score / parentMaxValue) * 10 : 0;
        return {
          fieldName: field.fieldName,
          score: Math.min(normalizedScore, 10),
          subScores: []
        };
      }
    });

    // Extract legacy scores
    const technicalSkillField = processedFieldScores.find(f => f.fieldName === 'Technical Competence');
    const communicationField = processedFieldScores.find(f => f.fieldName === 'Communication');
    const problemSolvingField = processedFieldScores.find(f => f.fieldName === 'Learning & Adaptability');
    const teamworkField = processedFieldScores.find(f => f.fieldName === 'Initiative & Ownership');
    const professionalismField = processedFieldScores.find(f => f.fieldName === 'Professionalism');
    
    // Calculate Final Normalized Score (out of 10)
    const commonScores = [
      technicalSkillField?.score || 0,
      communicationField?.score || 0,
      problemSolvingField?.score || 0,
      teamworkField?.score || 0,
      professionalismField?.score || 0,
    ];
    const finalScore = commonScores.reduce((acc, score) => acc + score, 0) / commonScores.length;
    
    // Calculate Final Grade
    const finalGrade = calculateFinalGrade(finalScore);

    const evaluation = await EvaluationModel.findByIdAndUpdate(
      evaluationId,
      {
        fieldScores: processedFieldScores,
        finalScore: Math.min(finalScore, 10), // Update final score
        finalGrade: finalGrade, // Update final grade
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
    if (err.name === 'ValidationError') {
       return res.status(400).json({ msg: `Validation Error: ${err.message}` });
    }
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

// @desc    Get list of intern IDs who have been evaluated for a specific form
// @route   GET /api/evaluations/:formName/evaluated-interns
// @access  Private
exports.getEvaluatedInterns = async (req, res) => {
  const { formName } = req.params;

  try {
    // Ensure we have the model to query
    const EvaluationModel = createEvaluationModel(formName);
    
    // Find all evaluations for this form, returning only the 'intern' field
    const evaluations = await EvaluationModel.find({}, 'intern');
    
    // Extract IDs
    const internIds = evaluations.map(ev => ev.intern);
    
    res.json(internIds);
  } catch (err) {
    console.error(`Error getting evaluated interns for ${formName}: ${err.message}`);
    // If the collection doesn't exist yet, this might fail or return empty. 
    // We'll return an empty array to be safe.
    res.json([]); 
  }
};