const Location = require('../models/Location');
const Employee = require('../models/Employee');
const asyncHandler = require('../utils/asyncHandler');

// @route  GET /api/locations
const getLocations = asyncHandler(async (req, res) => {
  const locations = await Location.find({}).sort({ name: 1 }).lean();
  const counts = await Employee.aggregate([
    { $match: { office: { $ne: null } } },
    { $group: { _id: '$office', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
  const data = locations.map((l) => ({
    ...l,
    employeeCount: countMap.get(String(l._id)) || 0,
  }));
  res.json({ success: true, data });
});

// @route  POST /api/locations
const createLocation = asyncHandler(async (req, res) => {
  const { name, address, city, active } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ success: false, message: 'Location name is required' });
  }
  const exists = await Location.findOne({ name: { $regex: `^${String(name).trim()}$`, $options: 'i' } });
  if (exists) return res.status(409).json({ success: false, message: 'A location with this name already exists' });

  const location = await Location.create({
    name: String(name).trim(),
    address: String(address || '').trim(),
    city: String(city || '').trim(),
    active: active === undefined ? true : Boolean(active),
  });
  res.status(201).json({ success: true, message: 'Location created', data: location });
});

// @route  PUT /api/locations/:id
const updateLocation = asyncHandler(async (req, res) => {
  const location = await Location.findById(req.params.id);
  if (!location) return res.status(404).json({ success: false, message: 'Location not found' });

  if (req.body.name) {
    const dup = await Location.findOne({ name: { $regex: `^${String(req.body.name).trim()}$`, $options: 'i' }, _id: { $ne: location._id } });
    if (dup) return res.status(409).json({ success: false, message: 'A location with this name already exists' });
    location.name = String(req.body.name).trim();
  }
  if (req.body.address !== undefined) location.address = String(req.body.address).trim();
  if (req.body.city !== undefined) location.city = String(req.body.city).trim();
  if (req.body.active !== undefined) location.active = Boolean(req.body.active);
  await location.save();

  res.json({ success: true, message: 'Location updated', data: location });
});

// @route  DELETE /api/locations/:id
const deleteLocation = asyncHandler(async (req, res) => {
  const location = await Location.findById(req.params.id);
  if (!location) return res.status(404).json({ success: false, message: 'Location not found' });

  const count = await Employee.countDocuments({ office: location._id });
  if (count > 0) {
    return res.status(409).json({
      success: false,
      message: `Cannot delete: ${count} employee(s) are still assigned to this location.`,
    });
  }

  await location.deleteOne();
  res.json({ success: true, message: 'Location deleted' });
});

module.exports = { getLocations, createLocation, updateLocation, deleteLocation };