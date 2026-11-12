const prisma = require('../config/prisma');
const { startOfDay, toDateKey, isWeekend } = require('../utils/date');

const DEFAULT_POLICIES = [
  { leaveType: 'Casual Leave', annualAllowance: 12, accrual: 'yearly', carryForward: false, maxCarryForward: 0 },
  { leaveType: 'Sick Leave', annualAllowance: 10, accrual: 'yearly', carryForward: false, maxCarryForward: 0 },
  { leaveType: 'Earned Leave', annualAllowance: 15, accrual: 'yearly', carryForward: true, maxCarryForward: 5 },
  { leaveType: 'Maternity Leave', annualAllowance: 90, accrual: 'none', carryForward: false, maxCarryForward: 0 },
  { leaveType: 'Paternity Leave', annualAllowance: 5, accrual: 'none', carryForward: false, maxCarryForward: 0 },
  { leaveType: 'Unpaid Leave', annualAllowance: 0, accrual: 'none', carryForward: false, maxCarryForward: 0 },
  { leaveType: 'Other', annualAllowance: 0, accrual: 'none', carryForward: false, maxCarryForward: 0 },
];

const FALLBACK_POLICY = { leaveType: 'Other', annualAllowance: 12, accrual: 'yearly', carryForward: false, maxCarryForward: 0, active: true };

async function seedDefaultPolicies() {
  const count = await prisma.leavePolicy.count();
  if (count === 0) {
    await prisma.leavePolicy.createMany({ data: DEFAULT_POLICIES });
    console.log('[Seed] Default leave policies created');
  }
}

async function listPolicies() {
  return prisma.leavePolicy.findMany({ orderBy: { leaveType: 'asc' } });
}

async function getPolicy(leaveType) {
  const policy = await prisma.leavePolicy.findUnique({ where: { leaveType } });
  if (!policy) return { ...FALLBACK_POLICY, leaveType };
  return policy;
}

async function getHolidayKeySet(start, end) {
  const rows = await prisma.holiday.findMany({
    where: { active: true, date: { gte: startOfDay(start), lte: startOfDay(end) } },
    select: { date: true },
  });
  return new Set(rows.map((r) => toDateKey(r.date)));
}

/** Inclusive count of business days in [start, end], excluding weekends and holidays. */
async function countWorkingDays(start, end, holidaySet) {
  const s = startOfDay(start);
  const e = startOfDay(end);
  if (e < s) return 0;
  const holidays = holidaySet || (await getHolidayKeySet(s, e));
  let count = 0;
  const cursor = new Date(s);
  while (cursor <= e) {
    if (!isWeekend(cursor) && !holidays.has(toDateKey(cursor))) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/** List of business-day Date objects in [start, end], excluding weekends and holidays. */
async function listWorkingDates(start, end, holidaySet) {
  const s = startOfDay(start);
  const e = startOfDay(end);
  const holidays = holidaySet || (await getHolidayKeySet(s, e));
  const dates = [];
  const cursor = new Date(s);
  while (cursor <= e) {
    if (!isWeekend(cursor) && !holidays.has(toDateKey(cursor))) dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function sumDays(leaves, type) {
  return leaves.filter((l) => l.leaveType === type).reduce((s, l) => s + l.days, 0);
}

async function computeLeaveBalance(employeeRefId, year) {
  const policies = await prisma.leavePolicy.findMany({ where: { active: true }, orderBy: { leaveType: 'asc' } });
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const prevStart = new Date(year - 1, 0, 1);

  const [current, previousYear] = await Promise.all([
    prisma.leave.findMany({
      where: { employeeRefId, startDate: { lt: end }, endDate: { gte: start } },
    }),
    prisma.leave.findMany({
      where: { employeeRefId, status: 'Approved', startDate: { lt: start }, endDate: { gte: prevStart } },
    }),
  ]);

  const approved = current.filter((l) => l.status === 'Approved');
  const pendingLeaves = current.filter((l) => l.status === 'Pending');

  const knownTypes = new Set(policies.map((p) => p.leaveType));
  const extraTypes = [...new Set(current.map((l) => l.leaveType))].filter((t) => !knownTypes.has(t));

  const allPolicies = [
    ...policies,
    ...extraTypes.map((t) => ({ leaveType: t, annualAllowance: 0, carryForward: false, maxCarryForward: 0 })),
  ];

  const breakdown = allPolicies.map((p) => {
    const used = sumDays(approved, p.leaveType);
    const pending = sumDays(pendingLeaves, p.leaveType);
    let carry = 0;
    if (p.carryForward && p.maxCarryForward > 0) {
      const prevUsed = sumDays(previousYear, p.leaveType);
      const prevRemaining = Math.max(0, p.annualAllowance - prevUsed);
      carry = Math.min(prevRemaining, p.maxCarryForward);
    }
    const allowance = p.annualAllowance + carry;
    const unlimited = p.annualAllowance === 0;
    return {
      leaveType: p.leaveType,
      allowance,
      carryForward: carry,
      used,
      pending,
      remaining: unlimited ? null : Math.max(0, allowance - used - pending),
      unlimited,
    };
  });

  const allowance = breakdown.reduce((s, b) => s + b.allowance, 0);
  const used = breakdown.reduce((s, b) => s + b.used, 0);
  const pending = breakdown.reduce((s, b) => s + b.pending, 0);
  const breakdownByType = approved.reduce((acc, l) => {
    acc[l.leaveType] = (acc[l.leaveType] || 0) + l.days;
    return acc;
  }, {});

  return {
    year,
    allowance,
    used,
    pending,
    remaining: Math.max(0, allowance - used - pending),
    breakdown: breakdownByType,
    policies: breakdown,
  };
}

module.exports = {
  DEFAULT_POLICIES,
  FALLBACK_POLICY,
  seedDefaultPolicies,
  listPolicies,
  getPolicy,
  getHolidayKeySet,
  countWorkingDays,
  listWorkingDates,
  computeLeaveBalance,
};
