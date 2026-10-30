const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');

function notificationFilter(user, unreadOnly = false) {
  const filter =
    user.role === 'employee'
      ? { userId: user.id }
      : { OR: [{ userId: user.id }, { userId: null }] };
  if (unreadOnly) filter.read = false;
  return filter;
}

// @route  GET /api/notifications
const getNotifications = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  const notifications = await prisma.notification.findMany({
    where: notificationFilter(req.user),
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  res.json({ success: true, data: notifications });
});

// @route  GET /api/notifications/unread-count
const unreadCount = asyncHandler(async (req, res) => {
  const count = await prisma.notification.count({
    where: notificationFilter(req.user, true),
  });
  res.json({ success: true, data: { count } });
});

// @route  PUT /api/notifications/:id/read
const markRead = asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.user.id },
    data: { read: true },
  });
  res.json({ success: true });
});

// @route  PUT /api/notifications/read-all
const markAllRead = asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({
    where: notificationFilter(req.user, true),
    data: { read: true },
  });
  res.json({ success: true });
});

module.exports = { getNotifications, unreadCount, markRead, markAllRead };
