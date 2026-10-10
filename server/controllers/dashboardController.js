const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Resignation = require('../models/Resignation');
const Department = require('../models/Department');
const Location = require('../models/Location');
const asyncHandler = require('../utils/asyncHandler');
const { computeDayStatus } = require('./attendanceController');
const { startOfDay, monthRange, toDateKey, isWeekend, diffDays } = require('../utils/date');

const ALLOWANCE = 12;
const PRESENT_STATUSES = ['Present', 'Late', 'Half Day'];

function sanitizeId(value) {
  return value && /^[0-9a-fA-F]{24}$/.test(String(value)) ? value : null;
}

// Classify a single employee for a single day snapshot.
function classifyDayItem(emp, status) {
  return {
    emp,
    present: PRESENT_STATUSES.includes(status),
    late: status === 'Late',
    absent: status === 'Absent',
    onLeave: status === 'On Leave',
  };
}

// Classify a single employee across a whole month (already materialized days).
function classifyMonthItem(emp, presentDays, lateDays, absentDays, leaveDays) {
  return {
    emp,
    present: presentDays + lateDays > 0,
    late: lateDays > 0,
    absent: presentDays + lateDays === 0 && leaveDays === 0,
    onLeave: leaveDays > 0,
  };
}

function groupBreakdown(items, keyOf, nameOf, { onlyKey } = {}) {
  const map = new Map();
  for (const it of items) {
    const key = keyOf(it);
    if (!map.has(key)) {
      map.set(key, { id: key, name: nameOf(it), employees: 0, present: 0, late: 0, absent: 0, onLeave: 0 });
    }
    const g = map.get(key);
    g.employees += 1;
    if (it.present) g.present += 1;
    if (it.late) g.late += 1;
    if (it.absent) g.absent += 1;
    if (it.onLeave) g.onLeave += 1;
  }
  let rows = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  if (onlyKey) rows = rows.filter((r) => String(r.id) === String(onlyKey));
  return rows;
}

async function computeLeaveSummary(employees, year, monthIndex) {
  const { start, end } = monthRange(year, monthIndex);
  const empIds = employees.map((e) => e._id);

  const [approved, pending] = await Promise.all([
    Leave.find({
      employee: { $in: empIds },
      status: 'Approved',
      startDate: { $lt: end },
      endDate: { $gte: start },
    }).lean(),
    Leave.countDocuments({
      employee: { $in: empIds },
      status: 'Pending',
      startDate: { $lt: end },
      endDate: { $gte: start },
    }),
  ]);

  let used = 0;
  approved.forEach((l) => {
    const s = l.startDate >= start ? l.startDate : start;
    const e = l.endDate < end ? l.endDate : end;
    if (e >= s) used += diffDays(s, e);
  });

  const total = employees.length * ALLOWANCE;
  return {
    allowance: ALLOWANCE,
    total,
    used,
    remaining: Math.max(0, total - used),
    pending,
  };
}

async function computeUpcoming(employees) {
  const empIds = employees.map((e) => e._id);
  const today = startOfDay(new Date());
  const [upcoming, pendingList] = await Promise.all([
    Leave.find({ employee: { $in: empIds }, status: 'Approved', startDate: { $gte: today } })
      .sort({ startDate: 1 })
      .limit(5)
      .populate('employee', 'firstName lastName employeeId profilePhoto')
      .lean(),
    Leave.find({ employee: { $in: empIds }, status: 'Pending' })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('employee', 'firstName lastName employeeId profilePhoto')
      .lean(),
  ]);

  const birthdays = [];
  for (const e of employees) {
    if (!e.dateOfBirth) continue;
    const dob = new Date(e.dateOfBirth);
    if (Number.isNaN(dob.getTime())) continue;
    const next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
    if (next < today) next.setFullYear(next.getFullYear() + 1);
    const days = Math.round((startOfDay(next) - today) / 86400000);
    if (days >= 0 && days <= 7) {
      birthdays.push({
        _id: e._id,
        name: `${e.firstName} ${e.lastName}`.trim(),
        employee: { firstName: e.firstName, lastName: e.lastName, profilePhoto: e.profilePhoto },
        date: next,
        days,
        age: next.getFullYear() - dob.getFullYear(),
      });
    }
  }
  birthdays.sort((a, b) => a.date - b.date);

  return { upcoming, pendingList, birthdays };
}

// Employees who joined during the selected month (organization-wide).
async function getNewJoinersList(start, end) {
  return Employee.find({ status: 'Active', joiningDate: { $gte: start, $lt: end } })
    .sort({ joiningDate: -1 })
    .limit(8)
    .populate('department', 'name')
    .populate('office', 'name')
    .select('firstName lastName profilePhoto employeeId joiningDate department office')
    .lean();
}

