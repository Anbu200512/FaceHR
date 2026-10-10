const Notification = require('../models/Notification');

async function createNotification({ user = null, title, message = '', type = 'info', link = '' }) {
  try {
    return await Notification.create({ user, title, message, type, link });
  } catch (err) {
    console.warn(`[Notification] failed: ${err.message}`);
    return null;
  }
}

module.exports = { createNotification };