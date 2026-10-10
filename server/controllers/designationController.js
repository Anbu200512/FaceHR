const Designation = require('../models/Designation');
const Employee = require('../models/Employee');
const asyncHandler = require('../utils/asyncHandler');

// @route  GET /api/designations
const getDesignations = asyncHandler(async (req, res) => {
  const designations = await Designation.find({}).lean();
  const counts = await Employee.aggregate([
    { $match: { designation: { $ne: null } } },
    { $group: { _id: '$designation', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
  const data = designations.map((d) => ({ ...d, employeeCount: countMap.get(String(d._id)) || 0 }));
  res.json({ success: true, data });
});

// @route  POST /api/designations
const createDesignation = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ success: false, message: 'Designation name is required' });
  }
  const exists = await Designation.findOne({ name: { $regex: `^${String(name).trim()}$`, $options: 'i' } });
  if (exists) return res.status(409).json({ success: false, message: 'A designation with this name already exists' });

  const designation = await Designation.create({
    name: String(name).trim(),
    description: String(description || '').trim(),
  });
  res.status(201).json({ success: true, message: 'Designation created', data: designation });
});

// @route  PUT /api/designations/:id
const updateDesignation = asyncHandler(async (req, res) => {
  const designation = await Designation.findById(req.params.id);
  if (!designation) return res.status(404).json({ success: false, message: 'Designation not found' });
  if (req.body.name) {
    const dup = await Designation.findOne({ name: { $regex: `^${String(req.body.name).trim()}$`, $options: 'i' }, _id: { $ne: designation._id } });
    if (dup) return res.status(409).json({ success: false, message: 'A designation with this name already exists' });
    designation.name = String(req.body.name).trim();
  }
  if (req.body.description !== undefined) designation.description = String(req.body.description).trim();
  await designation.save();
  res.json({ success: true, message: 'Designation updated', data: designation });
});

// @route  DELETE /api/designations/:id
const deleteDesignation = asyncHandler(async (req, res) => {
  const designation = await Designation.findById(req.params.id);
  if (!designation) return res.status(404).json({ success: false, message: 'Designation not found' });

  const count = await Employee.countDocuments({ designation: designation._id });
  if (count > 0) {
    return res.status(409).json({ success: false, message: `Cannot delete: ${count} employee(s) use this designation.` });
  }

  await designation.deleteOne();
  res.json({ success: true, message: 'Designation deleted' });
});

module.exports = { getDesignations, createDesignation, updateDesignation, deleteDesignation };