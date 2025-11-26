const User = require('../models/User');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
      // NOTE: Storing plain-text passwords is a major security risk.
      // This should be updated to use bcrypt.compare in the future.
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    // Set token expiration based on role
    // Admin session expires in 1 hour
    // Tutor session expires in 24 hours
    const expiresIn = user.role === 'Admin' ? '1h' : '24h';

    const token = jwt.sign(
      payload, 
      process.env.JWT_SECRET || 'your-secret-key', 
      { expiresIn }
    );

    return res.json({
      message: `${user.role} login successful (Token expires in ${expiresIn})`,
      token,
      user: { name: user.name, role: user.role, email: user.email, id: user._id },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};