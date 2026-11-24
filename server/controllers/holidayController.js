const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { startOfDay, toDateKey, isSunday } = require('../utils/date');

const TYPES = ['Public', 'Optional', 'Restricted'];

// @route  GET /api/holidays?year=&active=
const getHolidays = asyncHandler(async (req, res) => {
  const where = {};
  const year = parseInt(req.query.year, 10);
  if (Number.isFinite(year)) {
    where.date = { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) };
  }
  if (req.query.active !== undefined) where.active = req.query.active !== 'false';

  const holidays = await prisma.holiday.findMany({ where, orderBy: { date: 'asc' } });
  res.json({ success: true, data: holidays });
});

// @route  POST /api/holidays  (admin)
const createHoliday = asyncHandler(async (req, res) => {
  const { name, date, type, description } = req.body;
  if (!name || !String(name).trim()) return res.status(400).json({ success: false, message: 'Holiday name is required' });
  if (!date) return res.status(400).json({ success: false, message: 'Holiday date is required' });

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return res.status(400).json({ success: false, message: 'Invalid holiday date' });
  const holType = TYPES.includes(type) ? type : 'Public';

  const day = startOfDay(parsed);
  if (isSunday(day)) return res.status(400).json({ success: false, message: 'Every Sunday is a mandatory weekly leave and cannot be changed' });
  const existing = await prisma.holiday.findUnique({ where: { date: day } });
  if (existing) return res.status(409).json({ success: false, message: `A holiday already exists on ${toDateKey(parsed)}` });

  const holiday = await prisma.holiday.create({
    data: {
      name: String(name).trim(),
      date: startOfDay(parsed),
      type: holType,
      description: String(description || '').trim(),
    },
  });
  res.status(201).json({ success: true, message: 'Holiday added', data: holiday });
});

// @route  PUT /api/holidays/:id  (admin)
const updateHoliday = asyncHandler(async (req, res) => {
  const existing = await prisma.holiday.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ success: false, message: 'Holiday not found' });

  const { name, date, type, description, active } = req.body;
  const data = {};
  if (name !== undefined) {
    if (!String(name).trim()) return res.status(400).json({ success: false, message: 'Holiday name is required' });
    data.name = String(name).trim();
  }
  if (date !== undefined) {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return res.status(400).json({ success: false, message: 'Invalid holiday date' });
    const day = startOfDay(parsed);
    if (isSunday(day)) return res.status(400).json({ success: false, message: 'Every Sunday is a mandatory weekly leave and cannot be changed' });
    const clash = await prisma.holiday.findFirst({
      where: { date: day, NOT: { id: existing.id } },
    });
    if (clash) return res.status(409).json({ success: false, message: 'Another holiday already exists on that date' });
    data.date = day;
  }
  if (type !== undefined) data.type = TYPES.includes(type) ? type : existing.type;
  if (description !== undefined) data.description = String(description || '').trim();
  if (active !== undefined) data.active = !!active;

  const holiday = await prisma.holiday.update({ where: { id: existing.id }, data });
  res.json({ success: true, message: 'Holiday updated', data: holiday });
});

// @route  DELETE /api/holidays/:id  (admin)
const deleteHoliday = asyncHandler(async (req, res) => {
  const existing = await prisma.holiday.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ success: false, message: 'Holiday not found' });
  await prisma.holiday.delete({ where: { id: existing.id } });
  res.json({ success: true, message: 'Holiday deleted' });
});

function parseDay(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return startOfDay(parsed);
}

function toDateList(from, to, pattern, interval, alternateDays, weekdays = [], alternateWeekday = 6) {
  const dates = [];
  let cursor = new Date(from);
  let index = 0;
  let weekdayOccurrence = 0;
  const n = Math.max(2, Number(interval) || 2);
  const alt = Math.max(1, Number(alternateDays) || 1);
  const weekSet = new Set((Array.isArray(weekdays) ? weekdays : []).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6));
  const altWeekday = Math.max(0, Math.min(6, Number(alternateWeekday) || 0));

  while (cursor <= to) {
    const weekday = cursor.getDay();
    let include = false;
    if (pattern === 'all') include = true;
    else if (pattern === 'every_n') include = index % n === 0;
    else if (pattern === 'alternate') include = (index % (alt * 2)) < alt;
    else if (pattern === 'weekly_days') include = weekSet.has(weekday);
    else if (pattern === 'alternate_weekday') {
      if (weekday === altWeekday) {
        include = weekdayOccurrence % 2 === 0;
        weekdayOccurrence += 1;
      }
    }
    if (include) dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
    index += 1;
  }
  return dates;
}

// @route  POST /api/holidays/bulk  (admin)
const bulkCreateHolidays = asyncHandler(async (req, res) => {
  const { name, from, to, type, description, active, pattern = 'all', interval = 7, alternateDays = 1, weekdays = [], alternateWeekday = 6 } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ success: false, message: 'Holiday name is required' });
  const fromDay = parseDay(from);
  const toDay = parseDay(to);
  if (!fromDay || !toDay) return res.status(400).json({ success: false, message: 'Valid from/to dates are required' });
  if (fromDay > toDay) return res.status(400).json({ success: false, message: 'From date must be before or equal to To date' });
  if (!['all', 'every_n', 'alternate', 'weekly_days', 'alternate_weekday'].includes(pattern)) {
    return res.status(400).json({ success: false, message: 'Invalid pattern' });
  }
  if (pattern === 'weekly_days') {
    const valid = (Array.isArray(weekdays) ? weekdays : []).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
    if (!valid.length) return res.status(400).json({ success: false, message: 'Select at least one weekday' });
  }

  const dates = toDateList(fromDay, toDay, pattern, interval, alternateDays, weekdays, alternateWeekday);
  if (!dates.length) return res.status(400).json({ success: false, message: 'No dates matched the selected pattern' });
  if (dates.length > 366) return res.status(400).json({ success: false, message: 'Pattern creates too many dates. Reduce the range.' });

  const existing = await prisma.holiday.findMany({
    where: { date: { in: dates } },
    select: { date: true },
  });
  const existingSet = new Set(existing.map((h) => toDateKey(h.date)));

  const holType = TYPES.includes(type) ? type : 'Public';
  const createData = dates
    .filter((d) => !isSunday(d) && !existingSet.has(toDateKey(d)))
    .map((d) => ({
      name: String(name).trim(),
      date: d,
      type: holType,
      description: String(description || '').trim(),
      active: active !== false,
    }));

  let created = 0;
  if (createData.length) {
    const result = await prisma.holiday.createMany({ data: createData, skipDuplicates: true });
    created = result.count || 0;
  }

  res.status(201).json({
    success: true,
    message: `Marked ${created} leave day(s)`,
    created,
    skipped: dates.length - created,
    matched: dates.length,
  });
});

module.exports = { getHolidays, createHoliday, updateHoliday, deleteHoliday, bulkCreateHolidays, HOLIDAY_TYPES: TYPES };
