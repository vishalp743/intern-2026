// server/controllers/userController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @desc    Create a new user (Admin/Tutor) with HASHED password
// @route   POST /api/users
// @access  Private (Admin)
exports.createUser = async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: 'User already exists' });

        user = new User({ name, email, password, role });

        // 🔒 Hash password before saving
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();
        res.status(201).json({ 
            msg: 'User created successfully', 
            name: user.name, 
            email: user.email 
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get users by role
// @route   GET /api/users?role=Tutor
// @access  Private
exports.getUsersByRole = async (req, res) => {
    const { role } = req.query;
    try {
        const query = role ? { role } : {};
        const users = await User.find(query).select('-password'); // Exclude password
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Update Admin Password (Encrypted)
// @route   PUT /api/users/admin/password
// @access  Private (Admin Only)
exports.updateAdminPassword = async (req, res) => {
    const { newPassword } = req.body;
    try {
        const userId = req.user.userId; // From Token
        const user = await User.findById(userId);

        if (!user) return res.status(404).json({ msg: 'User not found' });

        // 🔒 Hash the new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        await user.save();
        res.json({ msg: 'Password updated and encrypted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};