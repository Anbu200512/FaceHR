const Department = require('../models/Department');
const Employee = require('../models/Employee');
const asyncHandler = require('../utils/asyncHandler');

// @route  GET /api/departments
const getDepartments = asyncHandler(async (req, res) => {
  const departments = await Department.find({})
    .populate('head', 'firstName lastName employeeId profilePhoto')
    .lean();
  const counts = await Employee.aggregate([
    { $match: { department: { $ne: null } } },
    { $group: { _id: '$department', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
  const data = departments.map((d) => ({
    ...d,
    employeeCount: countMap.get(String(d._id)) || 0,
  }));
  res.json({ success: true, data });
});

// @route  POST /api/departments
const createDepartment = asyncHandler(async (req, res) => {
  const { name, description, head } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ success: false, message: 'Department name is required' });
  }
  const exists = await Department.findOne({ name: { $regex: `^${String(name).trim()}$`, $options: 'i' } });
  if (exists) return res.status(409).json({ success: false, message: 'A department with this name already exists' });

  const department = await Department.create({
    name: String(name).trim(),
    description: String(description || '').trim(),
    head: head || null,
  });
  res.status(201).json({ success: true, message: 'Department created', data: await Department.findById(department._id).populate('head', 'firstName lastName') });
});

// @route  PUT /api/departments/:id
const updateDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  if (!department) return res.status(404).json({ success: false, message: 'Department not found' });

  if (req.body.name) {
    const dup = await Department.findOne({ name: { $regex: `^${String(req.body.name).trim()}$`, $options: 'i' }, _id: { $ne: department._id } });
    if (dup) return res.status(409).json({ success: false, message: 'A department with this name already exists' });
    department.name = String(req.body.name).trim();
  }
  if (req.body.description !== undefined) department.description = String(req.body.description).trim();
  if (req.body.head !== undefined) department.head = req.body.head || null;
  await department.save();

  res.json({ success: true, message: 'Department updated', data: await Department.findById(department._id).populate('head', 'firstName lastName employeeId') });
});

// @route  DELETE /api/departments/:id
const deleteDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  if (!department) return res.status(404).json({ success: false, message: 'Department not found' });

  const count = await Employee.countDocuments({ department: department._id });
  if (count > 0) {
    return res.status(409).json({
      success: false,
      message: `Cannot delete: ${count} employee(s) are still assigned to this department.`,
    });
  }

  await department.deleteOne();
  res.json({ success: true, message: 'Department deleted' });
});

module.exports = { getDepartments, createDepartment, updateDepartment, deleteDepartment };