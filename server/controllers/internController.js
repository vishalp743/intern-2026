const Intern = require('../models/Intern');

// @desc    Add a new intern
// @route   POST /api/interns
// @access  Private (Admin)
exports.addIntern = async (req, res) => {
    const { name, email } = req.body;

    try {
        let intern = await Intern.findOne({ email });

        if (intern) {
            return res.status(400).json({ msg: 'An intern with this email already exists' });
        }

        intern = new Intern({
            name,
            email
        });

        await intern.save();
        res.status(201).json(intern);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
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
        res.status(500).send('Server Error');
    }
};

// You can add update and delete functions here as well