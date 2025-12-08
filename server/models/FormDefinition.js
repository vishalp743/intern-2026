

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
        fieldName: 'Technical Competence',
        minValue: 0,
        maxValue: 15, // ✅ FIXED
        subFields: [
          { subFieldName: 'Fundamentals Understanding', minValue: 0, maxValue: 5 }, // ✅ FIXED
          { subFieldName: 'Ability to Ask and Answer Questions', minValue: 0, maxValue: 5 },
          { subFieldName: 'Quiz Score', minValue: 0, maxValue: 5 },
        ],
      },
      {
        fieldName: 'Communication',
        minValue: 0,
        maxValue: 15, // ✅ FIXED
        subFields: [
          { subFieldName: 'Active Listening', minValue: 0, maxValue: 5 },
          { subFieldName: 'Verbal Fluency + Articulation ', minValue: 0, maxValue: 5 },
          { subFieldName: 'PPT + Way of Delivery (Clarity)', minValue: 0, maxValue: 5 },
        ],
      },
      {
        fieldName: 'Learning & Adaptability',
        minValue: 0,
        maxValue: 15, // ✅ FIXED
        subFields: [
          { subFieldName: 'Efforts towards understanding ', minValue: 0, maxValue: 5 },
          { subFieldName: 'Handling uncertainity', minValue: 0, maxValue: 5 },
          { subFieldName: 'Willingness to Receive Feedback', minValue: 0, maxValue: 5 },
        ],
      },
      {
        fieldName: 'Initiative & Ownership',
        minValue: 0,
        maxValue: 15, // ✅ FIXED
        subFields: [
          { subFieldName: 'Volunteering for Demonstrations / Answers', minValue: 0, maxValue: 5 },
          { subFieldName: 'Asking Relevant Questions', minValue: 0, maxValue: 5 },
          { subFieldName: 'Recall During the Next Session', minValue: 0, maxValue: 5 },
        ],
      },
      {
        fieldName: 'Professionalism',
        minValue: 0,
        maxValue: 15, // ✅ FIXED
        subFields: [
          { subFieldName: 'Respectful Communication ', minValue: 0, maxValue: 5 },
          { subFieldName: 'Responsiveness in Team Communication', minValue: 0, maxValue: 5 },
          { subFieldName: 'Punctuality', minValue: 0, maxValue: 5 },
        ],
      },
    ],
  },

  customFields: [FieldSchema],
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('FormDefinition', FormDefinitionSchema);