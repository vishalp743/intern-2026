// server/controllers/internController.js
const Intern = require('../models/Intern');

// @desc    Add a new intern
// @route   POST /api/interns
// @access  Private (Admin)
exports.addIntern = async (req, res) => {
    const { name, email } = req.body;
    try {
        // Validate input
        if (!name || !email) {
            return res.status(400).json({ msg: 'Please provide all required fields' });
        }

        // Check if intern already exists
        let intern = await Intern.findOne({ email });
        if (intern) {
            return res.status(400).json({ msg: 'An intern with this email already exists' });
        }

        // Create new intern
        intern = new Intern({
            name,
            email
        });

        await intern.save();
        res.status(201).json(intern);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

// @desc    Get all interns
// @route   GET /api/interns
// @access  Private (Admin/Tutor)
exports.getAllInterns = async (req, res) => {
    try {
        const interns = await Intern.find().sort({ name: 1 }); // Sort by name
        res.json(interns);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

// @desc    Get intern by ID
// @route   GET /api/interns/:id
// @access  Private
exports.getInternById = async (req, res) => {
    try {
        const intern = await Intern.findById(req.params.id);
        if (!intern) {
            return res.status(404).json({ msg: 'Intern not found' });
        }
        res.json(intern);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

// @desc    Update an intern
// @route   PUT /api/interns/:id
// @access  Private (Admin)
exports.updateIntern = async (req, res) => {
    const { name, email } = req.body;
    try {
        let intern = await Intern.findById(req.params.id);
        if (!intern) {
            return res.status(404).json({ msg: 'Intern not found' });
        }

        // Update fields if provided
        if (name) intern.name = name;
        if (email) {
            // Check if new email already exists
            const existingIntern = await Intern.findOne({ email, _id: { $ne: req.params.id } });
            if (existingIntern) {
                return res.status(400).json({ msg: 'This email is already in use' });
            }
            intern.email = email;
        }

        await intern.save();
        res.json({ msg: 'Intern updated successfully', intern });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

// @desc    Delete an intern
// @route   DELETE /api/interns/:id
// @access  Private (Admin)
exports.deleteIntern = async (req, res) => {
    try {
        const intern = await Intern.findByIdAndDelete(req.params.id);

        if (!intern) {
            return res.status(404).json({ msg: 'Intern not found' });
        }
        res.json({ msg: 'Intern deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};