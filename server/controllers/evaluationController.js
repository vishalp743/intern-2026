// server/controllers/evaluationController.js
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

  return Math.min(normalized, 10);
};

// Helper function to determine final grade
const calculateFinalGrade = (finalScore) => {
  if (finalScore >= 9.0) return 'Excellent';
  if (finalScore >= 7.5) return 'Good';
  if (finalScore >= 6.0) return 'Average';
  if (finalScore >= 4.0) return 'Improvement Required';
  return 'Unsatisfactory'; 
};

// Create Mongoose model dynamically
const createEvaluationModel = (formName) => {
  const collectionName = `${formName.toLowerCase().replace(/\s+/g, '_')}_evaluations`;
  if (mongoose.models[collectionName]) {
    return mongoose.models[collectionName];
  }

  const SubScoreSchema = new mongoose.Schema({
    subFieldName: { type: String, required: true },
    score: { type: Number, required: true, min: 0, max: 5 }
  }, { _id: false });

  const FieldScoreSchema = new mongoose.Schema({
    fieldName: { type: String, required: true },
    score: { type: Number, required: true, min: 0, max: 10 }, 
    subScores: [SubScoreSchema]
  }, { _id: false });

  const EvaluationSchema = new mongoose.Schema({
    intern: { type: mongoose.Schema.Types.ObjectId, ref: 'Intern', required: true },
    tutor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fieldScores: [FieldScoreSchema],
    finalScore: { type: Number },
    finalGrade: { type: String },
    technicalSkill: { type: Number },
    communication: { type: Number },
    problemSolving: { type: Number },
    teamwork: { type: Number },
    professionalism: { type: Number },
    comment: { type: String },
  }, { strict: false, timestamps: true });

  EvaluationSchema.index({ intern: 1 }, { unique: true });
  return mongoose.model(collectionName, EvaluationSchema);
};

