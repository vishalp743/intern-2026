const User = require('../models/User');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });

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
