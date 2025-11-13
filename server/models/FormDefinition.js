const mongoose = require('mongoose');

const SubFieldSchema = new mongoose.Schema({
  subFieldName: { type: String, required: true },
  minValue: { type: Number, default: 0 },
  maxValue: { type: Number, default: 10 },
}, { _id: true });

const FieldSchema = new mongoose.Schema({
  fieldName: { type: String, required: true },
  minValue: { type: Number, default: 0 },
  maxValue: { type: Number, default: 10 },
  subFields: [SubFieldSchema],
}, { _id: true });

const FormDefinitionSchema = new mongoose.Schema({
  formName: { type: String, required: true },
  tutor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // ✅ Added

  commonFields: {
    type: [FieldSchema],
    default: [
      {
        fieldName: 'Technical Skill',
        minValue: 0,
        maxValue: 10,
        subFields: [
          { subFieldName: 'Code Quality', minValue: 0, maxValue: 10 },
          { subFieldName: 'Problem Solving Approach', minValue: 0, maxValue: 10 },
          { subFieldName: 'Technology Knowledge', minValue: 0, maxValue: 10 },
          { subFieldName: 'Implementation Efficiency', minValue: 0, maxValue: 10 },
        ],
      },
      {
        fieldName: 'Communication',
        minValue: 0,
        maxValue: 10,
        subFields: [
          { subFieldName: 'Clarity of Expression', minValue: 0, maxValue: 10 },
          { subFieldName: 'Active Listening', minValue: 0, maxValue: 10 },
          { subFieldName: 'Documentation', minValue: 0, maxValue: 10 },
          { subFieldName: 'Presentation Skills', minValue: 0, maxValue: 10 },
        ],
      },
      {
        fieldName: 'Problem Solving',
        minValue: 0,
        maxValue: 10,
        subFields: [
          { subFieldName: 'Analysis & Planning', minValue: 0, maxValue: 10 },
          { subFieldName: 'Logical Thinking', minValue: 0, maxValue: 10 },
          { subFieldName: 'Debugging Skills', minValue: 0, maxValue: 10 },
          { subFieldName: 'Innovation & Creativity', minValue: 0, maxValue: 10 },
        ],
      },
      {
        fieldName: 'Teamwork',
        minValue: 0,
        maxValue: 10,
        subFields: [
          { subFieldName: 'Collaboration', minValue: 0, maxValue: 10 },
          { subFieldName: 'Supportiveness', minValue: 0, maxValue: 10 },
          { subFieldName: 'Conflict Resolution', minValue: 0, maxValue: 10 },
          { subFieldName: 'Contribution to Team Goals', minValue: 0, maxValue: 10 },
        ],
      },
      {
        fieldName: 'Professionalism',
        minValue: 0,
        maxValue: 10,
        subFields: [
          { subFieldName: 'Reliability & Punctuality', minValue: 0, maxValue: 10 },
          { subFieldName: 'Work Ethic', minValue: 0, maxValue: 10 },
          { subFieldName: 'Attention to Detail', minValue: 0, maxValue: 10 },
          { subFieldName: 'Adaptability', minValue: 0, maxValue: 10 },
        ],
      },
    ],
  },

  customFields: [FieldSchema],
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('FormDefinition', FormDefinitionSchema);
