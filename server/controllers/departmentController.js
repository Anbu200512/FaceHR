const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');

const HEAD_SELECT = { id: true, firstName: true, lastName: true, employeeId: true, profilePhoto: true };

// @route  GET /api/departments
const getDepartments = asyncHandler(async (req, res) => {
  const departments = await prisma.department.findMany({
    include: { head: { select: HEAD_SELECT } },
  });
  const counts = await prisma.employee.groupBy({
    by: ['departmentId'],
    where: { departmentId: { not: null } },
    _count: { _all: true },
  });
  const countMap = new Map(counts.map((c) => [String(c.departmentId), c._count._all]));
  const data = departments.map((d) => ({
    ...d,
    employeeCount: countMap.get(String(d.id)) || 0,
  }));
  res.json({ success: true, data });
});

// @route  POST /api/departments
const createDepartment = asyncHandler(async (req, res) => {
  const { name, description, head } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ success: false, message: 'Department name is required' });
  }
  const exists = await prisma.department.findFirst({
    where: { name: { equals: String(name).trim(), mode: 'insensitive' } },
  });
  if (exists) return res.status(409).json({ success: false, message: 'A department with this name already exists' });

  const department = await prisma.department.create({
    data: {
      name: String(name).trim(),
      description: String(description || '').trim(),
      headId: head || null,
    },
    include: { head: { select: HEAD_SELECT } },
  });
  res.status(201).json({ success: true, message: 'Department created', data: department });
});

// @route  PUT /api/departments/:id
const updateDepartment = asyncHandler(async (req, res) => {
  const department = await prisma.department.findUnique({ where: { id: req.params.id } });
  if (!department) return res.status(404).json({ success: false, message: 'Department not found' });

  const data = {};
  if (req.body.name) {
    const dup = await prisma.department.findFirst({
      where: {
        name: { equals: String(req.body.name).trim(), mode: 'insensitive' },
        id: { not: department.id },
      },
    });
    if (dup) return res.status(409).json({ success: false, message: 'A department with this name already exists' });
    data.name = String(req.body.name).trim();
  }
  if (req.body.description !== undefined) data.description = String(req.body.description).trim();
  if (req.body.head !== undefined) data.headId = req.body.head || null;

  const updated = await prisma.department.update({
    where: { id: department.id },
    data,
    include: { head: { select: HEAD_SELECT } },
  });
  res.json({ success: true, message: 'Department updated', data: updated });
});

// @route  DELETE /api/departments/:id
const deleteDepartment = asyncHandler(async (req, res) => {
  const department = await prisma.department.findUnique({ where: { id: req.params.id } });
  if (!department) return res.status(404).json({ success: false, message: 'Department not found' });

  const count = await prisma.employee.count({ where: { departmentId: department.id } });
  if (count > 0) {
    return res.status(409).json({
      success: false,
      message: `Cannot delete: ${count} employee(s) are still assigned to this department.`,
    });
  }

  await prisma.department.delete({ where: { id: department.id } });
  res.json({ success: true, message: 'Department deleted' });
});

module.exports = { getDepartments, createDepartment, updateDepartment, deleteDepartment };
