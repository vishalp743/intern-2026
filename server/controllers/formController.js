// server/controllers/formController.js
const FormDefinition = require('../models/FormDefinition');

// @desc    Create a new evaluation form definition
// @route   POST /api/forms
// @access  Private (Admin)
exports.createForm = async (req, res) => {
    const { formName, customFields, status } = req.body;
    try {
        let form = await FormDefinition.findOne({ formName });
        if (form) {
            return res.status(400).json({ msg: 'A form with this name already exists' });
        }
        
        form = new FormDefinition({
            formName,
            customFields,
            status,
            // createdBy: req.user.id // This would come from an auth middleware
        });

        await form.save();
        res.status(201).json(form);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get all active forms
// @route   GET /api/forms/active
// @access  Private (Tutor)
exports.getActiveForms = async (req, res) => {
    try {
        // FIX: Added 'commonFields' to the select statement so it gets sent to the frontend
        const forms = await FormDefinition.find({ status: 'Active' }).select('formName customFields commonFields');
        res.json(forms);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
}
// Add other controllers: getForms (admin), updateForm, deleteForm