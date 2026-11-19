const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { createNotification } = require('../services/notificationService');
const { evaluateCheckInStatus, computeFinalStatus, getSettings } = require('../services/attendanceService');
const { startOfDay, endOfDay, parseDateKey, toDateKey, getDayName, combineDateWithMinutes, parseTimeToMinutes } = require('../utils/date');

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

function resolveDay(value, tz = '') {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return parseDateKey(value, tz);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : startOfDay(d, tz);
}

function combine(day, time, tz = '') {
  if (!time) return null;
  if (typeof time === 'string' && /^\d{1,2}:\d{2}/.test(time)) {
    const minutes = parseTimeToMinutes(time);
    if (minutes === null) return null;
    return combineDateWithMinutes(day, minutes, tz);
  }
  const d = new Date(time);
  return Number.isNaN(d.getTime()) ? null : d;
}

// @route  POST /api/regularizations  (employee applies)
const applyRegularization = asyncHandler(async (req, res) => {
  const employeeRefId = req.user.employee;
  if (!employeeRefId) return res.status(403).json({ success: false, message: 'Only employees can request regularization' });

  const { officeTimezone: tz = '' } = await getSettings();
  const { date, checkIn, checkOut, reason } = req.body;
  const day = resolveDay(date, tz);
  if (!day) return res.status(400).json({ success: false, message: 'A valid date is required' });
  if (day > startOfDay(new Date(), tz)) return res.status(400).json({ success: false, message: 'Cannot request regularization for a future date' });

  const inTime = combine(day, checkIn, tz);
  const outTime = combine(day, checkOut, tz);
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
        message: `${emp.firstName} ${emp.lastName} requested a correction for ${toDateKey(day, tz)}.`,
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
  const { officeTimezone: tz = '' } = await getSettings();

  const where = {};
  if (status && ['Pending', 'Approved', 'Rejected'].includes(status)) where.status = status;
  if (from || to) {
    where.date = {};
    if (from) {
      const f = /^\d{4}-\d{2}-\d{2}$/.test(String(from)) ? parseDateKey(String(from), tz) : new Date(from);
      if (!Number.isNaN(f.getTime())) where.date.gte = startOfDay(f, tz);
    }
    if (to) {
      const t = /^\d{4}-\d{2}-\d{2}$/.test(String(to)) ? parseDateKey(String(to), tz) : new Date(to);
      if (!Number.isNaN(t.getTime())) where.date.lte = startOfDay(t, tz);
    }
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
  const { officeTimezone: tz = '' } = await getSettings();

  if (status === 'Approved') {
    let attendanceStatus = 'Present';
    let lateMinutes = 0;
    let workingHoursMinutes = 0;

    const empDoc = await prisma.employee.findUnique({ where: { id: row.employeeRefId } });
    if (row.requestedCheckIn) {
      const evaluated = await evaluateCheckInStatus(row.date, row.requestedCheckIn, empDoc);
      attendanceStatus = evaluated.status;
      lateMinutes = evaluated.lateMinutes;
    }
    if (row.requestedCheckIn && row.requestedCheckOut) {
      workingHoursMinutes = Math.max(0, Math.round((row.requestedCheckOut - row.requestedCheckIn) / 60000));
      attendanceStatus = await computeFinalStatus(row.requestedCheckIn, row.requestedCheckOut, attendanceStatus, empDoc);
    }

    const day = startOfDay(row.date, tz);
    const existingAttendance = await prisma.attendance.findUnique({
      where: { employeeRefId_date: { employeeRefId: row.employeeRefId, date: day } },
    });
    if (existingAttendance) {
      const hasProof =
        Boolean(existingAttendance.checkInPhoto || existingAttendance.checkOutPhoto || existingAttendance.faceVerified);
      const hasPunch = Boolean(existingAttendance.checkInTime || existingAttendance.checkOutTime);
      const force = req.body.force === true || req.body.force === 'true';
      if (hasProof && hasPunch && !force) {
        return res.status(409).json({
          success: false,
          message:
            'Attendance already has face/photo-verified punch data for this day. Re-send approval with force=true to overwrite.',
          code: 'OVERWRITE_CONFIRMATION_REQUIRED',
        });
      }
    }

    const updateData = {
      status: attendanceStatus,
      lateMinutes,
      workingHoursMinutes,
      note: adminNote ? `Regularized: ${adminNote}` : 'Regularized by admin',
      deviceInfo: { regularized: true, regularizationId: row.id },
    };
    if (row.requestedCheckIn) updateData.checkInTime = row.requestedCheckIn;
    if (row.requestedCheckOut) updateData.checkOutTime = row.requestedCheckOut;

    const createData = {
      employeeRefId: row.employeeRefId,
      employeeId: row.employeeId,
      date: day,
      dayName: getDayName(day, tz),
      checkInTime: row.requestedCheckIn || null,
      checkOutTime: row.requestedCheckOut || null,
      status: attendanceStatus,
      lateMinutes,
      workingHoursMinutes,
      note: adminNote ? `Regularized: ${adminNote}` : 'Regularized by admin',
      deviceInfo: { regularized: true, regularizationId: row.id },
    };

    attendance = await prisma.attendance.upsert({
      where: { employeeRefId_date: { employeeRefId: row.employeeRefId, date: day } },
      update: updateData,
      create: createData,
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
        ? `Your attendance for ${toDateKey(row.date, tz)} was updated.`
        : `Your attendance correction for ${toDateKey(row.date, tz)} was rejected.${adminNote ? ` Reason: ${adminNote}` : ''}`,
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
