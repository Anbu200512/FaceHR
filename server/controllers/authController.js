const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Employee = require('../models/Employee');
const config = require('../config/config');
const asyncHandler = require('../utils/asyncHandler');
const { createNotification } = require('../services/notificationService');

const signToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, employeeId: user.employeeId || null, employee: user.employee || null },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

// @route  POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { identifier, email, password } = req.body;
  const value = String(identifier || email || '').trim();
  if (!value || !password) {
    return res.status(400).json({ success: false, message: 'Please provide your email / employee ID and password' });
  }

  const isEmail = value.includes('@');
  const query = isEmail
    ? { email: value.toLowerCase() }
    : { employeeId: value.toUpperCase() };

  const user = await User.findOne(query).select('+password');
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(String(password), user.password);
  if (!valid) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  if (!user.active) {
    return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact HR.' });
  }

  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

  let employeeData = null;
  if (user.employee) {
    employeeData = await Employee.findById(user.employee).populate('department designation');
  }

  const token = signToken(user.toObject());
  res.json({
    success: true,
    message: `Welcome back, ${user.name}!`,
    token,
    user: { ...user.toSafeJSON(), employeeData },
  });
});

// @route  POST /api/auth/register  (creates an admin account - admin only)
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email and password are required' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  }

  const exists = await User.findOne({ email: String(email).toLowerCase() });
  if (exists) {
    return res.status(409).json({ success: false, message: 'An account with this email already exists' });
  }

  const hashed = await bcrypt.hash(String(password), 10);
  const user = await User.create({ name, email, password: hashed, role: 'admin' });
  const token = signToken(user.toObject());
  res.status(201).json({ success: true, message: 'Account created', token, user: user.toSafeJSON() });
});

// @route  GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  let employeeData = null;
  if (user.employee) {
    employeeData = await Employee.findById(user.employee)
      .populate('department designation')
      .populate({ path: 'face', select: 'faceId active' });
  }

  res.json({ success: true, user: { ...user.toSafeJSON(), employeeData } });
});

// @route  POST /api/auth/change-password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Current and new password are required' });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
  }

  const user = await User.findById(req.user.id).select('+password');
  const valid = await bcrypt.compare(String(currentPassword), user.password);
  if (!valid) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect' });
  }

  user.password = await bcrypt.hash(String(newPassword), 10);
  await user.save();
  res.json({ success: true, message: 'Password changed successfully' });
});

// @route  POST /api/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase();
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

  const user = await User.findOne({ email });
  if (!user) {
    // do not leak whether the account exists
    return res.json({
      success: true,
      message:
        'If an account exists for this email, an HR admin has been notified to reset your password.',
    });
  }

  const admins = await User.find({ role: 'admin', active: true }).select('_id');
  await Promise.all(
    admins.map((a) =>
      createNotification({
        user: a._id,
        title: 'Password reset requested',
        message: `${user.name} (${user.email}) requested a password reset.`,
        type: 'warning',
        link: '/admin/employees',
      })
    )
  );

  res.json({
    success: true,
    message:
      'If an account exists for this email, an HR admin has been notified to reset your password.',
  });
});

module.exports = { login, register, me, changePassword, forgotPassword };