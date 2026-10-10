const Leave = require('../models/Leave');
const Employee = require('../models/Employee');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { createNotification } = require('../services/notificationService');
const { startOfDay, diffDays, toDateKey } = require('../utils/date');

const LEAVE_TYPES = ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Maternity Leave', 'Paternity Leave', 'Unpaid Leave', 'Other'];

// @route  POST /api/leaves  (employee applies)
const applyLeave = asyncHandler(async (req, res) => {
  const employeeId = req.user.employee;
  if (!employeeId) return res.status(403).json({ success: false, message: 'Only employees can apply for leave' });

  const { leaveType, startDate, endDate, reason } = req.body;
  if (!leaveType || !startDate || !endDate) {
    return res.status(400).json({ success: false, message: 'Leave type, start date and end date are required' });
  }
  if (!LEAVE_TYPES.includes(leaveType)) {
    return res.status(400).json({ success: false, message: 'Invalid leave type' });
  }

  const emp = await Employee.findById(employeeId);
  if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });

  const s = startOfDay(new Date(startDate));
  const e = startOfDay(new Date(endDate));
  if (e < s) return res.status(400).json({ success: false, message: 'End date must be on or after the start date' });

  const days = diffDays(s, e);

  // duplicate check: overlapping leave for same employee
  const overlapping = await Leave.findOne({
    employee: employeeId,
    status: { $in: ['Pending', 'Approved'] },
    startDate: { $lte: e },
    endDate: { $gte: s },
  });
  if (overlapping) {
    return res.status(409).json({ success: false, message: 'You already have a pending or approved leave covering these dates' });
  }

  const leave = await Leave.create({
    employee: employeeId,
    employeeId: emp.employeeId,
    leaveType,
    startDate: s,
    endDate: e,
    days,
    reason: String(reason || '').trim(),
  });

  const admins = await User.find({ role: 'admin', active: true }).select('_id');
  await Promise.all(
    admins.map((a) =>
      createNotification({
        user: a._id,
        title: 'Leave request received',
        message: `${emp.fullName} requested ${days} day(s) of ${leaveType}.`,
        type: 'leave',
        link: '/admin/leaves',
      })
    )
  );

  res.status(201).json({ success: true, message: 'Leave request submitted. You will be notified once reviewed.', data: leave });
});

// @route  GET /api/leaves  (admin - all, filtered)
const getLeaves = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 10, 1), 100);
  const { status, search, from, to } = req.query;

  const filter = {};
  if (status && ['Pending', 'Approved', 'Rejected'].includes(status)) filter.status = status;
  if (from || to) {
    const s = from ? startOfDay(new Date(from)) : new Date(0);
    const e = to ? startOfDay(new Date(to)) : new Date(8640000000000000);
    filter.$or = [{ startDate: { $lte: e }, endDate: { $gte: s } }];
  }
  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const emps = await Employee.find({ $or: [{ firstName: re }, { lastName: re }, { employeeId: re }] }).select('_id').lean();
    filter.employee = { $in: emps.map((e) => e._id) };
  }

  const [total, leaves] = await Promise.all([
    Leave.countDocuments(filter),
    Leave.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate('employee', 'firstName lastName employeeId profilePhoto department designation')
      .populate('reviewedBy', 'name')
      .lean(),
  ]);

  res.json({ success: true, data: leaves, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } });
});

// @route  GET /api/leaves/mine  (employee)
const getMyLeaves = asyncHandler(async (req, res) => {
  const leaves = await Leave.find({ employee: req.user.employee }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: leaves });
});

