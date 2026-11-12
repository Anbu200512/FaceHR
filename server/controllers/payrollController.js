const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { createNotification } = require('../services/notificationService');
const { generatePayroll } = require('../services/payrollService');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const EMPLOYEE_SELECT = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    employeeId: true,
    profilePhoto: true,
    department: { select: { id: true, name: true } },
  },
};

// @route  GET /api/payroll  (admin)
const getRuns = asyncHandler(async (req, res) => {
  const where = {};
  const year = parseInt(req.query.year, 10);
  if (Number.isFinite(year)) where.year = year;

  const runs = await prisma.payrollRun.findMany({
    where,
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    include: { _count: { select: { payslips: true } }, processedBy: { select: { id: true, name: true } } },
  });
  res.json({ success: true, data: runs });
});

// @route  GET /api/payroll/:id  (admin)
const getRun = asyncHandler(async (req, res) => {
  const run = await prisma.payrollRun.findUnique({
    where: { id: req.params.id },
    relationLoadStrategy: 'join',
    include: {
      processedBy: { select: { id: true, name: true } },
      payslips: {
        orderBy: { employeeId: 'asc' },
        include: { employee: EMPLOYEE_SELECT },
      },
    },
  });
  if (!run) return res.status(404).json({ success: false, message: 'Payroll run not found' });
  res.json({ success: true, data: run });
});

// @route  POST /api/payroll/generate  (admin)
const generateRun = asyncHandler(async (req, res) => {
  const { month, year, notes } = req.body;
  const run = await generatePayroll({ month, year, notes, adminId: req.user.id });

  const users = await prisma.user.findMany({ where: { role: 'employee', active: true }, select: { id: true } });
  await Promise.all(
    users.map((u) =>
      createNotification({
        user: u.id,
        title: 'Payslip available',
        message: `Your payslip for ${MONTHS[run.month - 1]} ${run.year} is ready.`,
        type: 'success',
        link: '/employee/payslips',
      })
    )
  );

  res.status(201).json({
    success: true,
    message: `Payroll for ${MONTHS[run.month - 1]} ${run.year} generated`,
    data: run,
  });
});

// @route  PUT /api/payroll/:id/pay  (admin)
const markPaid = asyncHandler(async (req, res) => {
  const run = await prisma.payrollRun.findUnique({ where: { id: req.params.id } });
  if (!run) return res.status(404).json({ success: false, message: 'Payroll run not found' });

  if (run.status === 'Paid') {
    return res.json({ success: true, message: 'Payroll is already marked as paid', data: run });
  }

  const [, updated] = await prisma.$transaction([
    prisma.payslip.updateMany({ where: { payrollRunId: run.id }, data: { status: 'Paid' } }),
    prisma.payrollRun.update({ where: { id: run.id }, data: { status: 'Paid' } }),
  ]);

  const payslips = await prisma.payslip.findMany({ where: { payrollRunId: run.id }, select: { employeeRefId: true } });
  const users = await prisma.user.findMany({
    where: { employeeRefId: { in: payslips.map((p) => p.employeeRefId) } },
    select: { id: true },
  });
  await Promise.all(
    users.map((u) =>
      createNotification({
        user: u.id,
        title: 'Salary paid',
        message: `${MONTHS[run.month - 1]} ${run.year} salary has been marked as paid.`,
        type: 'success',
        link: '/employee/payslips',
      })
    )
  );

  res.json({ success: true, message: 'Payroll marked as paid', data: updated });
});

// @route  DELETE /api/payroll/:id  (admin)
const deleteRun = asyncHandler(async (req, res) => {
  const run = await prisma.payrollRun.findUnique({ where: { id: req.params.id } });
  if (!run) return res.status(404).json({ success: false, message: 'Payroll run not found' });
  if (run.status === 'Paid') {
    return res.status(400).json({ success: false, message: 'Paid payroll runs cannot be deleted' });
  }
  await prisma.payrollRun.delete({ where: { id: run.id } });
  res.json({ success: true, message: 'Payroll run deleted' });
});

// @route  GET /api/payroll/mine  (employee)
const getMyPayslips = asyncHandler(async (req, res) => {
  const where = { employeeRefId: req.user.employee };
  const year = parseInt(req.query.year, 10);
  if (Number.isFinite(year)) where.year = year;

  const payslips = await prisma.payslip.findMany({
    where,
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    relationLoadStrategy: 'join',
    include: { payrollRun: { select: { id: true, status: true } } },
  });
  res.json({ success: true, data: payslips });
});

// @route  GET /api/payroll/payslips/:id  (employee owns it or admin)
const getPayslip = asyncHandler(async (req, res) => {
  const payslip = await prisma.payslip.findUnique({
    where: { id: req.params.id },
    relationLoadStrategy: 'join',
    include: {
      employee: EMPLOYEE_SELECT,
      payrollRun: { select: { id: true, status: true, notes: true } },
    },
  });
  if (!payslip) return res.status(404).json({ success: false, message: 'Payslip not found' });

  if (req.user.role !== 'admin' && payslip.employeeRefId !== req.user.employee) {
    return res.status(403).json({ success: false, message: 'You can only view your own payslips' });
  }

  res.json({ success: true, data: payslip });
});

module.exports = { getRuns, getRun, generateRun, markPaid, deleteRun, getMyPayslips, getPayslip };
