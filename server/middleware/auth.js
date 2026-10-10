const jwt = require('jsonwebtoken');
const config = require('../config/config');

const protect = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded; // { id, role, employeeId?, employee? }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Session expired, please sign in again' });
  }
};

const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action' });
    }
    next();
  };

module.exports = { protect, authorize };