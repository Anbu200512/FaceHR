const Resignation = require('../models/Resignation');
const Employee = require('../models/Employee');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { createNotification } = require('../services/notificationService');

const REASONS = ['Salary', 'Better Opportunity', 'Personal Reason', 'Relocation', 'Other'];

// @route  POST /api/resignations  (employee submits)
const applyResignation = asyncHandler(async (req, res) => {
  const employeeId = req.user.employee;
  if (!employeeId) return res.status(403).json({ success: false, message: 'Only employees can submit a resignation request' });

  const { reason, resignationDate, feedback, comments } = req.body;
  if (!reason || !resignationDate) {
    return res.status(400).json({ success: false, message: 'Resignation reason and date are required' });
  }
  if (!REASONS.includes(reason)) {
    return res.status(400).json({ success: false, message: 'Invalid resignation reason' });
  }
  const date = new Date(resignationDate);
  if (Number.isNaN(date.getTime())) {
    return res.status(400).json({ success: false, message: 'Invalid resignation date' });
  }

  const emp = await Employee.findById(employeeId);
  if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });

  const pending = await Resignation.findOne({ employee: employeeId, status: 'Pending' });
  if (pending) {
    return res.status(409).json({ success: false, message: 'You already have a pending resignation request' });
  }

  const resignation = await Resignation.create({
    employee: employeeId,
    employeeId: emp.employeeId,
    reason,
    resignationDate: date,
    feedback: String(feedback || '').trim(),
    comments: String(comments || '').trim(),
  });

  const admins = await User.find({ role: 'admin', active: true }).select('_id');
  await Promise.all(
    admins.map((a) =>
      createNotification({
        user: a._id,
        title: 'Resignation request received',
        message: `${emp.fullName} (${emp.employeeId}) submitted a resignation request.`,
        type: 'employee',
        link: '/admin',
      })
    )
  );

  res.status(201).json({ success: true, message: 'Resignation request submitted. HR will review it.', data: resignation });
});

// @route  GET /api/resignations  (admin - all, filtered)
const getResignations = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 10, 1), 100);
  const { status } = req.query;

  const filter = {};
  if (status && ['Pending', 'Approved', 'Rejected'].includes(status)) filter.status = status;

  const [total, resignations] = await Promise.all([
    Resignation.countDocuments(filter),
    Resignation.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate('employee', 'firstName lastName employeeId profilePhoto department')
      .populate('reviewedBy', 'name')
      .lean(),
  ]);

  res.json({ success: true, data: resignations, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } });
});

// @route  GET /api/resignations/mine  (employee)
const getMyResignations = asyncHandler(async (req, res) => {
  const resignations = await Resignation.find({ employee: req.user.employee }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: resignations });
});

// @route  PUT /api/resignations/:id/approve  (admin)
const approveResignation = asyncHandler(async (req, res) => {
  const resignation = await Resignation.findById(req.params.id).populate('employee', 'firstName lastName employeeId');
  if (!resignation) return res.status(404).json({ success: false, message: 'Resignation request not found' });
  if (resignation.status !== 'Pending') return res.status(400).json({ success: false, message: `Request is already ${resignation.status.toLowerCase()}` });

  resignation.status = 'Approved';
  resignation.reviewedBy = req.user.id;
  resignation.adminNote = String(req.body.adminNote || '').trim();
  await resignation.save();

  const user = await User.findOne({ employee: resignation.employee._id });
  if (user) {
    await createNotification({
      user: user._id,
      title: 'Resignation approved',
      message: `Your resignation request has been approved.${resignation.adminNote ? ` Note: ${resignation.adminNote}` : ''}`,
      type: 'success',
      link: '/employee/resignation',
    });
  }

  res.json({ success: true, message: 'Resignation request approved' });
});

// @route  PUT /api/resignations/:id/reject  (admin)
const rejectResignation = asyncHandler(async (req, res) => {
  const resignation = await Resignation.findById(req.params.id).populate('employee', 'firstName lastName employeeId');
  if (!resignation) return res.status(404).json({ success: false, message: 'Resignation request not found' });
  if (resignation.status !== 'Pending') return res.status(400).json({ success: false, message: `Request is already ${resignation.status.toLowerCase()}` });

  resignation.status = 'Rejected';
  resignation.reviewedBy = req.user.id;
  resignation.adminNote = String(req.body.adminNote || '').trim();
  await resignation.save();

  const user = await User.findOne({ employee: resignation.employee._id });
  if (user) {
    await createNotification({
      user: user._id,
      title: 'Resignation request rejected',
      message: `Your resignation request was rejected.${resignation.adminNote ? ` Reason: ${resignation.adminNote}` : ''}`,
      type: 'warning',
      link: '/employee/resignation',
    });
  }

  res.json({ success: true, message: 'Resignation request rejected' });
});

module.exports = { applyResignation, getResignations, getMyResignations, approveResignation, rejectResignation };