// @route  GET /api/leaves/balance  (employee - simple summary)
const getLeaveBalance = asyncHandler(async (req, res) => {
  const year = new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);

  const leaves = await Leave.find({ employee: req.user.employee, startDate: { $lt: end }, endDate: { $gte: start } }).lean();

  const used = leaves.filter((l) => l.status === 'Approved').reduce((s, l) => s + l.days, 0);
  const pending = leaves.filter((l) => l.status === 'Pending').reduce((s, l) => s + l.days, 0);

  res.json({
    success: true,
    data: {
      year,
      used,
      pending,
      remaining: Math.max(0, 12 - used),
      allowance: 12,
      breakdown: leaves.filter((l) => l.status === 'Approved').reduce((acc, l) => {
        acc[l.leaveType] = (acc[l.leaveType] || 0) + l.days;
        return acc;
      }, {}),
    },
  });
});

// @route  PUT /api/leaves/:id/approve
const approveLeave = asyncHandler(async (req, res) => {
  const leave = await Leave.findById(req.params.id).populate('employee', 'firstName lastName employeeId');
  if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
  if (leave.status !== 'Pending') return res.status(400).json({ success: false, message: `Leave is already ${leave.status.toLowerCase()}` });

  leave.status = 'Approved';
  leave.reviewedBy = req.user.id;
  leave.adminNote = String(req.body.adminNote || '').trim();
  await leave.save();

  const user = await User.findOne({ employee: leave.employee._id });
  if (user) {
    await createNotification({
      user: user._id,
      title: 'Leave approved',
      message: `Your ${leave.leaveType} (${toDateKey(leave.startDate)} to ${toDateKey(leave.endDate)}) was approved.`,
      type: 'success',
      link: '/employee/leave',
    });
  }

  res.json({ success: true, message: 'Leave approved' });
});

// @route  PUT /api/leaves/:id/reject
const rejectLeave = asyncHandler(async (req, res) => {
  const leave = await Leave.findById(req.params.id).populate('employee', 'firstName lastName employeeId');
  if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
  if (leave.status !== 'Pending') return res.status(400).json({ success: false, message: `Leave is already ${leave.status.toLowerCase()}` });

  leave.status = 'Rejected';
  leave.reviewedBy = req.user.id;
  leave.adminNote = String(req.body.adminNote || '').trim();
  await leave.save();

  const user = await User.findOne({ employee: leave.employee._id });
  if (user) {
    await createNotification({
      user: user._id,
      title: 'Leave rejected',
      message: `Your ${leave.leaveType} leave request was rejected.${leave.adminNote ? ` Reason: ${leave.adminNote}` : ''}`,
      type: 'warning',
      link: '/employee/leave',
    });
  }

  res.json({ success: true, message: 'Leave rejected' });
});

// @route  GET /api/leaves/summary  (admin - organization-wide leave snapshot)
const getLeaveSummary = asyncHandler(async (req, res) => {
  const year = new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const today = startOfDay(new Date());

  const [activeEmployees, approved, pending, upcoming, pendingList] = await Promise.all([
    Employee.countDocuments({ status: 'Active' }),
    Leave.aggregate([
      { $match: { status: 'Approved', startDate: { $lt: end }, endDate: { $gte: start } } },
      { $group: { _id: null, days: { $sum: '$days' } } },
    ]),
    Leave.countDocuments({ status: 'Pending' }),
    Leave.find({
      status: 'Approved',
      startDate: { $gte: today },
      endDate: { $gte: start },
    })
      .sort({ startDate: 1 })
      .limit(5)
      .populate('employee', 'firstName lastName employeeId profilePhoto department')
      .lean(),
    Leave.find({ status: 'Pending' })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('employee', 'firstName lastName employeeId profilePhoto department')
      .lean(),
  ]);

  const allowance = 12; // matches the per-employee allowance used by the leave balance endpoint
  const total = activeEmployees * allowance;
  const used = approved[0]?.days || 0;

  res.json({
    success: true,
    data: {
      year,
      allowance,
      total,
      used,
      remaining: Math.max(0, total - used),
      pending,
      upcoming,
      pendingList,
    },
  });
});

module.exports = { applyLeave, getLeaves, getMyLeaves, getLeaveBalance, approveLeave, rejectLeave, getLeaveSummary };