// ✅ GET GLOBAL ANALYTICS
exports.getGlobalAnalytics = async (req, res) => {
  try {
    const forms = await FormDefinition.find({}); 
    const interns = await Intern.find();
    
    const studentMap = {}; 

    interns.forEach(intern => {
      studentMap[intern._id] = {
        _id: intern._id,
        name: intern.name,
        email: intern.email,
        evaluations: [],
        metrics: {}, 
        totalScoreSum: 0,
        formCount: 0
      };
    });

    for (const form of forms) {
      try {
        const Model = createEvaluationModel(form.formName);
        const evaluations = await Model.find().lean();
        
        for (const ev of evaluations) {
          const sId = ev.intern.toString();
          if (studentMap[sId]) {
            studentMap[sId].evaluations.push({
              formId: form._id,
              formName: form.formName,
              date: ev.createdAt,
              finalScore: ev.finalScore || 0,
              finalGrade: ev.finalGrade || 'N/A',
              fieldScores: ev.fieldScores || []
            });

            studentMap[sId].totalScoreSum += (ev.finalScore || 0);
            studentMap[sId].formCount++;

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

    const analyticsData = Object.values(studentMap).map(student => {
      const averageScore = student.formCount > 0 
        ? (student.totalScoreSum / student.formCount).toFixed(2) 
        : 0;

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
        evaluations: student.evaluations.sort((a, b) => new Date(b.date) - new Date(a.date)) 
      };
    });

    analyticsData.sort((a, b) => b.averageScore - a.averageScore);

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

// ✅ SUBMIT EVALUATION (Updated Calculation)
exports.submitEvaluation = async (req, res) => {
    const { formName } = req.params;
    const evaluationData = req.body;
    try {
      const tutorId = req.user.userId;
      if (!tutorId) return res.status(401).json({ msg: 'Authorization denied' });
      const tutorUser = await User.findById(tutorId);
      if (!tutorUser) return res.status(404).json({ msg: 'Tutor not found' });
      const formDef = await FormDefinition.findOne({ formName, status: 'Active' });
      if (!formDef) return res.status(404).json({ msg: 'Active form not found' });
  
      const EvaluationModel = createEvaluationModel(formName);
      const allFormFields = [...(formDef.commonFields || []), ...(formDef.customFields || [])];
  
      const processedFieldScores = evaluationData.fieldScores.map(field => {
        const fieldDef = allFormFields.find(f => f.fieldName === field.fieldName);
        
        // ✅ FIX: Ignore the DB max value. Calculate it dynamically.
        // Logic: Number of sub-metrics * 5 (the fixed max score for a sub-metric)
        let parentMaxValue = 15; 
        if (field.subScores && field.subScores.length > 0) {
            parentMaxValue = field.subScores.length * 5;
        } else if (fieldDef) {
            // Fallback for fields without sub-scores (custom legacy fields)
            parentMaxValue = fieldDef.maxValue || 10; 
        }
  
        if (field.subScores && field.subScores.length > 0) {
          // Now this will pass 15 (or 3*5), ensuring correct normalization
          const normalizedScore = calculateAggregatedScore(field.subScores, parentMaxValue);
          return { fieldName: field.fieldName, score: normalizedScore, subScores: field.subScores };
        } else {
          // For custom single fields
          const normalizedScore = parentMaxValue > 0 ? (field.score / parentMaxValue) * 10 : 0;
          return { fieldName: field.fieldName, score: Math.min(normalizedScore, 10), subScores: [] };
        }
      });
  
      const technicalSkillField = processedFieldScores.find(f => f.fieldName === 'Technical Skill');
      const communicationField = processedFieldScores.find(f => f.fieldName === 'Communication');
      const problemSolvingField = processedFieldScores.find(f => f.fieldName === 'Problem Solving');
      const teamworkField = processedFieldScores.find(f => f.fieldName === 'Teamwork');
      const professionalismField = processedFieldScores.find(f => f.fieldName === 'Professionalism');
  
      const commonScores = [
        technicalSkillField?.score || 0,
        communicationField?.score || 0,
        problemSolvingField?.score || 0,
        teamworkField?.score || 0,
        professionalismField?.score || 0,
      ];
      
      const finalScore = commonScores.reduce((acc, score) => acc + score, 0) / commonScores.length;
      const finalGrade = calculateFinalGrade(finalScore);
  
      const newEvaluation = new EvaluationModel({
        intern: evaluationData.intern,
        tutor: tutorUser._id,
        fieldScores: processedFieldScores,
        finalScore: Math.min(finalScore, 10),
        finalGrade: finalGrade,
        technicalSkill: technicalSkillField?.score || 0,
        communication: communicationField?.score || 0,
        problemSolving: problemSolvingField?.score || 0,
        teamwork: teamworkField?.score || 0,
        professionalism: professionalismField?.score || 0,
        comment: evaluationData.comment || ''
      });
  
      await newEvaluation.save();
      res.status(201).json({ msg: 'Evaluation submitted successfully', evaluation: newEvaluation });
    } catch (err) {
      if (err.code === 11000) return res.status(400).json({ msg: 'An evaluation for this intern on this form already exists.' });
      console.error(err.message);
      if (err.name === 'ValidationError') return res.status(400).json({ msg: `Validation Error: ${err.message}` });
      res.status(500).json({ msg: 'Server Error', error: err.message });
    }
};

exports.getEvaluation = async (req, res) => {
    const { formName, evaluationId } = req.params;
    try {
        const EvaluationModel = createEvaluationModel(formName);
        const evaluation = await EvaluationModel.findById(evaluationId).populate('intern').populate('tutor', 'name email');
        if (!evaluation) return res.status(404).json({ msg: 'Evaluation not found' });
        res.json(evaluation);
    } catch (err) { console.error(err.message); res.status(500).json({ msg: 'Server Error' }); }
};

exports.getEvaluations = async (req, res) => {
    const { formName } = req.params;
    try {
        const EvaluationModel = createEvaluationModel(formName);
        const evaluations = await EvaluationModel.find().populate('intern').populate('tutor', 'name email');
        res.json(evaluations);
    } catch (err) { console.error(err.message); res.status(500).json({ msg: 'Server Error' }); }
};

// ✅ UPDATE EVALUATION (Updated Calculation)
exports.updateEvaluation = async (req, res) => {
    const { formName, evaluationId } = req.params;
    const evaluationData = req.body;
    try {
        const EvaluationModel = createEvaluationModel(formName);
        const formDef = await FormDefinition.findOne({ formName });
        if (!formDef) return res.status(404).json({ msg: 'Form definition not found' });
        const allFormFields = [...(formDef.commonFields || []), ...(formDef.customFields || [])];

        const processedFieldScores = evaluationData.fieldScores.map(field => {
            const fieldDef = allFormFields.find(f => f.fieldName === field.fieldName);
            
            // ✅ FIX: Dynamic Max Calculation here too
            let parentMaxValue = 15; 
            if (field.subScores && field.subScores.length > 0) {
                parentMaxValue = field.subScores.length * 5;
            } else if (fieldDef) {
                parentMaxValue = fieldDef.maxValue || 10;
            }

            if (field.subScores && field.subScores.length > 0) {
                const normalizedScore = calculateAggregatedScore(field.subScores, parentMaxValue);
                return { fieldName: field.fieldName, score: normalizedScore, subScores: field.subScores };
            } else {
                const normalizedScore = parentMaxValue > 0 ? (field.score / parentMaxValue) * 10 : 0;
                return { fieldName: field.fieldName, score: Math.min(normalizedScore, 10), subScores: [] };
            }
        });

        const technicalSkillField = processedFieldScores.find(f => f.fieldName === 'Technical Skill');
        const communicationField = processedFieldScores.find(f => f.fieldName === 'Communication');
        const problemSolvingField = processedFieldScores.find(f => f.fieldName === 'Problem Solving');
        const teamworkField = processedFieldScores.find(f => f.fieldName === 'Teamwork');
        const professionalismField = processedFieldScores.find(f => f.fieldName === 'Professionalism');

        const commonScores = [
            technicalSkillField?.score || 0, communicationField?.score || 0,
            problemSolvingField?.score || 0, teamworkField?.score || 0, professionalismField?.score || 0,
        ];
        const finalScore = commonScores.reduce((acc, score) => acc + score, 0) / commonScores.length;
        const finalGrade = calculateFinalGrade(finalScore);

        const evaluation = await EvaluationModel.findByIdAndUpdate(evaluationId, {
            fieldScores: processedFieldScores,
            finalScore: Math.min(finalScore, 10),
            finalGrade: finalGrade,
            technicalSkill: technicalSkillField?.score || 0,
            communication: communicationField?.score || 0,
            problemSolving: problemSolvingField?.score || 0,
            teamwork: teamworkField?.score || 0,
            professionalism: professionalismField?.score || 0,
            comment: evaluationData.comment
        }, { new: true }).populate('intern').populate('tutor', 'name email');
        res.json({ msg: 'Evaluation updated successfully', evaluation });
    } catch (err) {
        console.error(err.message);
        if (err.name === 'ValidationError') return res.status(400).json({ msg: `Validation Error: ${err.message}` });
        res.status(500).json({ msg: 'Server Error' });
    }
};

exports.deleteEvaluation = async (req, res) => {
    const { formName, evaluationId } = req.params;
    try {
        const EvaluationModel = createEvaluationModel(formName);
        const evaluation = await EvaluationModel.findByIdAndRemove(evaluationId);
        if (!evaluation) return res.status(404).json({ msg: 'Evaluation not found' });
        res.json({ msg: 'Evaluation deleted successfully' });
    } catch (err) { console.error(err.message); res.status(500).json({ msg: 'Server Error' }); }
};

exports.getEvaluatedInterns = async (req, res) => {
    const { formName } = req.params;
    try {
        const EvaluationModel = createEvaluationModel(formName);
        const evaluations = await EvaluationModel.find({}, 'intern');
        const internIds = evaluations.map(ev => ev.intern);
        res.json(internIds);
    } catch (err) { console.error(`Error getting evaluated interns for ${formName}: ${err.message}`); res.json([]); }
};