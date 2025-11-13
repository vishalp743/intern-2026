const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded; // { userId, email, role, name }
    next();
  } catch (err) {
    console.error('Invalid token:', err.message);
    res.status(401).json({ msg: 'Token is not valid' });
  }
};
