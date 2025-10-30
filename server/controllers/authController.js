const User = require('../models/User');
const bcrypt = require('bcryptjs');

exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // ... (Admin login logic remains the same)
        if (email === process.env.ADMIN_EMAIL) {
            if (password === process.env.ADMIN_PASSWORD) {
                return res.json({
                    message: "Admin login successful",
                    user: { name: "Admin", role: "Admin" }
                });
            } else {
                return res.status(400).json({ msg: "Invalid Credentials" });
            }
        }
        
        // Check for Tutor User in Database
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: "Invalid Credentials" });
        }

        
        if (password != user.password) {
            return res.status(400).json({ msg: "Invalid Credentials" });
        }
        
        // FIX: Save the email to the session object
        req.session.tutorEmail = user.email;
        
        // Tutor login successful
        return res.json({
            message: "Tutor login successful",
            user: { name: user.name, role: user.role, id: user._id }
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};