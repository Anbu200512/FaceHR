const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { saveBuffer } = require('../middleware/upload');
const { haversineDistanceMeters } = require('../utils/geo');
const { getAttendanceSettings } = require('../services/attendanceSettingsService');
const {
  verifyAgainstProfile,
  parseDescriptor,
} = require('../services/faceVerification');
const {
  evaluateCheckInStatus,
  computeFinalStatus,
} = require('../services/attendanceService');
const {
  startOfDay,
  endOfDay,
  getDayName,
  formatDuration,
  monthRange,
  toDateKey,
  isWeekend,
  diffDays,
} = require('../utils/date');

const sanitizeString = (v, max = 200) => String(v || '').slice(0, max);

// Parse an optional location payload (object or JSON string) sent by the client.
function parseLocation(raw) {
  if (!raw) return null;
  let obj = raw;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;

  const loc = {};
  if (typeof obj.address === 'string' && obj.address.trim()) {
    loc.address = obj.address.trim().slice(0, 300);
  }
  const lat = Number(obj.latitude);
  const lng = Number(obj.longitude);
  if (lat !== null && lat !== undefined && lat !== '' && !Number.isNaN(lat)) loc.latitude = Math.round(lat * 1e6) / 1e6;
  if (lng !== null && lng !== undefined && lng !== '' && !Number.isNaN(lng)) loc.longitude = Math.round(lng * 1e6) / 1e6;

  if (!('address' in loc) && !('latitude' in loc) && !('longitude' in loc)) return null;
  return loc;
}

function summarizeDevice(req) {
  return {
    userAgent: sanitizeString(req.body.device?.userAgent || req.headers['user-agent'] || '', 500),
    platform: sanitizeString(req.body.device?.platform || '', 100),
    screen: sanitizeString(req.body.device?.screen || '', 50),
  };
}

function computeDistanceFromCompany(location, locCfg) {
  if (!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) return null;
  const d = haversineDistanceMeters(location.latitude, location.longitude, locCfg.latitude, locCfg.longitude);
  return d === null ? null : Math.round(d);
}

function evaluateGeofence(settings, location) {
  if (!settings.geoEnabled) return { ok: true, distance: null, allowed: null };
  if (!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
    return {
      ok: false,
      code: 'LOCATION_REQUIRED',
      message: 'Location access is required to mark attendance. Please enable location and try again.',
    };
  }
  const allowed = settings.location.allowedRadius;
  const distance = computeDistanceFromCompany(location, settings.location);
  if (distance === null) {
    return { ok: false, code: 'LOCATION_INVALID', message: 'Could not compute your distance from the company location.' };
  }
  if (distance > allowed) {
    return {
      ok: false,
      code: 'OUTSIDE_ALLOWED_AREA',
      message: `You are outside the authorized attendance area. Current distance: ${distance} m · Allowed distance: ${allowed} m`,
      distance,
      allowed,
    };
  }
  return { ok: true, distance, allowed };
}

// helper: build per-employee day status for all active employees on a date
async function computeDayStatus(employees, date) {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const [records, leaves] = await Promise.all([
    prisma.attendance.findMany({ where: { date: { gte: dayStart, lt: dayEnd } } }),
    prisma.leave.findMany({
      where: { status: 'Approved', startDate: { lt: dayEnd }, endDate: { gte: dayStart } },
      select: { employeeRefId: true },
    }),
  ]);

  const recMap = new Map();
  records.forEach((r) => recMap.set(String(r.employeeRefId), r));
  const leaveSet = new Set();
  leaves.forEach((l) => leaveSet.add(String(l.employeeRefId)));

  return employees.map((emp) => {
    const rec = recMap.get(String(emp.id));
    if (rec) return { employee: emp, record: rec, status: rec.status };
    if (leaveSet.has(String(emp.id))) return { employee: emp, record: null, status: 'On Leave' };
    return { employee: emp, record: null, status: 'Absent' };
  });
}

