const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { startOfDay, toDateKey } = require('../utils/date');

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

  const existing = await prisma.holiday.findUnique({ where: { date: startOfDay(parsed) } });
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
    const clash = await prisma.holiday.findFirst({
      where: { date: startOfDay(parsed), NOT: { id: existing.id } },
    });
    if (clash) return res.status(409).json({ success: false, message: 'Another holiday already exists on that date' });
    data.date = startOfDay(parsed);
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

module.exports = { getHolidays, createHoliday, updateHoliday, deleteHoliday, HOLIDAY_TYPES: TYPES };
