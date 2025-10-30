const mongoose = require('mongoose');

const FieldSchema = new mongoose.Schema({
  fieldName: { type: String, required: true },
  minValue: { type: Number, default: 0 },
  maxValue: { type: Number, default: 10 },
});

const FormDefinitionSchema = new mongoose.Schema({
  formName: { type: String, required: true, unique: true },
  
  // -- MODIFICATION START --
  // Explicitly define the 5 common fields using a default value.
  commonFields: {
    type: [FieldSchema],
    default: [
      { fieldName: 'Technical Skill', minValue: 0, maxValue: 10 },
      { fieldName: 'Communication', minValue: 0, maxValue: 10 },
      { fieldName: 'Problem Solving', minValue: 0, maxValue: 10 },
      { fieldName: 'Teamwork', minValue: 0, maxValue: 10 },
      { fieldName: 'Professionalism', minValue: 0, maxValue: 10 }
    ]
  },
  // -- MODIFICATION END --
  
  // This array stores any additional custom fields.
  customFields: [FieldSchema],
  
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('FormDefinition', FormDefinitionSchema);