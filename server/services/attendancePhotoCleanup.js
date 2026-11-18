const fs = require('fs').promises;
const path = require('path');
const prisma = require('../config/prisma');
const { uploadsDir } = require('../middleware/upload');

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000;

async function removeUploadFile(fileName) {
  if (!fileName) return;
  const full = path.join(uploadsDir, path.basename(String(fileName)));
  try {
    await fs.unlink(full);
  } catch {
    // ignore missing/already-deleted files
  }
}

async function cleanupAttendancePhotos() {
  const cutoff = new Date(Date.now() - TWELVE_HOURS_MS);

  const records = await prisma.attendance.findMany({
    where: {
      OR: [
        { checkInPhoto: { not: null }, checkInTime: { lt: cutoff } },
        { checkOutPhoto: { not: null }, checkOutTime: { lt: cutoff } },
      ],
    },
    select: {
      id: true,
      checkInPhoto: true,
      checkOutPhoto: true,
      checkInTime: true,
      checkOutTime: true,
    },
  });

  for (const rec of records) {
    const data = {};

    if (rec.checkInPhoto && rec.checkInTime && rec.checkInTime < cutoff) {
      await removeUploadFile(rec.checkInPhoto);
      data.checkInPhoto = null;
    }

    if (rec.checkOutPhoto && rec.checkOutTime && rec.checkOutTime < cutoff) {
      await removeUploadFile(rec.checkOutPhoto);
      data.checkOutPhoto = null;
    }

    if (Object.keys(data).length) {
      await prisma.attendance.update({ where: { id: rec.id }, data });
    }
  }

  return records.length;
}

function startAttendancePhotoCleanup() {
  const run = () => {
    cleanupAttendancePhotos().catch((err) => {
      console.error('[AttendancePhotoCleanup] Failed:', err.message);
    });
  };

  run();
  setInterval(run, CLEANUP_INTERVAL_MS).unref();
}

module.exports = { cleanupAttendancePhotos, startAttendancePhotoCleanup };
