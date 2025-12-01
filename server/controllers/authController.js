// server/controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

exports.login = async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // 1. Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    let isMatch = false;

    // 2. HYBRID PASSWORD CHECK (Lazy Migration)
    // Detect if password is hashed (bcrypt hashes start with $2a$ or $2b$)
    const isHashed = user.password.startsWith('$2a$') || user.password.startsWith('$2b$');

    if (isHashed) {
        // ✅ Secure Check
        isMatch = await bcrypt.compare(password, user.password);
    } else {
        // ⚠️ Legacy Plain Text Check (For your current default admin)
        if (user.password === password) {
            isMatch = true;
            // Note: We don't auto-hash here to let you manually set it via the new route
        }
    }

    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // 3. Generate Token (With strict env secret)
    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const expiresIn = user.role === 'Admin' ? '1h' : '24h';

    const token = jwt.sign(
      payload, 
      process.env.JWT_SECRET, // 🔒 No fallback here!
      { expiresIn }
    );

    return res.json({
      message: `${user.role} login successful`,
      token,
      user: { name: user.name, role: user.role, email: user.email, id: user._id },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};