// @route  POST /api/attendance/check-in
const checkIn = asyncHandler(async (req, res) => {
  const employee = req.user.employee;
  if (!employee) return res.status(403).json({ success: false, message: 'Only employees can check in' });

  const empDoc = await prisma.employee.findUnique({ where: { id: employee } });
  if (!empDoc) return res.status(404).json({ success: false, message: 'Employee profile not found' });
  if (empDoc.status !== 'Active') {
    return res.status(403).json({ success: false, message: 'Your account is inactive. Please contact HR.' });
  }

  const settings = await getAttendanceSettings();
  if (settings.faceEnabled === false) {
    return res.status(403).json({
      success: false,
      message: 'Face attendance is currently disabled by your administrator.',
      code: 'FACE_DISABLED',
    });
  }

  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ success: false, message: 'A face photo is required to check in' });
  }

  const today = startOfDay(new Date());
  const existing = await prisma.attendance.findFirst({ where: { employeeRefId: employee, date: today } });

  if (existing) {
    if (existing.checkInTime && existing.checkOutTime) {
      return res.status(409).json({
        success: false,
        message: 'You have already completed today\'s attendance.',
        code: 'COMPLETED',
        data: existing,
      });
    }
    if (existing.checkInTime) {
      return res.status(409).json({
        success: false,
        message: `Already checked in today at ${new Date(existing.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Would you like to check out?`,
        code: 'ALREADY_CHECKED_IN',
        data: existing,
      });
    }
  }

  const checkInLocation = parseLocation(req.body.location);
  const geofence = evaluateGeofence(settings, checkInLocation);
  if (!geofence.ok) {
    return res.status(403).json({
      success: false,
      message: geofence.message,
      code: geofence.code,
      data: { distance: geofence.distance, allowed: geofence.allowed },
    });
  }

  const verification = await verifyAgainstProfile({
    employeeId: employee,
    buffer: req.file.buffer,
    clientDescriptor: parseDescriptor(req.body.descriptor),
  });

  if (!verification.ok) {
    return res.status(400).json({ success: false, message: verification.message, code: verification.code, data: verification });
  }

  const now = new Date();
  const ext = req.file.mimetype === 'image/png' ? 'png' : req.file.mimetype === 'image/webp' ? 'webp' : 'jpg';
  const checkInPhoto = saveBuffer(req.file.buffer, ext);
  const checkInDistanceFromCompany = geofence.distance;

  const { status, lateMinutes } = await evaluateCheckInStatus(today, now);

  try {
    const record = await prisma.attendance.create({
      data: {
        employeeRefId: employee,
        employeeId: empDoc.employeeId,
        date: today,
        dayName: getDayName(today),
        checkInTime: now,
        status,
        lateMinutes,
        checkInPhoto,
        ...(checkInLocation ? { checkInLocation } : {}),
        ...(checkInDistanceFromCompany !== null ? { checkInDistanceFromCompany } : {}),
        checkInMatchDistance: verification.distance,
        faceVerified: true,
        deviceInfo: summarizeDevice(req),
      },
    });

    return res.status(201).json({
      success: true,
      message: status === 'Late' ? `Check-in successful. You are late by ${lateMinutes} minutes.` : 'Check-in successful',
      data: record,
    });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'You have already checked in today.',
        code: 'ALREADY_CHECKED_IN',
      });
    }
    throw err;
  }
});

