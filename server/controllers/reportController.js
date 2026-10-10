const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const asyncHandler = require('../utils/asyncHandler');
const {
  startOfDay,
  endOfDay,
  toDateKey,
  isWeekend,
  diffDays,
  formatDuration,
} = require('../utils/date');

// @route  GET /api/attendance/report
const getReport = asyncHandler(async (req, res) => {
  const { from, to, department, employee, status } = req.query;

  const fromDate = from ? startOfDay(new Date(from)) : startOfDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const toDate = to ? endOfDay(new Date(to)) : endOfDay(new Date());

  const rangeDays = diffDays(fromDate, toDate);
  if (rangeDays > 92) {
    return res.status(400).json({ success: false, message: 'Date range is limited to 92 days. Please narrow the range.' });
  }

  const empFilter = { status: 'Active' };
  if (department) empFilter.department = department;
  if (employee) empFilter._id = employee;

  const employees = await Employee.find(empFilter).populate('department', 'name').sort({ firstName: 1 }).lean();

  // all calendar days in range (excluding weekends from "working days")
  const days = [];
  const cursor = new Date(fromDate);
  while (cursor <= toDate) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  const workingDays = days.filter((d) => !isWeekend(d)).length;

  const [attendance, leaves] = await Promise.all([
    Attendance.find({ date: { $gte: fromDate, $lt: toDate }, employee: { $in: employees.map((e) => e._id) } })
      .populate('employee', 'firstName lastName employeeId department')
      .lean(),
    Leave.find({
      status: 'Approved',
      employee: { $in: employees.map((e) => e._id) },
      startDate: { $lt: toDate },
      endDate: { $gte: fromDate },
    }).lean(),
  ]);

  const recKey = (eid, date) => `${eid}__${toDateKey(date)}`;
  const recMap = new Map();
  attendance.forEach((r) => recMap.set(recKey(r.employee._id, r.date), r));

  const leaveKey = (eid) => String(eid);
  const leaveMap = new Map();
  leaves.forEach((l) => {
    const d = diffDays(l.startDate, l.endDate);
    for (let i = 0; i < d; i++) {
      const day = new Date(l.startDate);
      day.setDate(l.startDate.getDate() + i);
      leaveMap.set(`${leaveKey(l.employee._id)}__${toDateKey(day)}`, l);
    }
  });

  // ---- rows (detail) ----
  const includeDetail = req.query.detail === 'true';
  const rows = [];
  if (includeDetail) {
    for (const emp of employees) {
      for (const day of days) {
        const key = recKey(emp._id, day);
        const rec = recMap.get(key);
        if (rec) {
          rows.push({
            employeeId: emp.employeeId,
            employeeName: `${emp.firstName} ${emp.lastName}`,
            department: emp.department ? emp.department.name : '—',
            date: toDateKey(day),
            checkIn: rec.checkInTime,
            checkOut: rec.checkOutTime,
            workingHoursMinutes: rec.workingHoursMinutes,
            status: rec.status,
          });
        } else if (isWeekend(day)) {
          // skip weekends in rows by default
        } else if (leaveMap.has(recKey(emp._id, day))) {
          rows.push({
            employeeId: emp.employeeId,
            employeeName: `${emp.firstName} ${emp.lastName}`,
            department: emp.department ? emp.department.name : '—',
            date: toDateKey(day),
            checkIn: null,
            checkOut: null,
            workingHoursMinutes: 0,
            status: 'On Leave',
          });
        } else {
          rows.push({
            employeeId: emp.employeeId,
            employeeName: `${emp.firstName} ${emp.lastName}`,
            department: emp.department ? emp.department.name : '—',
            date: toDateKey(day),
            checkIn: null,
            checkOut: null,
            workingHoursMinutes: 0,
            status: 'Absent',
          });
        }
      }
    }
  }

  const statusFilter = (s) => (status && status !== s ? false : true);

  const filteredRows = status ? rows.filter((r) => statusFilter(r.status)) : rows;
  if (filteredRows.length > 1000 && includeDetail) {
    filteredRows.splice(1000);
  }

  // ---- metrics ----
  let presentDays = 0;
  let lateDays = 0;
  let absentDays = 0;
  let leaveDays = 0;
  let halfDays = 0;
  let totalMinutes = 0;
  const trendMap = new Map(days.filter((d) => !isWeekend(d)).map((d) => [toDateKey(d), { date: toDateKey(d), present: 0, late: 0, absent: 0, leave: 0 }]));

  for (const emp of employees) {
    for (const day of days) {
      if (isWeekend(day)) continue;
      const key = recKey(emp._id, day);
      const rec = recMap.get(key);
      const trend = trendMap.get(toDateKey(day)) || { date: toDateKey(day), present: 0, late: 0, absent: 0, leave: 0 };

      if (rec) {
        if (rec.status === 'Late') {
          lateDays += 1;
          trend.late += 1;
          trend.present += 1;
        } else if (rec.status === 'Half Day') {
          halfDays += 1;
          trend.present += 1;
        } else {
          presentDays += 1;
          trend.present += 1;
        }
        totalMinutes += rec.workingHoursMinutes || 0;
      } else if (leaveMap.has(key)) {
        leaveDays += 1;
        trend.leave += 1;
      } else {
        absentDays += 1;
        trend.absent += 1;
      }
    }
  }

  const trend = Array.from(trendMap.values());

  const byDepartment = {};
  const deptPresent = {};
  const deptTotal = {};
  for (const emp of employees) {
    const dept = emp.department ? emp.department.name : 'Unassigned';
    deptPresent[dept] = deptPresent[dept] || 0;
    deptTotal[dept] = deptTotal[dept] || 0;
  }
  for (const emp of employees) {
    const dept = emp.department ? emp.department.name : 'Unassigned';
    deptTotal[dept] += days.filter((d) => !isWeekend(d)).length;
  }
  for (const key of trendMap.keys()) {
    const dayRecs = attendance.filter((r) => toDateKey(r.date) === key);
    dayRecs.forEach((r) => {
      const emp = employees.find((e) => String(e._id) === String(r.employee._id));
      if (emp) {
        const dept = emp.department ? emp.department.name : 'Unassigned';
        deptPresent[dept] = (deptPresent[dept] || 0) + 1;
      }
    });
  }
  const deptChart = Object.keys(deptTotal).map((name) => ({
    name,
    present: deptPresent[name] || 0,
    absent: Math.max(0, deptTotal[name] - (deptPresent[name] || 0)),
  }));

  const employeeCount = employees.length;
  const summary = {
    employeesIncluded: employeeCount,
    totalWorkingDays: workingDays,
    presentDays,
    lateDays,
    absentDays,
    halfDays,
    leaveDays,
    averageWorkingHours: formatDuration(employeeCount ? totalMinutes / employeeCount : 0),
    totalHours: formatDuration(totalMinutes),
    range: { from: toDateKey(fromDate), to: toDateKey(toDate) },
  };

  res.json({ success: true, data: { summary, trend, byDepartment: deptChart, rows: filteredRows } });
});

module.exports = { getReport };