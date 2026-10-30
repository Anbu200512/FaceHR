const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');

// @route  GET /api/locations
const getLocations = asyncHandler(async (req, res) => {
  const locations = await prisma.location.findMany({ orderBy: { name: 'asc' } });
  const counts = await prisma.employee.groupBy({
    by: ['officeId'],
    where: { officeId: { not: null } },
    _count: { _all: true },
  });
  const countMap = new Map(counts.map((c) => [String(c.officeId), c._count._all]));
  const data = locations.map((l) => ({
    ...l,
    employeeCount: countMap.get(String(l.id)) || 0,
  }));
  res.json({ success: true, data });
});

// @route  POST /api/locations
const createLocation = asyncHandler(async (req, res) => {
  const { name, address, city, active } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ success: false, message: 'Location name is required' });
  }
  const exists = await prisma.location.findFirst({
    where: { name: { equals: String(name).trim(), mode: 'insensitive' } },
  });
  if (exists) return res.status(409).json({ success: false, message: 'A location with this name already exists' });

  const location = await prisma.location.create({
    data: {
      name: String(name).trim(),
      address: String(address || '').trim(),
      city: String(city || '').trim(),
      active: active === undefined ? true : Boolean(active),
    },
  });
  res.status(201).json({ success: true, message: 'Location created', data: location });
});

// @route  PUT /api/locations/:id
const updateLocation = asyncHandler(async (req, res) => {
  const location = await prisma.location.findUnique({ where: { id: req.params.id } });
  if (!location) return res.status(404).json({ success: false, message: 'Location not found' });

  const data = {};
  if (req.body.name) {
    const dup = await prisma.location.findFirst({
      where: {
        name: { equals: String(req.body.name).trim(), mode: 'insensitive' },
        id: { not: location.id },
      },
    });
    if (dup) return res.status(409).json({ success: false, message: 'A location with this name already exists' });
    data.name = String(req.body.name).trim();
  }
  if (req.body.address !== undefined) data.address = String(req.body.address).trim();
  if (req.body.city !== undefined) data.city = String(req.body.city).trim();
  if (req.body.active !== undefined) data.active = Boolean(req.body.active);

  const updated = await prisma.location.update({ where: { id: location.id }, data });
  res.json({ success: true, message: 'Location updated', data: updated });
});

// @route  DELETE /api/locations/:id
const deleteLocation = asyncHandler(async (req, res) => {
  const location = await prisma.location.findUnique({ where: { id: req.params.id } });
  if (!location) return res.status(404).json({ success: false, message: 'Location not found' });

  const count = await prisma.employee.count({ where: { officeId: location.id } });
  if (count > 0) {
    return res.status(409).json({
      success: false,
      message: `Cannot delete: ${count} employee(s) are still assigned to this location.`,
    });
  }

  await prisma.location.delete({ where: { id: location.id } });
  res.json({ success: true, message: 'Location deleted' });
});

module.exports = { getLocations, createLocation, updateLocation, deleteLocation };
