const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');

// @route  GET /api/notifications
const getNotifications = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

  let filter = {};
  if (req.user.role === 'employee') {
    filter = { user: req.user.id };
  } else {
    filter = { $or: [{ user: req.user.id }, { user: null }] };
  }

  const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ success: true, data: notifications });
});

// @route  GET /api/notifications/unread-count
const unreadCount = asyncHandler(async (req, res) => {
  let filter = {};
  if (req.user.role === 'employee') filter = { user: req.user.id, read: false };
  else filter = { $or: [{ user: req.user.id }, { user: null }], read: false };
  const count = await Notification.countDocuments(filter);
  res.json({ success: true, data: { count } });
});

// @route  PUT /api/notifications/:id/read
const markRead = asyncHandler(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, user: req.user.id }, { $set: { read: true } });
  res.json({ success: true });
});

// @route  PUT /api/notifications/read-all
const markAllRead = asyncHandler(async (req, res) => {
  let filter = {};
  if (req.user.role === 'employee') filter = { user: req.user.id, read: false };
  else filter = { $or: [{ user: req.user.id }, { user: null }], read: false };
  await Notification.updateMany(filter, { $set: { read: true } });
  res.json({ success: true });
});

module.exports = { getNotifications, unreadCount, markRead, markAllRead };