const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { monthRange } = require('../utils/date');

const EMPLOYEE_SELECT = { id: true, firstName: true, lastName: true, employeeId: true, profilePhoto: true };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeId(value) {
  return value && UUID_RE.test(String(value)) ? String(value) : null;
}

// @route  GET /api/activity?limit=&year=&month=&location=&department=
const getActivity = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 15, 50);
  const year = parseInt(req.query.year, 10);
  const month = parseInt(req.query.month, 10);
  const location = sanitizeId(req.query.location);
  const department = sanitizeId(req.query.department);

  // Narrow the feed to employees matching the location/department filters.
  let scopeIds = null;
  if (location || department) {
    const emps = await prisma.employee.findMany({
      where: {
        status: 'Active',
        ...(location ? { officeId: location } : {}),
        ...(department ? { departmentId: department } : {}),
      },
      select: { id: true },
    });
    scopeIds = new Set(emps.map((e) => e.id));
  }
  const inScope = scopeIds ? (id) => scopeIds.has(String(id)) : () => true;

  // Time window: a chosen month (this year) or the last 30 days when browsing current data.
  let since;
  let until;
  if (month && year) {
    const { start, end } = monthRange(year, month - 1);
    since = start;
    until = end;
  } else {
    until = new Date();
    since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }

  const [attendance, leaves, employees, faces] = await Promise.all([
    prisma.attendance.findMany({
      where: { date: { gte: since, lt: until } },
      orderBy: { createdAt: 'desc' },
      take: 40,
      include: { employee: { select: EMPLOYEE_SELECT } },
    }),
    prisma.leave.findMany({
      where: { createdAt: { gte: since, lt: until } },
      orderBy: { updatedAt: 'desc' },
      take: 40,
      include: { employee: { select: EMPLOYEE_SELECT } },
    }),
    prisma.employee.findMany({
      where: { createdAt: { gte: since, lt: until } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: EMPLOYEE_SELECT,
    }),
    prisma.faceProfile.findMany({
      where: { createdAt: { gte: since, lt: until } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { employee: { select: EMPLOYEE_SELECT } },
    }),
  ]);

  const events = [];

  attendance.forEach((r) => {
    if (!r.employee || !inScope(r.employee.id)) return;
    if (r.checkInTime) {
      events.push({
        id: `check-in_${r.id}`,
        type: 'check-in',
        employee: r.employee,
        description: 'checked in',
        status: r.status,
        time: r.checkInTime,
      });
    }
    if (r.checkOutTime) {
      events.push({
        id: `check-out_${r.id}`,
        type: 'check-out',
        employee: r.employee,
        description: 'checked out',
        status: r.status,
        time: r.checkOutTime,
      });
    }
  });

  leaves.forEach((l) => {
    if (!l.employee || !inScope(l.employee.id)) return;
    if (l.status === 'Pending') {
      events.push({
        id: `leave-submitted_${l.id}`,
        type: 'leave-submitted',
        employee: l.employee,
        description: `submitted a ${l.leaveType} request (${l.days} day${l.days === 1 ? '' : 's'})`,
        status: 'Pending',
        time: l.createdAt,
      });
    } else if (l.status === 'Approved' || l.status === 'Rejected') {
      events.push({
        id: `leave-${l.status.toLowerCase()}_${l.id}`,
        type: l.status === 'Approved' ? 'leave-approved' : 'leave-rejected',
        employee: l.employee,
        description: `${l.leaveType} leave was ${l.status === 'Approved' ? 'approved' : 'rejected'}`,
        status: l.status,
        time: l.updatedAt,
      });
    }
  });

  employees.forEach((e) => {
    if (!inScope(e.id)) return;
    events.push({
      id: `employee_${e.id}`,
      type: 'employee-added',
      employee: e,
      description: 'was added to the team',
      status: 'Active',
      time: e.createdAt,
    });
  });

  faces.forEach((f) => {
    if (!f.employee || !inScope(f.employee.id)) return;
    events.push({
      id: `face_${f.id}`,
      type: 'face-registered',
      employee: f.employee,
      description: 'completed face registration',
      status: 'Registered',
      time: f.createdAt,
    });
  });

  events.sort((a, b) => new Date(b.time) - new Date(a.time));

  res.json({ success: true, data: events.slice(0, limit) });
});

module.exports = { getActivity };
