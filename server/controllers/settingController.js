const asyncHandler = require('../utils/asyncHandler');
const { getSettings, updateSetting } = require('../services/attendanceService');
const { getAttendanceSettings, updateAttendanceSettings } = require('../services/attendanceSettingsService');
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

// @route  PUT /api/settings/attendance  (admin only)
const updateGlobalAttendanceSettings = asyncHandler(async (req, res) => {
  const attendance = await updateAttendanceSettings(req.body);
  res.json({ success: true, message: 'Attendance settings updated successfully.', data: { attendance } });
});

module.exports = {
  getAppSettings,
  updateAppSettings,
  getGlobalAttendanceSettings,
  updateGlobalAttendanceSettings,
};