// @route  POST /api/attendance/check-out
const checkOut = asyncHandler(async (req, res) => {
  const employee = req.user.employee;
  if (!employee) return res.status(403).json({ success: false, message: 'Only employees can check out' });

  const settings = await getAttendanceSettings();
  if (settings.faceEnabled === false) {
    return res.status(403).json({
      success: false,
      message: 'Face attendance is currently disabled by your administrator.',
      code: 'FACE_DISABLED',
    });
  }

  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ success: false, message: 'A face photo is required to check out' });
  }

  const today = startOfDay(new Date());
  const record = await prisma.attendance.findFirst({ where: { employeeRefId: employee, date: today } });
  if (!record || !record.checkInTime) {
    return res.status(400).json({
      success: false,
      message: 'You have not checked in today.',
      code: 'NOT_CHECKED_IN',
    });
  }
  if (record.checkOutTime) {
    return res.status(409).json({
      success: false,
      message: 'You have already checked out today.',
      code: 'ALREADY_CHECKED_OUT',
    });
  }

  const checkOutLocation = parseLocation(req.body.location);
  const geofence = evaluateGeofence(settings, checkOutLocation);
  if (!geofence.ok) {
    return res.status(403).json({
      success: false,
      message: geofence.message,
      code: geofence.code,
      data: { distance: geofence.distance, allowed: geofence.allowed },
    });
  }

  const verification = await verifyAgainstProfile({
    employeeId: employee,
    buffer: req.file.buffer,
    clientDescriptor: parseDescriptor(req.body.descriptor),
  });

  if (!verification.ok) {
    return res.status(400).json({ success: false, message: verification.message, code: verification.code, data: verification });
  }

  const now = new Date();
  const ext = req.file.mimetype === 'image/png' ? 'png' : req.file.mimetype === 'image/webp' ? 'webp' : 'jpg';
  const checkOutPhoto = saveBuffer(req.file.buffer, ext);

  const workingHoursMinutes = Math.max(0, Math.round((now - record.checkInTime) / 60000));
  const status = await computeFinalStatus(record.checkInTime, now, record.status);

  const updated = await prisma.attendance.update({
    where: { id: record.id },
    data: {
      checkOutTime: now,
      checkOutPhoto,
      ...(checkOutLocation ? { checkOutLocation } : {}),
      checkOutDistanceFromCompany: geofence.distance,
      checkOutMatchDistance: verification.distance,
      workingHoursMinutes,
      status,
    },
  });

  res.json({
    success: true,
    message: 'Check-out successful',
    data: updated,
    summary: { workingHours: formatDuration(workingHoursMinutes) },
  });
});

// @route  GET /api/attendance  (admin records list, with filters + pagination)
const getRecords = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 10, 1), 100);
  const { date, status, department, search } = req.query;

  const where = {};
  if (date) {
    where.date = { gte: startOfDay(new Date(date)), lt: endOfDay(new Date(date)) };
  }
  if (status && !['Absent', 'On Leave'].includes(status)) where.status = status;

  const employeeWhere = {};
  if (department) employeeWhere.departmentId = department;
  if (search) {
    employeeWhere.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { employeeId: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (Object.keys(employeeWhere).length) {
    const emps = await prisma.employee.findMany({ where: employeeWhere, select: { id: true } });
    where.employeeRefId = { in: emps.map((e) => e.id) };
  }

  const sortField = req.query.sortBy === 'checkInTime' ? 'checkInTime' : 'date';
  const order = req.query.order === 'asc' ? 'asc' : 'desc';

  const [total, records] = await Promise.all([
    prisma.attendance.count({ where }),
    prisma.attendance.findMany({
      where,
      orderBy: [{ [sortField]: order }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            email: true,
            profilePhoto: true,
            department: { select: { id: true, name: true } },
            designation: { select: { id: true, name: true } },
          },
        },
      },
    }),
  ]);

  res.json({
    success: true,
    data: records,
    meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  });
});

// @route  GET /api/attendance/today  (admin + optionally employee view)
const getToday = asyncHandler(async (req, res) => {
  const today = new Date();

  if (req.user.role === 'employee' && req.user.employee) {
    const employees = await prisma.employee.findMany({
      where: { id: req.user.employee },
      select: { id: true, firstName: true, lastName: true, employeeId: true, profilePhoto: true },
    });
    const rows = await computeDayStatus(employees, today);
    return res.json({ success: true, data: { date: toDateKey(today), rows } });
  }

  const reqDate = req.query.date ? new Date(req.query.date) : today;
  const department = req.query.department;

  const where = { status: 'Active' };
  if (department) where.departmentId = department;
  const employees = await prisma.employee.findMany({
    where,
    include: { department: { select: { id: true, name: true } } },
    orderBy: { firstName: 'asc' },
  });

  const rows = await computeDayStatus(employees, reqDate);

  const summarize = (list) => list.reduce(
    (acc, r) => {
      if (r.status in acc) acc[r.status] += 1;
      return acc;
    },
    { Present: 0, Late: 0, Absent: 0, 'On Leave': 0, 'Half Day': 0 }
  );

  const counts = summarize(rows);

  res.json({
    success: true,
    data: {
      date: toDateKey(reqDate),
      totals: {
        totalEmployees: employees.length,
        present: counts.Present,
        late: counts.Late,
        absent: counts.Absent,
        onLeave: counts['On Leave'],
        halfDay: counts['Half Day'],
      },
      rows,
    },
  });
});

