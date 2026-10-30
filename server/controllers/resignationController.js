const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { createNotification } = require('../services/notificationService');

const REASONS = ['Salary', 'Better Opportunity', 'Personal Reason', 'Relocation', 'Other'];

const EMPLOYEE_INCLUDE = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    employeeId: true,
    profilePhoto: true,
    department: { select: { id: true, name: true } },
  },
};

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

  const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });

  const pending = await prisma.resignation.findFirst({ where: { employeeRefId: employeeId, status: 'Pending' } });
  if (pending) {
    return res.status(409).json({ success: false, message: 'You already have a pending resignation request' });
  }

  const resignation = await prisma.resignation.create({
    data: {
      employeeRefId: employeeId,
      employeeId: emp.employeeId,
      reason,
      resignationDate: date,
      feedback: String(feedback || '').trim(),
      comments: String(comments || '').trim(),
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
        title: 'Resignation request received',
        message: `${emp.firstName} ${emp.lastName} (${emp.employeeId}) submitted a resignation request.`,
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

  const where = {};
  if (status && ['Pending', 'Approved', 'Rejected'].includes(status)) where.status = status;

  const [total, resignations] = await Promise.all([
    prisma.resignation.count({ where }),
    prisma.resignation.findMany({
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

  res.json({ success: true, data: resignations, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } });
});

// @route  GET /api/resignations/mine  (employee)
const getMyResignations = asyncHandler(async (req, res) => {
  const resignations = await prisma.resignation.findMany({
    where: { employeeRefId: req.user.employee },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: resignations });
});

async function reviewResignation(req, res, status) {
  const resignation = await prisma.resignation.findUnique({
    where: { id: req.params.id },
    include: { employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } } },
  });
  if (!resignation) return res.status(404).json({ success: false, message: 'Resignation request not found' });
  if (resignation.status !== 'Pending') return res.status(400).json({ success: false, message: `Request is already ${resignation.status.toLowerCase()}` });

  const adminNote = String(req.body.adminNote || '').trim();
  const updated = await prisma.resignation.update({
    where: { id: resignation.id },
    data: { status, reviewedById: req.user.id, adminNote },
  });

  const user = await prisma.user.findFirst({ where: { employeeRefId: resignation.employeeRefId } });
  if (user) {
    const approved = status === 'Approved';
    await createNotification({
      user: user.id,
      title: approved ? 'Resignation approved' : 'Resignation request rejected',
      message: approved
        ? `Your resignation request has been approved.${adminNote ? ` Note: ${adminNote}` : ''}`
        : `Your resignation request was rejected.${adminNote ? ` Reason: ${adminNote}` : ''}`,
      type: approved ? 'success' : 'warning',
      link: '/employee/resignation',
    });
  }

  return res.json({ success: true, message: `Resignation request ${status.toLowerCase()}`, data: updated });
}

// @route  PUT /api/resignations/:id/approve  (admin)
const approveResignation = asyncHandler((req, res) => reviewResignation(req, res, 'Approved'));

// @route  PUT /api/resignations/:id/reject  (admin)
const rejectResignation = asyncHandler((req, res) => reviewResignation(req, res, 'Rejected'));

module.exports = { applyResignation, getResignations, getMyResignations, approveResignation, rejectResignation };
