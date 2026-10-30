const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { createNotification } = require('../services/notificationService');
const { startOfDay, diffDays, toDateKey } = require('../utils/date');

const LEAVE_TYPES = ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Maternity Leave', 'Paternity Leave', 'Unpaid Leave', 'Other'];

const EMPLOYEE_INCLUDE = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    employeeId: true,
    profilePhoto: true,
    department: { select: { id: true, name: true } },
    designation: { select: { id: true, name: true } },
  },
};

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

  const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });

  const s = startOfDay(new Date(startDate));
  const e = startOfDay(new Date(endDate));
  if (e < s) return res.status(400).json({ success: false, message: 'End date must be on or after the start date' });

  const days = diffDays(s, e);

  // duplicate check: overlapping leave for same employee
  const overlapping = await prisma.leave.findFirst({
    where: {
      employeeRefId: employeeId,
      status: { in: ['Pending', 'Approved'] },
      startDate: { lte: e },
      endDate: { gte: s },
    },
  });
  if (overlapping) {
    return res.status(409).json({ success: false, message: 'You already have a pending or approved leave covering these dates' });
  }

  const leave = await prisma.leave.create({
    data: {
      employeeRefId: employeeId,
      employeeId: emp.employeeId,
      leaveType,
      startDate: s,
      endDate: e,
      days,
      reason: String(reason || '').trim(),
    },
  });

  const admins = await prisma.user.findMany({
    where: { role: 'admin', active: true },
    select: { id: true },
  });
  await Promise.all(
    admins.map((a) =>
      createNotification({
        user: a.id,
        title: 'Leave request received',
        message: `${emp.firstName} ${emp.lastName} requested ${days} day(s) of ${leaveType}.`,
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

  const where = {};
  if (status && ['Pending', 'Approved', 'Rejected'].includes(status)) where.status = status;
  if (from || to) {
    const s = from ? startOfDay(new Date(from)) : new Date(0);
    const e = to ? startOfDay(new Date(to)) : new Date(8640000000000000);
    where.startDate = { lte: e };
    where.endDate = { gte: s };
  }
  if (search) {
    const emps = await prisma.employee.findMany({
      where: {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { employeeId: { contains: search, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });
    where.employeeRefId = { in: emps.map((e) => e.id) };
  }

  const [total, leaves] = await Promise.all([
    prisma.leave.count({ where }),
    prisma.leave.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        employee: EMPLOYEE_INCLUDE,
        reviewedBy: { select: { id: true, name: true } },
      },
    }),
  ]);

  res.json({ success: true, data: leaves, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } });
});

// @route  GET /api/leaves/mine  (employee)
const getMyLeaves = asyncHandler(async (req, res) => {
  const leaves = await prisma.leave.findMany({
    where: { employeeRefId: req.user.employee },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: leaves });
});

// @route  GET /api/leaves/balance  (employee - simple summary)
const getLeaveBalance = asyncHandler(async (req, res) => {
  const year = new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);

  const leaves = await prisma.leave.findMany({
    where: { employeeRefId: req.user.employee, startDate: { lt: end }, endDate: { gte: start } },
  });

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

async function reviewLeave(req, res, status) {
  const leave = await prisma.leave.findUnique({
    where: { id: req.params.id },
    include: { employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } } },
  });
  if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
  if (leave.status !== 'Pending') return res.status(400).json({ success: false, message: `Leave is already ${leave.status.toLowerCase()}` });

  const adminNote = String(req.body.adminNote || '').trim();
  const updated = await prisma.leave.update({
    where: { id: leave.id },
    data: { status, reviewedById: req.user.id, adminNote },
  });

  const user = await prisma.user.findFirst({ where: { employeeRefId: leave.employeeRefId } });
  if (user) {
    const approved = status === 'Approved';
    await createNotification({
      user: user.id,
      title: approved ? 'Leave approved' : 'Leave rejected',
      message: approved
        ? `Your ${leave.leaveType} (${toDateKey(leave.startDate)} to ${toDateKey(leave.endDate)}) was approved.`
        : `Your ${leave.leaveType} leave request was rejected.${adminNote ? ` Reason: ${adminNote}` : ''}`,
      type: approved ? 'success' : 'warning',
      link: '/employee/leave',
    });
  }

  return res.json({ success: true, message: `Leave ${status.toLowerCase()}`, data: updated });
}

// @route  PUT /api/leaves/:id/approve
const approveLeave = asyncHandler((req, res) => reviewLeave(req, res, 'Approved'));

// @route  PUT /api/leaves/:id/reject
const rejectLeave = asyncHandler((req, res) => reviewLeave(req, res, 'Rejected'));

// @route  GET /api/leaves/summary  (admin - organization-wide leave snapshot)
const getLeaveSummary = asyncHandler(async (req, res) => {
  const year = new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const today = startOfDay(new Date());

  const [activeEmployees, approved, pending, upcoming, pendingList] = await Promise.all([
    prisma.employee.count({ where: { status: 'Active' } }),
    prisma.leave.aggregate({
      where: { status: 'Approved', startDate: { lt: end }, endDate: { gte: start } },
      _sum: { days: true },
    }),
    prisma.leave.count({ where: { status: 'Pending' } }),
    prisma.leave.findMany({
      where: {
        status: 'Approved',
        startDate: { gte: today },
        endDate: { gte: start },
      },
      orderBy: { startDate: 'asc' },
      take: 5,
      include: { employee: EMPLOYEE_INCLUDE },
    }),
    prisma.leave.findMany({
      where: { status: 'Pending' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { employee: EMPLOYEE_INCLUDE },
    }),
  ]);

  const allowance = 12; // matches the per-employee allowance used by the leave balance endpoint
  const total = activeEmployees * allowance;
  const used = approved._sum.days || 0;

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
