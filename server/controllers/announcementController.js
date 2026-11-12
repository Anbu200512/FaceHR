const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { createNotification } = require('../services/notificationService');

const PRIORITIES = ['normal', 'high'];
const AUDIENCES = ['all', 'department'];

const AUTHOR_INCLUDE = { select: { id: true, name: true } };
const DEPARTMENT_INCLUDE = { select: { id: true, name: true } };

async function notifyAudience(announcement) {
  const where = { role: 'employee', active: true };
  if (announcement.audience === 'department' && announcement.departmentId) {
    where.employeeRef = { departmentId: announcement.departmentId };
  }
  const users = await prisma.user.findMany({ where, select: { id: true } });
  await Promise.all(
    users.map((u) =>
      createNotification({
        user: u.id,
        title: announcement.priority === 'high' ? `Important: ${announcement.title}` : 'New announcement',
        message: announcement.title,
        type: announcement.priority === 'high' ? 'warning' : 'info',
        link: '/employee/announcements',
      })
    )
  );
}

// @route  GET /api/announcements
const getAnnouncements = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const where = {};

  if (!isAdmin) {
    const now = new Date();
    const employee = req.user.employee
      ? await prisma.employee.findUnique({ where: { id: req.user.employee }, select: { departmentId: true } })
      : null;
    where.published = true;
    where.AND = [
      { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      { OR: [{ audience: 'all' }, { audience: 'department', departmentId: employee?.departmentId || null }] },
    ];
  } else if (req.query.published !== undefined) {
    where.published = req.query.published !== 'false';
  }

  const announcements = await prisma.announcement.findMany({
    where,
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    relationLoadStrategy: 'join',
    include: { author: AUTHOR_INCLUDE, department: DEPARTMENT_INCLUDE },
  });
  res.json({ success: true, data: announcements });
});

// @route  POST /api/announcements  (admin)
const createAnnouncement = asyncHandler(async (req, res) => {
  const { title, message, priority, audience, departmentId, published, expiresAt } = req.body;
  if (!title || !String(title).trim()) return res.status(400).json({ success: false, message: 'Title is required' });
  if (!message || !String(message).trim()) return res.status(400).json({ success: false, message: 'Message is required' });

  const aud = AUDIENCES.includes(audience) ? audience : 'all';
  if (aud === 'department' && !departmentId) {
    return res.status(400).json({ success: false, message: 'Choose a department for a department announcement' });
  }

  let expires = null;
  if (expiresAt) {
    const d = new Date(expiresAt);
    if (!Number.isNaN(d.getTime())) expires = d;
  }

  const announcement = await prisma.announcement.create({
    data: {
      title: String(title).trim(),
      message: String(message).trim(),
      priority: PRIORITIES.includes(priority) ? priority : 'normal',
      audience: aud,
      departmentId: aud === 'department' ? departmentId : null,
      published: published === undefined ? true : !!published,
      authorId: req.user.id,
      expiresAt: expires,
    },
    include: { author: AUTHOR_INCLUDE, department: DEPARTMENT_INCLUDE },
  });

  if (announcement.published) await notifyAudience(announcement);

  res.status(201).json({ success: true, message: 'Announcement published', data: announcement });
});

// @route  PUT /api/announcements/:id  (admin)
const updateAnnouncement = asyncHandler(async (req, res) => {
  const existing = await prisma.announcement.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ success: false, message: 'Announcement not found' });

  const { title, message, priority, audience, departmentId, published, expiresAt } = req.body;
  const data = {};
  if (title !== undefined) {
    if (!String(title).trim()) return res.status(400).json({ success: false, message: 'Title is required' });
    data.title = String(title).trim();
  }
  if (message !== undefined) {
    if (!String(message).trim()) return res.status(400).json({ success: false, message: 'Message is required' });
    data.message = String(message).trim();
  }
  if (priority !== undefined) data.priority = PRIORITIES.includes(priority) ? priority : existing.priority;
  if (audience !== undefined) data.audience = AUDIENCES.includes(audience) ? audience : existing.audience;
  if (departmentId !== undefined) data.departmentId = departmentId || null;
  if (published !== undefined) data.published = !!published;
  if (expiresAt !== undefined) {
    if (!expiresAt) data.expiresAt = null;
    else {
      const d = new Date(expiresAt);
      if (!Number.isNaN(d.getTime())) data.expiresAt = d;
    }
  }
  if (data.audience === 'all') data.departmentId = null;

  const announcement = await prisma.announcement.update({
    where: { id: existing.id },
    data,
    include: { author: AUTHOR_INCLUDE, department: DEPARTMENT_INCLUDE },
  });
  res.json({ success: true, message: 'Announcement updated', data: announcement });
});

// @route  DELETE /api/announcements/:id  (admin)
const deleteAnnouncement = asyncHandler(async (req, res) => {
  const existing = await prisma.announcement.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ success: false, message: 'Announcement not found' });
  await prisma.announcement.delete({ where: { id: existing.id } });
  res.json({ success: true, message: 'Announcement deleted' });
});

module.exports = { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement };
