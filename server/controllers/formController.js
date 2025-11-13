// server/controllers/formController.js
const FormDefinition = require('../models/FormDefinition');
const User = require('../models/User');

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

// ✅ Export correctly as named exports
module.exports = { createForm, getActiveForms };
