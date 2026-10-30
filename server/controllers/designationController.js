const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');

// @route  GET /api/designations
const getDesignations = asyncHandler(async (req, res) => {
  const designations = await prisma.designation.findMany();
  const counts = await prisma.employee.groupBy({
    by: ['designationId'],
    where: { designationId: { not: null } },
    _count: { _all: true },
  });
  const countMap = new Map(counts.map((c) => [String(c.designationId), c._count._all]));
  const data = designations.map((d) => ({ ...d, employeeCount: countMap.get(String(d.id)) || 0 }));
  res.json({ success: true, data });
});

// @route  POST /api/designations
const createDesignation = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ success: false, message: 'Designation name is required' });
  }
  const exists = await prisma.designation.findFirst({
    where: { name: { equals: String(name).trim(), mode: 'insensitive' } },
  });
  if (exists) return res.status(409).json({ success: false, message: 'A designation with this name already exists' });

  const designation = await prisma.designation.create({
    data: {
      name: String(name).trim(),
      description: String(description || '').trim(),
    },
  });
  res.status(201).json({ success: true, message: 'Designation created', data: designation });
});

// @route  PUT /api/designations/:id
const updateDesignation = asyncHandler(async (req, res) => {
  const designation = await prisma.designation.findUnique({ where: { id: req.params.id } });
  if (!designation) return res.status(404).json({ success: false, message: 'Designation not found' });

  const data = {};
  if (req.body.name) {
    const dup = await prisma.designation.findFirst({
      where: {
        name: { equals: String(req.body.name).trim(), mode: 'insensitive' },
        id: { not: designation.id },
      },
    });
    if (dup) return res.status(409).json({ success: false, message: 'A designation with this name already exists' });
    data.name = String(req.body.name).trim();
  }
  if (req.body.description !== undefined) data.description = String(req.body.description).trim();

  const updated = await prisma.designation.update({ where: { id: designation.id }, data });
  res.json({ success: true, message: 'Designation updated', data: updated });
});

// @route  DELETE /api/designations/:id
const deleteDesignation = asyncHandler(async (req, res) => {
  const designation = await prisma.designation.findUnique({ where: { id: req.params.id } });
  if (!designation) return res.status(404).json({ success: false, message: 'Designation not found' });

  const count = await prisma.employee.count({ where: { designationId: designation.id } });
  if (count > 0) {
    return res.status(409).json({ success: false, message: `Cannot delete: ${count} employee(s) use this designation.` });
  }

  await prisma.designation.delete({ where: { id: designation.id } });
  res.json({ success: true, message: 'Designation deleted' });
});

module.exports = { getDesignations, createDesignation, updateDesignation, deleteDesignation };
