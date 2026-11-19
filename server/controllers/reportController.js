const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { getSettings } = require('../services/attendanceService');
const {
  startOfDay,
  endOfDay,
  toDateKey,
  isWeekend,
  diffDays,
  formatDuration,
  parseDateKey,
} = require('../utils/date');

// @route  GET /api/attendance/report
const getReport = asyncHandler(async (req, res) => {
  const { from, to, department, employee, status } = req.query;
  const { officeTimezone: tz = '' } = await getSettings();

  const parseInputDate = (value, fallback) => {
    if (!value) return fallback;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return parseDateKey(value, tz);
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? fallback : d;
  };

  const fromDate = startOfDay(parseInputDate(from, new Date(new Date().getFullYear(), new Date().getMonth(), 1)), tz);
  const toDay = startOfDay(parseInputDate(to, new Date()), tz);
  const toExclusive = endOfDay(toDay, tz);

  const rangeDays = diffDays(fromDate, toDay, tz);
  if (rangeDays > 92) {
    return res.status(400).json({ success: false, message: 'Date range is limited to 92 days. Please narrow the range.' });
  }

  const where = { status: 'Active' };
  if (department) where.departmentId = department;
  if (employee) where.id = employee;

  const employees = await prisma.employee.findMany({
    where,
    include: { department: { select: { id: true, name: true } } },
    relationLoadStrategy: 'join',
    orderBy: { firstName: 'asc' },
  });

  const days = [];
  let cursor = fromDate;
  while (cursor <= toDay) {
    days.push(cursor);
    cursor = startOfDay(new Date(cursor.getTime() + 36 * 3600000), tz);
  }

  const holidays = await prisma.holiday.findMany({
    where: { active: true, date: { gte: fromDate, lte: toDay } },
    select: { date: true },
  });
  const holidaySet = new Set(holidays.map((h) => toDateKey(h.date, tz)));
  const isWorkingDay = (d) => !isWeekend(d, tz) && !holidaySet.has(toDateKey(d, tz));
  const workingDays = days.filter(isWorkingDay);
  const workingDaysInRange = workingDays.length;

  const empIds = employees.map((e) => e.id);
  const [attendance, leaves] = await Promise.all([
    empIds.length
      ? prisma.attendance.findMany({
          where: { date: { gte: fromDate, lt: toExclusive }, employeeRefId: { in: empIds } },
        })
      : [],
    empIds.length
      ? prisma.leave.findMany({
          where: {
            status: 'Approved',
            employeeRefId: { in: empIds },
            startDate: { lt: toExclusive },
            endDate: { gte: fromDate },
          },
        })
      : [],
  ]);

  const recKey = (eid, date) => `${eid}__${toDateKey(date, tz)}`;
  const recMap = new Map();
  attendance.forEach((r) => recMap.set(recKey(r.employeeRefId, r.date), r));

  const leaveMap = new Map();
  leaves.forEach((l) => {
    const lStart = startOfDay(l.startDate, tz);
    const lEnd = startOfDay(l.endDate, tz);
    const start = lStart < fromDate ? fromDate : lStart;
    const end = lEnd > toDay ? toDay : lEnd;
    let c = start;
    while (c <= end) {
      leaveMap.set(`${l.employeeRefId}__${toDateKey(c, tz)}`, l);
      c = startOfDay(new Date(c.getTime() + 36 * 3600000), tz);
    }
  });

  const resolveDay = (empId, day) => {
    const key = recKey(empId, day);
    const rec = recMap.get(key);
    const onLeave = leaveMap.has(key);
    if (onLeave && !(rec && (rec.checkInTime || rec.checkOutTime))) {
      return { status: 'On Leave', rec: rec || null };
    }
    if (rec) return { status: rec.status, rec };
    if (onLeave) return { status: 'On Leave', rec: null };
    return { status: 'Absent', rec: null };
  };

  const includeDetail = req.query.detail === 'true';
  const rows = [];
  if (includeDetail) {
    for (const emp of employees) {
      const empName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || '-';
      const deptName = emp.department ? emp.department.name : '-';
      for (const day of workingDays) {
        const { status: dayStatus, rec } = resolveDay(emp.id, day);
        rows.push({
          employeeId: emp.employeeId,
          employeeName: empName,
          department: deptName,
          date: toDateKey(day, tz),
          checkIn: rec?.checkInTime || null,
          checkOut: rec?.checkOutTime || null,
          workingHoursMinutes: rec?.workingHoursMinutes || 0,
          status: dayStatus,
        });
      }
    }
  }

  const filteredRows = status ? rows.filter((r) => r.status === status) : rows;
  const limitedRows = filteredRows.length > 1000 ? filteredRows.slice(0, 1000) : filteredRows;

  let presentDays = 0;
  let lateDays = 0;
  let absentDays = 0;
  let leaveDays = 0;
  let halfDays = 0;
  let totalMinutes = 0;

  const trendMap = new Map(
    workingDays.map((d) => [toDateKey(d, tz), { date: toDateKey(d, tz), present: 0, late: 0, absent: 0, leave: 0 }])
  );
  const deptStats = new Map();

  for (const emp of employees) {
    const deptName = emp.department ? emp.department.name : 'Unassigned';
    if (!deptStats.has(deptName)) deptStats.set(deptName, { name: deptName, present: 0, leave: 0, absent: 0 });
    const ds = deptStats.get(deptName);

    for (const day of workingDays) {
      const { status: dayStatus, rec } = resolveDay(emp.id, day);
      const trend = trendMap.get(toDateKey(day, tz));

      if (rec) totalMinutes += rec.workingHoursMinutes || 0;
      if (dayStatus === 'Absent') {
        absentDays += 1;
        ds.absent += 1;
        if (trend) trend.absent += 1;
      } else if (dayStatus === 'On Leave') {
        leaveDays += 1;
        ds.leave += 1;
        if (trend) trend.leave += 1;
      } else if (dayStatus === 'Late') {
        lateDays += 1;
        ds.present += 1;
        if (trend) { trend.late += 1; trend.present += 1; }
      } else if (dayStatus === 'Half Day') {
        halfDays += 1;
        ds.present += 1;
        if (trend) trend.present += 1;
      } else if (dayStatus === 'Present') {
        presentDays += 1;
        ds.present += 1;
        if (trend) trend.present += 1;
      }
    }
  }

  const employeeCount = employees.length;
  const summary = {
    employeesIncluded: employeeCount,
    totalWorkingDays: workingDaysInRange,
    presentDays,
    lateDays,
    absentDays,
    halfDays,
    leaveDays,
    averageWorkingHours: formatDuration(employeeCount ? totalMinutes / employeeCount : 0),
    totalHours: formatDuration(totalMinutes),
    range: { from: toDateKey(fromDate, tz), to: toDateKey(toDay, tz) },
  };

  res.json({
    success: true,
    data: {
      summary,
      trend: Array.from(trendMap.values()),
      byDepartment: Array.from(deptStats.values()),
      rows: limitedRows,
    },
  });
});

module.exports = { getReport };
