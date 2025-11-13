// server/models/Evaluation.js
const mongoose = require('mongoose');

const SubScoreSchema = new mongoose.Schema({
  subFieldName: { type: String, required: true },
  score: { type: Number, required: true },
});

const FieldScoreSchema = new mongoose.Schema({
  fieldName: { type: String, required: true },
  score: { type: Number, required: true },
  subScores: [SubScoreSchema],
});

const EvaluationSchema = new mongoose.Schema({
  form: { type: mongoose.Schema.Types.ObjectId, ref: 'FormDefinition', required: true },
  intern: { type: mongoose.Schema.Types.ObjectId, ref: 'Intern', required: true },
  tutor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  comment: { type: String },
  fieldScores: [FieldScoreSchema],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Evaluation', EvaluationSchema);
