const asyncHandler = require('../utils/asyncHandler');
const { getSettings, updateSetting } = require('../services/attendanceService');
const { getAttendanceSettings, updateAttendanceSettings, getEffectiveAttendanceSettings } = require('../services/attendanceSettingsService');
const prisma = require('../config/prisma');
const faceService = require('../services/faceService');

// @route  GET /api/settings
const getAppSettings = asyncHandler(async (req, res) => {
  const settings = await getSettings();
  res.json({
    success: true,
    data: { settings, face: faceService.status() },
  });
});

// @route  PUT /api/settings  body: { key, value }
const updateAppSettings = asyncHandler(async (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ success: false, message: 'Setting key is required' });

  let parsedValue = value;
  if (key === 'halfDayThresholdHours') parsedValue = parseFloat(value);
  if (key === 'lateEnabled') parsedValue = value === true || value === 'true';

  await updateSetting(key, parsedValue);
  const settings = await getSettings();
  res.json({ success: true, message: 'Settings updated', data: { settings } });
});

// @route  GET /api/settings/attendance  (admin + employee)
const getGlobalAttendanceSettings = asyncHandler(async (req, res) => {
  const attendance = await getAttendanceSettings();
  res.json({ success: true, data: { attendance } });
});

// @route GET /api/settings/attendance/me (effective settings for current employee; admin may pass employeeId)
const getMyAttendanceSettings = asyncHandler(async (req, res) => {
  const employeeId = req.user.role === 'admin' ? String(req.query.employeeId || '') : String(req.user.employee || '');
  if (!employeeId) return res.status(400).json({ success: false, message: 'Employee is required' });
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
  const attendance = await getEffectiveAttendanceSettings(employee);
  res.json({ success: true, data: { attendance, overrides: employee.attendanceSettings || null } });
});

// @route  PUT /api/settings/attendance  (admin only)
const updateGlobalAttendanceSettings = asyncHandler(async (req, res) => {
  const attendance = await updateAttendanceSettings(req.body);
  res.json({ success: true, message: 'Attendance settings updated successfully.', data: { attendance } });
});

module.exports = {
  getAppSettings,
  updateAppSettings,
  getGlobalAttendanceSettings,
  getMyAttendanceSettings,
  updateGlobalAttendanceSettings,
};
