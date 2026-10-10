const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Employee = require('../models/Employee');
const FaceProfile = require('../models/FaceProfile');
const asyncHandler = require('../utils/asyncHandler');
const { monthRange } = require('../utils/date');

const EMPLOYEE_FIELDS = 'firstName lastName employeeId profilePhoto';

function sanitizeId(value) {
  return value && /^[0-9a-fA-F]{24}$/.test(String(value)) ? value : null;
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
    const filter = { status: 'Active' };
    if (location) filter.office = location;
    if (department) filter.department = department;
    const emps = await Employee.find(filter).select('_id').lean();
    scopeIds = new Set(emps.map((e) => String(e._id)));
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
    Attendance.find({ date: { $gte: since, $lt: until } })
      .sort({ createdAt: -1 })
      .limit(40)
      .populate('employee', EMPLOYEE_FIELDS)
      .lean(),
    Leave.find({ createdAt: { $gte: since, $lt: until } })
      .sort({ updatedAt: -1 })
      .limit(40)
      .populate('employee', EMPLOYEE_FIELDS)
      .lean(),
    Employee.find({ createdAt: { $gte: since, $lt: until } })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    FaceProfile.find({ createdAt: { $gte: since, $lt: until } })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('employee', EMPLOYEE_FIELDS)
      .lean(),
  ]);

  const events = [];

  attendance.forEach((r) => {
    if (!r.employee || !inScope(r.employee._id)) return;
    if (r.checkInTime) {
      events.push({
        id: `check-in_${r._id}`,
        type: 'check-in',
        employee: r.employee,
        description: 'checked in',
        status: r.status,
        time: r.checkInTime,
      });
    }
    if (r.checkOutTime) {
      events.push({
        id: `check-out_${r._id}`,
        type: 'check-out',
        employee: r.employee,
        description: 'checked out',
        status: r.status,
        time: r.checkOutTime,
      });
    }
  });

  leaves.forEach((l) => {
    if (!l.employee || !inScope(l.employee._id)) return;
    if (l.status === 'Pending') {
      events.push({
        id: `leave-submitted_${l._id}`,
        type: 'leave-submitted',
        employee: l.employee,
        description: `submitted a ${l.leaveType} request (${l.days} day${l.days === 1 ? '' : 's'})`,
        status: 'Pending',
        time: l.createdAt,
      });
    } else if (l.status === 'Approved' || l.status === 'Rejected') {
      events.push({
        id: `leave-${l.status.toLowerCase()}_${l._id}`,
        type: l.status === 'Approved' ? 'leave-approved' : 'leave-rejected',
        employee: l.employee,
        description: `${l.leaveType} leave was ${l.status === 'Approved' ? 'approved' : 'rejected'}`,
        status: l.status,
        time: l.updatedAt,
      });
    }
  });

  employees.forEach((e) => {
    if (!inScope(e._id)) return;
    events.push({
      id: `employee_${e._id}`,
      type: 'employee-added',
      employee: e,
      description: 'was added to the team',
      status: 'Active',
      time: e.createdAt,
    });
  });

  faces.forEach((f) => {
    if (!f.employee || !inScope(f.employee._id)) return;
    events.push({
      id: `face_${f._id}`,
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