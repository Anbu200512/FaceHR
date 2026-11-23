const fs = require('fs').promises;
const path = require('path');
const prisma = require('../config/prisma');
const { uploadsDir } = require('../middleware/upload');

const DEFAULT_RETENTION_HOURS = 12;
const retentionHoursRaw = Number(process.env.ATTENDANCE_PHOTO_RETENTION_HOURS);
const RETENTION_HOURS = Number.isFinite(retentionHoursRaw) && retentionHoursRaw >= 0
  ? retentionHoursRaw
  : DEFAULT_RETENTION_HOURS;
const RETENTION_MS = RETENTION_HOURS * 60 * 60 * 1000;
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
  if (RETENTION_HOURS === 0) return 0;
  const cutoff = new Date(Date.now() - RETENTION_MS);

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
  if (RETENTION_HOURS === 0) {
    console.log('[AttendancePhotoCleanup] Disabled (ATTENDANCE_PHOTO_RETENTION_HOURS=0).');
    return;
  }

  const run = () => {
    cleanupAttendancePhotos().catch((err) => {
      console.error('[AttendancePhotoCleanup] Failed:', err.message);
    });
  };

  console.log(`[AttendancePhotoCleanup] Enabled (retention: ${RETENTION_HOURS}h).`);
  run();
  setInterval(run, CLEANUP_INTERVAL_MS).unref();
}

module.exports = { cleanupAttendancePhotos, startAttendancePhotoCleanup };
