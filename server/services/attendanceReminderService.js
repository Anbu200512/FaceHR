const prisma = require('../config/prisma');
const { createNotification } = require('./notificationService');
const { getEffectiveOfficeSettings } = require('./attendanceService');
const { startOfDay, endOfDay, toDateKey, isWeekend, parseTimeToMinutes } = require('../utils/date');

const REMINDER_INTERVAL_MS = 15 * 60 * 1000;
const CHECKIN_BUFFER_MIN = 30;
const CHECKOUT_BUFFER_MIN = 30;

async function runAttendanceReminders(now = new Date()) {
  const day = startOfDay(now);
  const dayKey = toDateKey(day);
  if (isWeekend(day)) return { created: 0, skipped: 'weekend' };

  const holiday = await prisma.holiday.findFirst({
    where: { date: day, active: true },
    select: { id: true },
  });
  if (holiday) return { created: 0, skipped: 'holiday' };

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const users = await prisma.user.findMany({
    where: { role: 'employee', active: true, employeeRefId: { not: null } },
    select: {
      id: true,
      employeeRefId: true,
      employeeRef: {
        select: {
          id: true,
          status: true,
          attendanceSettings: true,
        },
      },
    },
  });
  const active = users.filter((u) => u.employeeRef && u.employeeRef.status === 'Active');
  if (!active.length) return { created: 0 };

  const employeeIds = active.map((u) => u.employeeRefId);

  const [records, leaves, existing] = await Promise.all([
    prisma.attendance.findMany({
      where: { employeeRefId: { in: employeeIds }, date: day },
      select: { employeeRefId: true, checkInTime: true, checkOutTime: true },
    }),
    prisma.leave.findMany({
      where: {
        employeeRefId: { in: employeeIds },
        status: 'Approved',
        startDate: { lte: endOfDay(day) },
        endDate: { gte: day },
      },
      select: { employeeRefId: true },
    }),
    prisma.notification.findMany({
      where: {
        userId: { in: active.map((u) => u.id) },
        createdAt: { gte: day, lt: endOfDay(day) },
        link: '/employee/attendance',
        title: { in: ['Check-in reminder', 'Check-out reminder'] },
      },
      select: { userId: true, title: true },
    }),
  ]);

  const recMap = new Map(records.map((r) => [String(r.employeeRefId), r]));
  const leaveSet = new Set(leaves.map((l) => String(l.employeeRefId)));
  const sentSet = new Set(existing.map((n) => `${n.userId}|${n.title}`));

  let created = 0;
  for (const u of active) {
    const empId = String(u.employeeRefId);
    if (leaveSet.has(empId)) continue;
    const rec = recMap.get(empId);
    const settings = await getEffectiveOfficeSettings(u.employeeRef);
    const startMin = parseTimeToMinutes(settings.officeStartTime);
    const endMin = parseTimeToMinutes(settings.officeEndTime);
    if (startMin === null || endMin === null) continue;

    // Not checked in reminder
    if (!rec?.checkInTime) {
      const remindAfter = startMin + (Number(settings.graceMinutes) || 0) + CHECKIN_BUFFER_MIN;
      if (nowMinutes >= remindAfter && nowMinutes < endMin) {
        const key = `${u.id}|Check-in reminder`;
        if (!sentSet.has(key)) {
          await createNotification({
            user: u.id,
            title: 'Check-in reminder',
            message: `You have not checked in today (${dayKey}). Your shift starts at ${settings.officeStartTime}${settings.graceMinutes ? ` with ${settings.graceMinutes} min grace` : ''}. Please check in when you arrive.`,
            type: 'warning',
            link: '/employee/attendance',
          });
          sentSet.add(key);
          created += 1;
        }
      }
      continue;
    }

    // Not checked out reminder
    if (rec.checkInTime && !rec.checkOutTime) {
      const remindAfter = endMin + CHECKOUT_BUFFER_MIN;
      if (nowMinutes >= remindAfter) {
        const key = `${u.id}|Check-out reminder`;
        if (!sentSet.has(key)) {
          await createNotification({
            user: u.id,
            title: 'Check-out reminder',
            message: `You checked in today but have not checked out yet. Your shift ends at ${settings.officeEndTime}. Please check out when you finish work.`,
            type: 'warning',
            link: '/employee/attendance',
          });
          sentSet.add(key);
          created += 1;
        }
      }
    }
  }

  return { created };
}

function startAttendanceReminders() {
  const run = () => {
    runAttendanceReminders().catch((err) => {
      console.error('[AttendanceReminders] Failed:', err.message);
    });
  };
  run();
  setInterval(run, REMINDER_INTERVAL_MS).unref();
}

module.exports = { runAttendanceReminders, startAttendanceReminders };