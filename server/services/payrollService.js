const prisma = require('../config/prisma');
const { startOfDay, toDateKey } = require('../utils/date');
const { getHolidayKeySet, listWorkingDates } = require('./leavePolicyService');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (v) => Math.round(v * 100) / 100;

function dateKeyRange(start, end) {
  const keys = [];
  const cursor = startOfDay(start);
  const last = startOfDay(end);
  while (cursor <= last) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

function summarizeSalary(employee) {
  const salary = employee.salary || {};
  const basic = num(salary.basicSalary ?? salary.basic);
  const hra = num(salary.hra);
  const specialAllowance = num(salary.specialAllowance);
  const otherAllowance = num(salary.otherAllowance);

  let gross = num(salary.monthlyGross);
  if (!gross) gross = basic + hra + specialAllowance + otherAllowance;
  if (!gross) gross = num(salary.netPay) + num(salary.monthlyDeductions);

  return { salary, basic, hra, specialAllowance, otherAllowance, gross };
}

async function buildPayslip(employee, month, year, workingDates) {
  const { salary, basic, hra, specialAllowance, otherAllowance, gross } = summarizeSalary(employee);

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

  const [attendance, leaves] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        employeeRefId: employee.id,
        date: { gte: startOfDay(monthStart), lt: new Date(year, month, 1) },
      },
      select: { date: true, status: true, checkInTime: true },
    }),
    prisma.leave.findMany({
      where: {
        employeeRefId: employee.id,
        status: 'Approved',
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
      },
      select: { leaveType: true, startDate: true, endDate: true },
    }),
  ]);

  const dateKeys = new Set(workingDates.map((d) => toDateKey(d)));
  const presentSet = new Set();
  for (const a of attendance) {
    if (a.checkInTime && ['Present', 'Late', 'Half Day'].includes(a.status)) {
      presentSet.add(toDateKey(a.date));
    }
  }

  const leaveSet = new Set();
  for (const l of leaves) {
    if (l.leaveType === 'Unpaid Leave') continue;
    const from = new Date(Math.max(new Date(l.startDate).getTime(), monthStart.getTime()));
    const to = new Date(Math.min(new Date(l.endDate).getTime(), monthEnd.getTime()));
    for (const key of dateKeyRange(from, to)) {
      if (dateKeys.has(key) && !presentSet.has(key)) leaveSet.add(key);
    }
  }

  let presentDays = 0;
  let paidLeaveDays = 0;
  let lopDays = 0;
  for (const key of dateKeys) {
    if (presentSet.has(key)) presentDays += 1;
    else if (leaveSet.has(key)) paidLeaveDays += 1;
    else lopDays += 1;
  }

  const workingDays = workingDates.length;
  const perDay = workingDays ? gross / workingDays : 0;
  const lopAmount = round2(perDay * lopDays);
  const baseDeductions = num(salary.monthlyDeductions);
  const deductions = round2(baseDeductions + lopAmount);
  const netPay = Math.max(0, round2(gross - deductions));

  return {
    employeeRefId: employee.id,
    employeeId: employee.employeeId,
    currency: salary.currency || 'INR',
    basic,
    hra,
    specialAllowance,
    otherAllowance,
    gross: round2(gross),
    deductions,
    pf: 0,
    tax: 0,
    lopDays,
    lopAmount,
    netPay,
    presentDays,
    workingDays,
    breakdown: {
      attendance: { presentDays, paidLeaveDays, lopDays, workingDays },
      allowances: { basic, hra, specialAllowance, otherAllowance },
      deductions: { base: baseDeductions, lossOfPay: lopAmount },
      paidLeaveDays,
    },
  };
}

async function generatePayroll({ month, year, adminId, notes }) {
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (!Number.isFinite(m) || m < 1 || m > 12) {
    const err = new Error('Month must be between 1 and 12');
    err.statusCode = 400;
    throw err;
  }
  if (!Number.isFinite(y) || y < 2000 || y > 2100) {
    const err = new Error('Enter a valid year');
    err.statusCode = 400;
    throw err;
  }

  const monthStart = new Date(y, m - 1, 1);
  if (monthStart > startOfDay(new Date())) {
    const err = new Error('Payroll cannot be generated for a future month');
    err.statusCode = 400;
    throw err;
  }

  const existing = await prisma.payrollRun.findUnique({ where: { month_year: { month: m, year: y } } });
  if (existing && existing.status === 'Paid') {
    const err = new Error('This payroll has already been paid and cannot be regenerated');
    err.statusCode = 400;
    throw err;
  }

  const monthEnd = new Date(y, m, 0);
  const holidaySet = await getHolidayKeySet(monthStart, monthEnd);
  const workingDates = await listWorkingDates(monthStart, monthEnd, holidaySet);

  const employees = await prisma.employee.findMany({
    where: { status: 'Active' },
    orderBy: { employeeId: 'asc' },
  });

  // Employees who joined after this month must not get a zero-value payslip.
  const employed = employees.filter((emp) => !emp.joiningDate || startOfDay(emp.joiningDate) <= monthEnd);
  if (!employed.length) {
    const err = new Error(`No active employees were employed during ${MONTHS[m - 1]} ${y}`);
    err.statusCode = 400;
    throw err;
  }

  // Never create zero-value payslips: payroll needs a basic salary and gross.
  const missingSalary = employed.filter((emp) => {
    const { basic, gross } = summarizeSalary(emp);
    return basic <= 0 || gross <= 0;
  });
  if (missingSalary.length) {
    const names = missingSalary
      .slice(0, 5)
      .map((e) => `${e.firstName} ${e.lastName} (${e.employeeId})`)
      .join(', ');
    const extra = missingSalary.length > 5 ? ` and ${missingSalary.length - 5} more` : '';
    const err = new Error(
      `Set basic salary for ${missingSalary.length} active employee(s) before generating payroll: ${names}${extra}. Open Employees, select the employee, then use the Salary tab.`
    );
    err.statusCode = 400;
    throw err;
  }

  const payslips = await Promise.all(employed.map((emp) => buildPayslip(emp, m, y, workingDates)));

  const totals = payslips.reduce(
    (acc, p) => {
      acc.gross += p.gross;
      acc.deductions += p.deductions;
      acc.net += p.netPay;
      return acc;
    },
    { gross: 0, deductions: 0, net: 0 }
  );

  return prisma.$transaction(async (tx) => {
    const run = existing
      ? await tx.payrollRun.update({
          where: { id: existing.id },
          data: {
            status: 'Processed',
            notes: String(notes || '').trim(),
            totalGross: round2(totals.gross),
            totalDeductions: round2(totals.deductions),
            totalNet: round2(totals.net),
            processedById: adminId,
          },
        })
      : await tx.payrollRun.create({
          data: {
            month: m,
            year: y,
            status: 'Processed',
            notes: String(notes || '').trim(),
            totalGross: round2(totals.gross),
            totalDeductions: round2(totals.deductions),
            totalNet: round2(totals.net),
            processedById: adminId,
          },
        });

    await tx.payslip.deleteMany({ where: { payrollRunId: run.id } });
    if (payslips.length) {
      await tx.payslip.createMany({
        data: payslips.map((p) => ({ ...p, payrollRunId: run.id, month: m, year: y })),
      });
    }

    return tx.payrollRun.findUnique({
      where: { id: run.id },
      include: {
        processedBy: { select: { id: true, name: true } },
        payslips: {
          orderBy: { employeeId: 'asc' },
          include: { employee: { select: { firstName: true, lastName: true, department: { select: { name: true } } } } },
        },
      },
    });
  });
}

module.exports = { generatePayroll, round2 };