// Resignation requests whose resignation date falls in the selected month.
async function getResignationsMonth(start, end) {
  return Resignation.find({ resignationDate: { $gte: start, $lt: end } })
    .sort({ resignationDate: -1, createdAt: -1 })
    .limit(8)
    .populate('employee', 'firstName lastName profilePhoto department')
    .lean();
}

// Monthly new joiners / resignations / net change for the last 6 months ending at the selected month.
async function computeGrowthTrend(year, monthIndex) {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, monthIndex - i, 1);
    months.push({ year: d.getFullYear(), monthIndex: d.getMonth() });
  }

  const [joinersAgg, resignAgg] = await Promise.all([
    Employee.aggregate([
      { $match: { status: 'Active', joiningDate: { $ne: null } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$joiningDate' } }, count: { $sum: 1 } } },
    ]),
    Employee.aggregate([
      { $match: { status: 'Inactive' } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$updatedAt' } }, count: { $sum: 1 } } },
    ]),
  ]);

  const monthKey = (m) => `${m.year}-${String(m.monthIndex + 1).padStart(2, '0')}`;
  const jm = new Map(joinersAgg.map((g) => [g._id, g.count]));
  const rm = new Map(resignAgg.map((g) => [g._id, g.count]));

  return months.map((m) => {
    const k = monthKey(m);
    const newJoiners = jm.get(k) || 0;
    const resignations = rm.get(k) || 0;
    return {
      month: new Date(m.year, m.monthIndex, 1).toLocaleDateString('en', { month: 'short' }),
      year: m.year,
      newJoiners,
      resignations,
      netChange: newJoiners - resignations,
    };
  });
}

async function buildDepartmentRows(items, departmentFilter) {
  const depts = await Department.find({}).sort({ name: 1 }).lean();
  const grouped = groupBreakdown(items, (it) => (it.emp.department?._id ? String(it.emp.department._id) : null), (it) => it.emp.department?.name || 'Unassigned');
  const map = new Map(grouped.map((g) => [String(g.id), g]));

  let rows = depts.map((d) => {
    const g = map.get(String(d._id));
    return {
      id: d._id,
      name: d.name,
      employees: g?.employees || 0,
      present: g?.present || 0,
      late: g?.late || 0,
      absent: g?.absent || 0,
      onLeave: g?.onLeave || 0,
    };
  });
  if (map.has('null')) rows.push({ id: null, name: 'Unassigned', ...map.get('null') });
  if (departmentFilter) rows = rows.filter((r) => String(r.id) === String(departmentFilter));
  return rows;
}

// Org-wide people metrics: gender split, new joiners and resignations for a selected month.
// Resignations are employees deactivated this month (status flips to 'Inactive' on delete/deactivate).
async function computeOrgSummary(employees, year, monthIndex, location, department) {
  const { start, end } = monthRange(year, monthIndex);
  const male = employees.filter((e) => e.gender === 'Male').length;
  const female = employees.filter((e) => e.gender === 'Female').length;
  const other = employees.filter((e) => e.gender === 'Other').length;
  const newJoiners = employees.filter((e) => e.joiningDate && e.joiningDate >= start && e.joiningDate < end).length;

  const resignFilter = { status: 'Inactive', updatedAt: { $gte: start, $lt: end } };
  if (location) resignFilter.office = location;
  if (department) resignFilter.department = department;
  const resignations = await Employee.countDocuments(resignFilter);

  return { male, female, other, newJoiners, resignations };
}

// Most recent resignation requests for the admin dashboard widget.
async function getRecentResignations(limit = 6) {
  return Resignation.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('employee', 'firstName lastName employeeId profilePhoto department')
    .lean();
}

// Organization-wide HR metrics. Employee-derived values respect the selected
// location/department filters; leave-derived counts stay organization-wide.
async function computeHrSummary(year, monthIndex, location, department) {
  const { start, end } = monthRange(year, monthIndex);
  const now = new Date();

  const activeFilter = { status: 'Active' };
  const resignFilter = { status: 'Inactive', updatedAt: { $gte: start, $lt: end } };
  if (location) {
    activeFilter.office = location;
    resignFilter.office = location;
  }
  if (department) {
    activeFilter.department = department;
    resignFilter.department = department;
  }

  const active = await Employee.find(activeFilter).select('gender joiningDate dateOfBirth').lean();

  const totalEmployees = active.length;
  const male = active.filter((e) => e.gender === 'Male').length;
  const female = active.filter((e) => e.gender === 'Female').length;
  const other = active.filter((e) => e.gender === 'Other').length;
  const newJoiners = active.filter((e) => e.joiningDate && e.joiningDate >= start && e.joiningDate < end).length;

  let ageSum = 0;
  let ageCount = 0;
  for (const e of active) {
    if (e.dateOfBirth) {
      const dob = new Date(e.dateOfBirth);
      if (!Number.isNaN(dob.getTime())) {
        ageSum += now.getTime() - dob.getTime();
        ageCount += 1;
      }
    }
  }
  const averageAge = ageCount > 0 ? Math.round((ageSum / ageCount / (365.25 * 24 * 3600 * 1000)) * 10) / 10 : null;

  const [resignations, pendingLeaves, pendingResignations, upcomingApprovedLeaves, onLeaveToday] = await Promise.all([
    Employee.countDocuments(resignFilter),
    Leave.countDocuments({ status: 'Pending' }),
    Resignation.countDocuments({ status: 'Pending' }),
    Leave.countDocuments({ status: 'Approved', startDate: { $gte: startOfDay(now) } }),
    Leave.countDocuments({ status: 'Approved', startDate: { $lte: startOfDay(now) }, endDate: { $gte: startOfDay(now) } }),
  ]);

  return {
    totalEmployees,
    male,
    female,
    other,
    newJoiners,
    resignations,
    averageAge,
    pendingLeaves,
    pendingResignations,
    upcomingApprovedLeaves,
    onLeaveToday,
  };
}

// Resignation requests grouped by reason with count and share (%).
// Filtered to requests whose resignationDate falls within the selected month,
// and (when a location/department filter is active) to employees in that set.
async function getResignationBreakdown(start, end, location, department) {
  const match = { resignationDate: { $gte: start, $lt: end } };
  if (location || department) {
    const empFilter = {};
    if (location) empFilter.office = location;
    if (department) empFilter.department = department;
    const empIds = await Employee.find(empFilter).distinct('_id');
    match.employee = { $in: empIds };
  }
  const grouped = await Resignation.aggregate([
    { $match: match },
    { $group: { _id: '$reason', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  const total = grouped.reduce((s, g) => s + g.count, 0);
  return grouped.map((g) => ({
    reason: g._id,
    count: g.count,
    percent: total > 0 ? Math.round((g.count / total) * 1000) / 10 : 0,
  }));
}

// Age distribution of the given employees (already filtered by the dashboard).
function computeAgeDistribution(employees) {
  const now = new Date();
  const bins = [
    { name: '< 25', min: 0, max: 24 },
    { name: '25-34', min: 25, max: 34 },
    { name: '35-44', min: 35, max: 44 },
    { name: '45-54', min: 45, max: 54 },
    { name: '55+', min: 55, max: 200 },
  ];
  const counts = new Map(bins.map((b) => [b.name, 0]));
  for (const e of employees) {
    if (!e.dateOfBirth) continue;
    const dob = new Date(e.dateOfBirth);
    if (Number.isNaN(dob.getTime())) continue;
    const age = (now.getTime() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
    const bin = bins.find((b) => age >= b.min && age <= b.max);
    if (bin) counts.set(bin.name, counts.get(bin.name) + 1);
  }
  return bins.map((b) => ({ name: b.name, count: counts.get(b.name) }));
}

async function buildLocationRows(items, locationFilter) {
  const locations = await Location.find({ active: true }).sort({ name: 1 }).lean();
  const grouped = groupBreakdown(items, (it) => (it.emp.office?._id ? String(it.emp.office._id) : null), (it) => it.emp.office?.name || 'Unassigned');
  const map = new Map(grouped.map((g) => [String(g.id), g]));

  let rows = locations.map((l) => {
    const g = map.get(String(l._id));
    return {
      id: l._id,
      name: l.name,
      employees: g?.employees || 0,
      present: g?.present || 0,
      late: g?.late || 0,
      absent: g?.absent || 0,
      onLeave: g?.onLeave || 0,
    };
  });
  if (map.has('null')) rows.push({ id: null, name: 'Unassigned', ...map.get('null') });
  if (locationFilter) rows = rows.filter((r) => String(r.id) === String(locationFilter));
  return rows;
}

// @route  GET /api/dashboard?year=&month=&location=&department=
const getDashboard = asyncHandler(async (req, res) => {
  const now = new Date();
  const year = parseInt(req.query.year, 10) || now.getFullYear();
  const month = Math.min(12, Math.max(1, parseInt(req.query.month, 10) || now.getMonth() + 1));
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const monthIndex = month - 1;

  // Future months: no data exists yet — return clean empty state.
  if (year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1)) {
    return res.json({
      success: true,
      data: {
        year,
        month,
        isCurrentMonth: false,
        filters: {},
        summary: { totalEmployees: 0, present: 0, late: 0, absent: 0, onLeave: 0, departmentsCount: 0, male: 0, female: 0, other: 0, newJoiners: 0, resignations: 0 },
        departments: [],
        locations: [],
        resignations: [],
        resignationBreakdown: [],
        hr: {
          totalEmployees: 0,
          male: 0,
          female: 0,
          other: 0,
          newJoiners: 0,
          resignations: 0,
          averageAge: null,
          pendingLeaves: 0,
          pendingResignations: 0,
          upcomingApprovedLeaves: 0,
          onLeaveToday: 0,
        },
        attendance: [],
        attendanceMode: 'month',
        leave: { allowance: ALLOWANCE, total: 0, used: 0, remaining: 0, pending: 0 },
        upcoming: [],
        pendingList: [],
        birthdays: [],
        newJoinersList: [],
        resignationsMonth: [],
        growthTrend: [],
        ageDistribution: [],
      },
    });
  }

  const location = sanitizeId(req.query.location);
  const department = sanitizeId(req.query.department);

  const empFilter = { status: 'Active' };
  if (location) empFilter.office = location;
  if (department) empFilter.department = department;

  const employees = await Employee.find(empFilter)
    .populate('department', 'name')
    .populate('office', 'name')
    .sort({ firstName: 1 })
    .lean();

  // --- Current month: latest applicable (today) snapshot ---
  if (isCurrentMonth) {
    const rows = await computeDayStatus(employees, now);

    // Fallback to the latest record when today has no check-in yet (weekend / before
    // office start) and the employee is not on approved leave today.
    const noRecIds = rows.filter((r) => !r.record && r.status === 'Absent').map((r) => r.employee._id);
    if (noRecIds.length) {
      const latest = await Attendance.aggregate([
        { $match: { employee: { $in: noRecIds } } },
        { $sort: { checkInTime: -1 } },
        { $group: { _id: '$employee', rec: { $first: '$$ROOT' } } },
      ]);
      const latestMap = new Map(latest.map((x) => [String(x._id), x.rec]));
      rows.forEach((r) => {
        const rec = latestMap.get(String(r.employee._id));
        if (rec) r.status = rec.status;
      });
    }

    const items = rows.map((r) => classifyDayItem(r.employee, r.status));

    const summary = {
      totalEmployees: employees.length,
      present: items.filter((i) => i.present).length,
      late: items.filter((i) => i.late).length,
      absent: items.filter((i) => i.absent).length,
      onLeave: items.filter((i) => i.onLeave).length,
    };

    const { start: mStart, end: mEnd } = monthRange(year, monthIndex);
    const ageDistribution = computeAgeDistribution(employees);
    const [departments, locations, leave, upcoming, org, resignations, hr, resignationBreakdown, newJoinersList, resignationsMonth, growthTrend] = await Promise.all([
      buildDepartmentRows(items, department),
      buildLocationRows(items, location),
      computeLeaveSummary(employees, year, monthIndex),
      computeUpcoming(employees),
      computeOrgSummary(employees, year, monthIndex, location, department),
      getRecentResignations(),
      computeHrSummary(year, monthIndex, location, department),
      getResignationBreakdown(mStart, mEnd, location, department),
      getNewJoinersList(mStart, mEnd),
      getResignationsMonth(mStart, mEnd),
      computeGrowthTrend(year, monthIndex),
    ]);

    const [present, late, absent, onLeave] = [summary.present, summary.late, summary.absent, summary.onLeave];
    return res.json({
      success: true,
      data: {
        year,
        month,
        isCurrentMonth,
        filters: { location, department },
        summary: {
          totalEmployees: summary.totalEmployees,
          present,
          late,
          absent,
          onLeave,
          departmentsCount: departments.filter((d) => d.id !== null).length,
          ...org,
        },
        departments,
        locations,
        resignations,
        resignationBreakdown,
        hr,
        attendance: rows,
        attendanceMode: 'day',
        leave,
        upcoming: upcoming.upcoming,
        pendingList: upcoming.pendingList,
        birthdays: upcoming.birthdays,
        newJoinersList,
        resignationsMonth,
        growthTrend,
        ageDistribution,
      },
    });
  }

  // --- Past month: aggregate from that month's records ---
  const { start, end } = monthRange(year, monthIndex);
  const empIds = employees.map((e) => e._id);

  const [records, leaves] = await Promise.all([
    Attendance.find({ employee: { $in: empIds }, date: { $gte: start, $lt: end } })
      .populate('employee', 'firstName lastName employeeId profilePhoto')
      .lean(),
    Leave.find({
      employee: { $in: empIds },
      status: 'Approved',
      startDate: { $lt: end },
      endDate: { $gte: start },
    }).lean(),
  ]);

  const recMapKey = (eid, key) => `${eid}__${key}`;
  const recMap = new Map();
  records.forEach((r) => recMap.set(recMapKey(String(r.employee._id), toDateKey(r.date)), r));

  const leaveDaysByEmp = new Map();
  leaves.forEach((l) => {
    const eid = String(l.employee);
    const d = diffDays(l.startDate, l.endDate);
    for (let i = 0; i < d; i++) {
      const day = new Date(l.startDate);
      day.setDate(l.startDate.getDate() + i);
      if (!leaveDaysByEmp.has(eid)) leaveDaysByEmp.set(eid, new Set());
      leaveDaysByEmp.get(eid).add(toDateKey(day));
    }
  });

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const outcomes = employees.map((emp) => {
    const eid = String(emp._id);
    const leaveSet = leaveDaysByEmp.get(eid) || new Set();
    let presentDays = 0;
    let lateDays = 0;
    let absentDays = 0;
    let leaveDays = 0;
    let workingMinutes = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const day = new Date(year, monthIndex, d);
      if (isWeekend(day)) continue;
      const key = toDateKey(day);
      const rec = recMap.get(recMapKey(eid, key));
      if (rec) {
        workingMinutes += rec.workingHoursMinutes || 0;
        if (rec.status === 'Late') lateDays += 1;
        presentDays += 1;
      } else if (leaveSet.has(key)) {
        leaveDays += 1;
      } else {
        absentDays += 1;
      }
    }
    return { emp, presentDays, lateDays, absentDays, leaveDays, workingMinutes };
  });

  const items = outcomes.map((o) => classifyMonthItem(o.emp, o.presentDays, o.lateDays, o.absentDays, o.leaveDays));

  const summary = {
    totalEmployees: employees.length,
    present: items.filter((i) => i.present).length,
    late: items.filter((i) => i.late).length,
    absent: items.filter((i) => i.absent).length,
    onLeave: items.filter((i) => i.onLeave).length,
  };

  const ageDistribution = computeAgeDistribution(employees);
  const [departments, locations, leave, upcoming, org, resignations, hr, resignationBreakdown, newJoinersList, resignationsMonth, growthTrend] = await Promise.all([
    buildDepartmentRows(items, department),
    buildLocationRows(items, location),
    computeLeaveSummary(employees, year, monthIndex),
    computeUpcoming(employees),
    computeOrgSummary(employees, year, monthIndex, location, department),
    getRecentResignations(),
    computeHrSummary(year, monthIndex, location, department),
    getResignationBreakdown(start, end, location, department),
    getNewJoinersList(start, end),
    getResignationsMonth(start, end),
    computeGrowthTrend(year, monthIndex),
  ]);

  const attendance = outcomes.map((o) => {
    let status = 'Absent';
    if (o.leaveDays > 0 && o.presentDays + o.lateDays === 0) status = 'On Leave';
    else if (o.presentDays + o.lateDays > 0) status = o.lateDays > 0 ? 'Late' : 'Present';
    return {
      employee: o.emp,
      status,
      month: {
        presentDays: o.presentDays,
        lateDays: o.lateDays,
        absentDays: o.absentDays,
        leaveDays: o.leaveDays,
        workingMinutes: o.workingMinutes,
      },
    };
  });

  res.json({
    success: true,
    data: {
      year,
      month,
      isCurrentMonth,
      filters: { location, department },
      summary: {
        totalEmployees: summary.totalEmployees,
        present: summary.present,
        late: summary.late,
        absent: summary.absent,
        onLeave: summary.onLeave,
        departmentsCount: departments.filter((d) => d.id !== null).length,
        ...org,
      },
      departments,
      locations,
      resignations,
      resignationBreakdown,
      hr,
      attendance,
      attendanceMode: 'month',
      leave,
      upcoming: upcoming.upcoming,
      pendingList: upcoming.pendingList,
      birthdays: upcoming.birthdays,
      newJoinersList,
      resignationsMonth,
      growthTrend,
      ageDistribution,
    },
  });
});

module.exports = { getDashboard };