// @route  GET /api/attendance/:employeeId?month=&year=  (owner or admin)
const getMonthly = asyncHandler(async (req, res) => {
  const employeeId = req.params.employeeId || req.user.employee;
  if (!employeeId) return res.status(400).json({ success: false, message: 'Employee is required' });

  const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });
  if (req.user.role === 'employee' && String(req.user.employee) !== String(employeeId)) {
    return res.status(403).json({ success: false, message: 'You can only view your own attendance' });
  }

  const y = parseInt(req.query.year, 10) || new Date().getFullYear();
  const m = parseInt(req.query.month, 10) || new Date().getMonth();
  const { start, end } = monthRange(y, m);

  const [records, leaves] = await Promise.all([
    prisma.attendance.findMany({
      where: { employeeRefId: employeeId, date: { gte: start, lt: end } },
      orderBy: { date: 'asc' },
    }),
    prisma.leave.findMany({
      where: {
        employeeRefId: employeeId,
        status: 'Approved',
        startDate: { lt: end },
        endDate: { gte: start },
      },
    }),
  ]);

  const recMap = new Map(records.map((r) => [toDateKey(r.date), r]));
  const leaveDays = new Set();
  leaves.forEach((l) => {
    const d = diffDays(l.startDate, l.endDate);
    for (let i = 0; i < d; i++) {
      const day = new Date(l.startDate);
      day.setDate(l.startDate.getDate() + i);
      leaveDays.add(toDateKey(day));
    }
  });

  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dayDate = new Date(y, m, d);
    const key = toDateKey(dayDate);
    const record = recMap.get(key) || null;
    let status = 'Absent';
    if (isWeekend(dayDate)) status = 'Weekend';
    else if (record) status = record.status;
    else if (leaveDays.has(key)) status = 'On Leave';

    days.push({
      date: key,
      day: d,
      dayName: getDayName(dayDate),
      isWeekend: isWeekend(dayDate),
      status,
      record,
    });
  }

  const presentDays = days.filter((d) => d.record).length;
  const totalHours = records.reduce((s, r) => s + (r.workingHoursMinutes || 0), 0);

  res.json({
    success: true,
    data: {
      employee: {
        id: emp.id,
        _id: emp.id,
        employeeId: emp.employeeId,
        fullName: `${emp.firstName} ${emp.lastName}`.trim(),
      },
      year: y,
      month: m,
      days,
      summary: {
        presentDays,
        absentDays: days.filter((d) => d.status === 'Absent').length,
        lateDays: days.filter((d) => d.status === 'Late').length,
        leaveDays: leaveDays.size,
        weekendDays: days.filter((d) => d.status === 'Weekend').length,
        totalHours,
      },
    },
  });
});

/**
 * Shared attendance marking used by both the employee self-service flow and
 * the admin-mediated flow. `mode` is 'check-in' or 'check-out'. The employee's
 * registered face profile is always verified before a record is created.
 */
