// server/controllers/formController.js
const FormDefinition = require('../models/FormDefinition');
const User = require('../models/User');
const mongoose = require('mongoose'); // <-- NEW IMPORT

// @desc Create a new form
// @route POST /api/forms
// @access Private (Admin or Tutor)
const createForm = async (req, res) => {
  const { formName, customFields, status, tutor } = req.body;
  const requester = req.user;

  try {
    // Determine tutor ID
    let tutorId = requester.userId;
    if (requester.role === 'Admin') {
      if (!tutor) {
        return res.status(400).json({ msg: 'Please select a tutor to assign this form.' });
      }

      const tutorExists = await User.findOne({ _id: tutor, role: 'Tutor' });
      if (!tutorExists) {
        return res.status(404).json({ msg: 'Selected tutor not found or invalid.' });
      }

      tutorId = tutor;
    }

    const existingForm = await FormDefinition.findOne({ formName, tutor: tutorId });
    if (existingForm) {
      return res.status(400).json({ msg: 'Form with this name already exists for this tutor.' });
    }

    const form = new FormDefinition({
      formName,
      customFields,
      status,
      tutor: tutorId,
      createdBy: requester.userId,
    });

    await form.save();
    res.status(201).json(form);
  } catch (err) {
    console.error('Error creating form:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
};

// @desc Get active forms for logged-in tutor
// @route GET /api/forms/active
// @access Private (Tutor)
const getActiveForms = async (req, res) => {
  try {
    const tutorId = req.user.userId;
    const forms = await FormDefinition.find({ status: 'Active', tutor: tutorId })
      .select('formName customFields commonFields');
    res.json(forms);
  } catch (err) {
    console.error('Error fetching active forms:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
};

// @desc Get all form definitions (Admin only for visualization and management)
// @route GET /api/forms
// @access Private (Admin)
const getAllForms = async (req, res) => {
  try {
    // Populate the tutor field so the Admin can see who the form belongs to
    const forms = await FormDefinition.find().populate('tutor', 'name email');
    res.json(forms);
  } catch (err) {
    console.error('Error fetching all forms for admin:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
};

// @desc Delete a form
// @route DELETE /api/forms/:id
// @access Private (Admin)
const deleteForm = async (req, res) => { // <-- NEW FUNCTION
  const { id } = req.params;
  try {
    // 1. Find and delete the FormDefinition document
    const form = await FormDefinition.findByIdAndDelete(id);

    if (!form) {
      return res.status(404).json({ msg: 'Form not found' });
    }

    // 2. Determine the evaluation collection name
    const collectionName = `${form.formName.toLowerCase().replace(/\s+/g, '_')}_evaluations`;

    // 3. Delete the associated dynamic collection (if it exists)
    try {
      await mongoose.connection.db.dropCollection(collectionName);
      console.log(`Successfully dropped collection: ${collectionName}`);
    } catch (err) {
      // Handle the case where the collection doesn't exist (mongo error 'ns not found')
      if (err.message.includes('ns not found')) {
        console.log(`Collection ${collectionName} does not exist, skipping drop.`);
      } else {
        console.error(`Error dropping collection ${collectionName}:`, err.message);
      }
    }

    res.json({ msg: `Form "${form.formName}" deleted successfully.` });

  } catch (err) {
    console.error('Error deleting form:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
};

// ✅ Export correctly as named exports
module.exports = { createForm, getActiveForms, getAllForms, deleteForm };
