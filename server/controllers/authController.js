const User = require('../models/User');

exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user by email (Admin or Tutor)
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: "Invalid credentials" });
        }

        // Compare plain text passwords
        if (user.password !== password) {
            return res.status(400).json({ msg: "Invalid credentials" });
        }

        // Save session info
        req.session.userEmail = user.email;
        req.session.userRole = user.role;

        // Login successful
        return res.json({
            message: `${user.role} login successful`,
            user: {
                name: user.name,
                role: user.role,
                id: user._id
            }
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};
