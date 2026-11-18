const prisma = require('../config/prisma');
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

  const fromDate = from
    ? startOfDay(new Date(from))
    : startOfDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const toDay = to ? startOfDay(new Date(to)) : startOfDay(new Date());
  const toExclusive = endOfDay(toDay);

  const rangeDays = diffDays(fromDate, toDay);
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
  const cursor = new Date(fromDate);
  while (cursor <= toDay) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  const workingDaysInRange = days.filter((d) => !isWeekend(d)).length;

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

  const recKey = (eid, date) => `${eid}__${toDateKey(date)}`;
  const recMap = new Map();
  attendance.forEach((r) => recMap.set(recKey(r.employeeRefId, r.date), r));

  const leaveMap = new Map();
  leaves.forEach((l) => {
    const lStart = startOfDay(l.startDate);
    const lEnd = startOfDay(l.endDate);
    const count = diffDays(lStart, lEnd);
    for (let i = 0; i < count; i++) {
      const day = new Date(lStart);
      day.setDate(lStart.getDate() + i);
      leaveMap.set(`${l.employeeRefId}__${toDateKey(day)}`, l);
    }
  });

  const includeDetail = req.query.detail === 'true';
  const rows = [];
  if (includeDetail) {
    for (const emp of employees) {
      const empName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || '-';
      const deptName = emp.department ? emp.department.name : '-';
      for (const day of days) {
        if (isWeekend(day)) continue;
        const key = recKey(emp.id, day);
        const rec = recMap.get(key);
        if (rec) {
          rows.push({
            employeeId: emp.employeeId,
            employeeName: empName,
            department: deptName,
            date: toDateKey(day),
            checkIn: rec.checkInTime,
            checkOut: rec.checkOutTime,
            workingHoursMinutes: rec.workingHoursMinutes || 0,
            status: rec.status,
          });
        } else if (leaveMap.has(key)) {
          rows.push({
            employeeId: emp.employeeId,
            employeeName: empName,
            department: deptName,
            date: toDateKey(day),
            checkIn: null,
            checkOut: null,
            workingHoursMinutes: 0,
            status: 'On Leave',
          });
        } else {
          rows.push({
            employeeId: emp.employeeId,
            employeeName: empName,
            department: deptName,
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

  const filteredRows = status ? rows.filter((r) => r.status === status) : rows;
  const limitedRows = filteredRows.length > 1000 ? filteredRows.slice(0, 1000) : filteredRows;

  let presentDays = 0;
  let lateDays = 0;
  let absentDays = 0;
  let leaveDays = 0;
  let halfDays = 0;
  let totalMinutes = 0;

  const trendMap = new Map(
    days.filter((d) => !isWeekend(d)).map((d) => [toDateKey(d), { date: toDateKey(d), present: 0, late: 0, absent: 0, leave: 0 }])
  );
  const deptStats = new Map();

  for (const emp of employees) {
    const deptName = emp.department ? emp.department.name : 'Unassigned';
    if (!deptStats.has(deptName)) deptStats.set(deptName, { name: deptName, present: 0, leave: 0, absent: 0 });
    const ds = deptStats.get(deptName);

    for (const day of days) {
      if (isWeekend(day)) continue;
      const key = recKey(emp.id, day);
      const rec = recMap.get(key);
      const trend = trendMap.get(toDateKey(day));

      if (rec) {
        totalMinutes += rec.workingHoursMinutes || 0;
        if (rec.status === 'Absent') {
          absentDays += 1;
          ds.absent += 1;
          if (trend) trend.absent += 1;
        } else if (rec.status === 'On Leave') {
          leaveDays += 1;
          ds.leave += 1;
          if (trend) trend.leave += 1;
        } else if (rec.status === 'Late') {
          lateDays += 1;
          ds.present += 1;
          if (trend) { trend.late += 1; trend.present += 1; }
        } else if (rec.status === 'Half Day') {
          halfDays += 1;
          ds.present += 1;
          if (trend) trend.present += 1;
        } else {
          presentDays += 1;
          ds.present += 1;
          if (trend) trend.present += 1;
        }
      } else if (leaveMap.has(key)) {
        leaveDays += 1;
        ds.leave += 1;
        if (trend) trend.leave += 1;
      } else {
        absentDays += 1;
        ds.absent += 1;
        if (trend) trend.absent += 1;
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
    range: { from: toDateKey(fromDate), to: toDateKey(toDay) },
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