async function performMarkAttendance(employeeId, mode, req) {
  if (!employeeId) return { status: 400, message: 'Employee is required' };

  const empDoc = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!empDoc) return { status: 404, message: 'Employee profile not found' };
  if (empDoc.status !== 'Active') {
    return { status: 403, message: 'This employee account is inactive. Please contact HR.' };
  }

  const settings = await getAttendanceSettings();
  if (settings.faceEnabled === false) {
    return {
      status: 403,
      code: 'FACE_DISABLED',
      message: 'Face attendance is currently disabled by your administrator.',
    };
  }

  const location = parseLocation(req.body.location);

  const geofence = evaluateGeofence(settings, location);
  if (!geofence.ok) {
    return { status: 403, code: geofence.code, message: geofence.message, data: { distance: geofence.distance, allowed: geofence.allowed } };
  }
  const distanceFromCompany = geofence.distance;

  if (!req.file || !req.file.buffer) {
    return { status: 400, message: 'A face photo is required to mark attendance' };
  }

  const today = startOfDay(new Date());
  const existing = await prisma.attendance.findFirst({ where: { employeeRefId: employeeId, date: today } });

  if (mode === 'check-in') {
    if (existing && existing.checkInTime && existing.checkOutTime) {
      return { status: 409, message: 'Today\'s attendance is already completed.', code: 'COMPLETED', data: existing };
    }
    if (existing && existing.checkInTime) {
      return {
        status: 409,
        message: `Already checked in today at ${new Date(existing.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Would you like to check out?`,
        code: 'ALREADY_CHECKED_IN',
        data: existing,
      };
    }
  } else {
    if (!existing || !existing.checkInTime) {
      return { status: 400, message: 'This employee has not checked in today.', code: 'NOT_CHECKED_IN' };
    }
    if (existing.checkOutTime) {
      return { status: 409, message: 'This employee has already checked out today.', code: 'ALREADY_CHECKED_OUT' };
    }
  }

  const verification = await verifyAgainstProfile({
    employeeId,
    buffer: req.file.buffer,
    clientDescriptor: parseDescriptor(req.body.descriptor),
  });

  if (!verification.ok) {
    return { status: 400, message: verification.message, code: verification.code, data: verification };
  }

  const faceVerified = true;
  const matchDistance = verification.distance;
  const ext = req.file.mimetype === 'image/png' ? 'png' : req.file.mimetype === 'image/webp' ? 'webp' : 'jpg';
  const photo = saveBuffer(req.file.buffer, ext);

  const now = new Date();
  const deviceInfo = summarizeDevice(req);

  if (mode === 'check-in') {
    const { status, lateMinutes } = await evaluateCheckInStatus(today, now);
    try {
      const record = await prisma.attendance.create({
        data: {
          employeeRefId: employeeId,
          employeeId: empDoc.employeeId,
          date: today,
          dayName: getDayName(today),
          checkInTime: now,
          status,
          lateMinutes,
          checkInPhoto: photo,
          ...(location ? { checkInLocation: location } : {}),
          ...(distanceFromCompany !== null ? { checkInDistanceFromCompany: distanceFromCompany } : {}),
          checkInMatchDistance: matchDistance,
          faceVerified,
          deviceInfo,
        },
      });
      return {
        status: 201,
        message: status === 'Late' ? `Check-in successful. You are late by ${lateMinutes} minutes.` : 'Check-in successful',
        data: record,
      };
    } catch (err) {
      if (err.code === 'P2002') {
        return { status: 409, message: 'This employee has already checked in today.', code: 'ALREADY_CHECKED_IN' };
      }
      throw err;
    }
  }

  const workingHoursMinutes = Math.max(0, Math.round((now - existing.checkInTime) / 60000));
  const status = await computeFinalStatus(existing.checkInTime, now, existing.status);

  const updated = await prisma.attendance.update({
    where: { id: existing.id },
    data: {
      checkOutTime: now,
      checkOutPhoto: photo,
      ...(location ? { checkOutLocation: location } : {}),
      checkOutDistanceFromCompany: distanceFromCompany,
      checkOutMatchDistance: matchDistance,
      faceVerified: existing.faceVerified || faceVerified,
      workingHoursMinutes,
      status,
    },
  });

  return {
    status: 200,
    message: 'Check-out successful',
    data: updated,
    summary: { workingHours: formatDuration(workingHoursMinutes) },
  };
}

function respondAttendance(res, result) {
  const body = { success: result.status < 400, message: result.message };
  if (result.code) body.code = result.code;
  if (result.data) body.data = result.data;
  if (result.summary) body.summary = result.summary;
  return res.status(result.status).json(body);
}

// @route  POST /api/attendance/admin/:employeeId/check-in  (admin only)
const adminCheckIn = asyncHandler(async (req, res) => {
  const result = await performMarkAttendance(String(req.params.employeeId), 'check-in', req);
  return respondAttendance(res, result);
});

// @route  GET /api/attendance/admin/:employeeId/check-out  (admin only)
const adminCheckOut = asyncHandler(async (req, res) => {
  const result = await performMarkAttendance(String(req.params.employeeId), 'check-out', req);
  return respondAttendance(res, result);
});

module.exports = { checkIn, checkOut, getRecords, getToday, getMonthly, computeDayStatus, adminCheckIn, adminCheckOut };
