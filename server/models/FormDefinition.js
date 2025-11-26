const mongoose = require('mongoose');

const SubFieldSchema = new mongoose.Schema({
  subFieldName: { type: String, required: true },
  minValue: { type: Number, default: 0 },
  maxValue: { type: Number, default: 5 }, // ✅ FIXED: Default is 5
}, { _id: true });

const FieldSchema = new mongoose.Schema({
  fieldName: { type: String, required: true },
  minValue: { type: Number, default: 0 },
  maxValue: { type: Number, default: 15 }, // ✅ FIXED: Default is 15 (3 * 5)
  subFields: [SubFieldSchema],
}, { _id: true });

const FormDefinitionSchema = new mongoose.Schema({
  formName: { type: String, required: true },
  tutor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  commonFields: {
    type: [FieldSchema],
    default: [
      {
        fieldName: 'Technical Skill',
        minValue: 0,
        maxValue: 15, // ✅ FIXED
        subFields: [
          { subFieldName: 'Code Quality', minValue: 0, maxValue: 5 }, // ✅ FIXED
          { subFieldName: 'Problem Solving Approach', minValue: 0, maxValue: 5 },
          { subFieldName: 'Technology Knowledge', minValue: 0, maxValue: 5 },
        ],
      },
      {
        fieldName: 'Communication',
        minValue: 0,
        maxValue: 15, // ✅ FIXED
        subFields: [
          { subFieldName: 'Active Listening', minValue: 0, maxValue: 5 },
          { subFieldName: 'Documentation', minValue: 0, maxValue: 5 },
          { subFieldName: 'Presentation Skills', minValue: 0, maxValue: 5 },
        ],
      },
      {
        fieldName: 'Problem Solving',
        minValue: 0,
        maxValue: 15, // ✅ FIXED
        subFields: [
          { subFieldName: 'Analysis & Planning', minValue: 0, maxValue: 5 },
          { subFieldName: 'Logical Thinking', minValue: 0, maxValue: 5 },
          { subFieldName: 'Debugging Skills', minValue: 0, maxValue: 5 },
        ],
      },
      {
        fieldName: 'Teamwork',
        minValue: 0,
        maxValue: 15, // ✅ FIXED
        subFields: [
          { subFieldName: 'Collaboration', minValue: 0, maxValue: 5 },
          { subFieldName: 'Supportiveness', minValue: 0, maxValue: 5 },
          { subFieldName: 'Conflict Resolution', minValue: 0, maxValue: 5 },
        ],
      },
      {
        fieldName: 'Professionalism',
        minValue: 0,
        maxValue: 15, // ✅ FIXED
        subFields: [
          { subFieldName: 'Reliability & Punctuality', minValue: 0, maxValue: 5 },
          { subFieldName: 'Work Ethic', minValue: 0, maxValue: 5 },
          { subFieldName: 'Attention to Detail', minValue: 0, maxValue: 5 },
        ],
      },
    ],
  },

  customFields: [FieldSchema],
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('FormDefinition', FormDefinitionSchema);