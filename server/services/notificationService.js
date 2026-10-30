const prisma = require('../config/prisma');

async function createNotification({ user = null, title, message = '', type = 'info', link = '' }) {
  try {
    return await prisma.notification.create({
      data: { userId: user || null, title, message, type, link },
    });
  } catch (err) {
    console.warn(`[Notification] failed: ${err.message}`);
    return null;
  }
}

module.exports = { createNotification };
