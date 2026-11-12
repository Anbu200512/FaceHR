const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { createNotification } = require('../services/notificationService');
const { evaluateCheckInStatus, computeFinalStatus } = require('../services/attendanceService');
const { startOfDay, parseDateKey, toDateKey, getDayName } = require('../utils/date');

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

function resolveDay(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return parseDateKey(value);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : startOfDay(d);
}

function combine(day, time) {
  if (!time) return null;
  if (typeof time === 'string' && /^\d{1,2}:\d{2}/.test(time)) {
    const [h, m] = time.split(':').map((p) => parseInt(p, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    const d = new Date(day);
    d.setHours(h, m, 0, 0);
    return d;
  }
  const d = new Date(time);
  return Number.isNaN(d.getTime()) ? null : d;
}

// @route  POST /api/regularizations  (employee applies)
const applyRegularization = asyncHandler(async (req, res) => {
  const employeeRefId = req.user.employee;
  if (!employeeRefId) return res.status(403).json({ success: false, message: 'Only employees can request regularization' });

  const { date, checkIn, checkOut, reason } = req.body;
  const day = resolveDay(date);
  if (!day) return res.status(400).json({ success: false, message: 'A valid date is required' });
  if (day > startOfDay(new Date())) return res.status(400).json({ success: false, message: 'Cannot request regularization for a future date' });

  const inTime = combine(day, checkIn);
  const outTime = combine(day, checkOut);
  if (!inTime && !outTime) {
    return res.status(400).json({ success: false, message: 'Provide at least a check-in or check-out time' });
  }
  if (inTime && outTime && outTime <= inTime) {
    return res.status(400).json({ success: false, message: 'Check-out must be after check-in' });
  }

  const emp = await prisma.employee.findUnique({ where: { id: employeeRefId } });
  if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });

  const pending = await prisma.attendanceRegularization.findFirst({
    where: { employeeRefId, date: day, status: 'Pending' },
  });
  if (pending) return res.status(409).json({ success: false, message: 'You already have a pending regularization for this date' });

  const regularization = await prisma.attendanceRegularization.create({
    data: {
      employeeRefId,
      employeeId: emp.employeeId,
      date: day,
      requestedCheckIn: inTime,
      requestedCheckOut: outTime,
      reason: String(reason || '').trim(),
    },
  });

  const admins = await prisma.user.findMany({ where: { role: 'admin', active: true }, select: { id: true } });
  await Promise.all(
    admins.map((a) =>
      createNotification({
        user: a.id,
        title: 'Attendance regularization request',
        message: `${emp.firstName} ${emp.lastName} requested a correction for ${toDateKey(day)}.`,
        type: 'attendance',
        link: '/admin/regularizations',
      })
    )
  );

  res.status(201).json({ success: true, message: 'Regularization request submitted', data: regularization });
});

// @route  GET /api/regularizations/mine  (employee)
const getMyRegularizations = asyncHandler(async (req, res) => {
  const rows = await prisma.attendanceRegularization.findMany({
    where: { employeeRefId: req.user.employee },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: rows });
});

// @route  GET /api/regularizations  (admin)
const getRegularizations = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 10, 1), 100);
  const { status, search, from, to } = req.query;

  const where = {};
  if (status && ['Pending', 'Approved', 'Rejected'].includes(status)) where.status = status;
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = startOfDay(new Date(from));
    if (to) where.date.lte = startOfDay(new Date(to));
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

  const [total, rows] = await Promise.all([
    prisma.attendanceRegularization.count({ where }),
    prisma.attendanceRegularization.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      relationLoadStrategy: 'join',
      include: {
        employee: EMPLOYEE_INCLUDE,
        reviewedBy: { select: { id: true, name: true } },
      },
    }),
  ]);

  res.json({ success: true, data: rows, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } });
});

async function reviewRegularization(req, res, status) {
  const row = await prisma.attendanceRegularization.findUnique({
    where: { id: req.params.id },
    include: { employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } } },
  });
  if (!row) return res.status(404).json({ success: false, message: 'Regularization request not found' });
  if (row.status !== 'Pending') return res.status(400).json({ success: false, message: `Request is already ${row.status.toLowerCase()}` });

  const adminNote = String(req.body.adminNote || '').trim();
  let attendance = null;

  if (status === 'Approved') {
    let attendanceStatus = 'Present';
    let lateMinutes = 0;
    let workingHoursMinutes = 0;

    if (row.requestedCheckIn) {
      const evaluated = await evaluateCheckInStatus(row.date, row.requestedCheckIn);
      attendanceStatus = evaluated.status;
      lateMinutes = evaluated.lateMinutes;
    }
    if (row.requestedCheckIn && row.requestedCheckOut) {
      workingHoursMinutes = Math.max(0, Math.round((row.requestedCheckOut - row.requestedCheckIn) / 60000));
      attendanceStatus = await computeFinalStatus(row.requestedCheckIn, row.requestedCheckOut, attendanceStatus);
    }

    const day = startOfDay(row.date);
    attendance = await prisma.attendance.upsert({
      where: { employeeRefId_date: { employeeRefId: row.employeeRefId, date: day } },
      update: {
        checkInTime: row.requestedCheckIn,
        checkOutTime: row.requestedCheckOut,
        status: attendanceStatus,
        lateMinutes,
        workingHoursMinutes,
        note: adminNote ? `Regularized: ${adminNote}` : 'Regularized by admin',
      },
      create: {
        employeeRefId: row.employeeRefId,
        employeeId: row.employeeId,
        date: day,
        dayName: getDayName(day),
        checkInTime: row.requestedCheckIn,
        checkOutTime: row.requestedCheckOut,
        status: attendanceStatus,
        lateMinutes,
        workingHoursMinutes,
        note: adminNote ? `Regularized: ${adminNote}` : 'Regularized by admin',
        deviceInfo: { regularized: true, regularizationId: row.id },
      },
    });
  }

  const updated = await prisma.attendanceRegularization.update({
    where: { id: row.id },
    data: {
      status,
      adminNote,
      reviewedById: req.user.id,
      attendanceId: attendance ? attendance.id : row.attendanceId,
    },
  });

  const user = await prisma.user.findFirst({ where: { employeeRefId: row.employeeRefId } });
  if (user) {
    const approved = status === 'Approved';
    await createNotification({
      user: user.id,
      title: approved ? 'Regularization approved' : 'Regularization rejected',
      message: approved
        ? `Your attendance for ${toDateKey(row.date)} was updated.`
        : `Your attendance correction for ${toDateKey(row.date)} was rejected.${adminNote ? ` Reason: ${adminNote}` : ''}`,
      type: approved ? 'success' : 'warning',
      link: '/employee/regularization',
    });
  }

  return res.json({ success: true, message: `Regularization ${status.toLowerCase()}`, data: updated });
}

const approveRegularization = asyncHandler((req, res) => reviewRegularization(req, res, 'Approved'));
const rejectRegularization = asyncHandler((req, res) => reviewRegularization(req, res, 'Rejected'));

module.exports = {
  applyRegularization,
  getMyRegularizations,
  getRegularizations,
  approveRegularization,
  rejectRegularization,
};
