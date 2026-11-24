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

function uploadPath(fileName) {
  if (!fileName) return null;
  const base = path.basename(String(fileName));
  if (!base) return null;
  return path.join(uploadsDir, base);
}

async function fileExists(fileName) {
  const full = uploadPath(fileName);
  if (!full) return false;
  try {
    await fs.access(full);
    return true;
  } catch {
    return false;
  }
}

async function removeUploadFile(fileName) {
  const full = uploadPath(fileName);
  if (!full) return;
  try {
    await fs.unlink(full);
  } catch {
    // ignore missing/already-deleted files
  }
}

async function cleanupAttendancePhotos() {
  if (RETENTION_HOURS === 0) return { expired: 0, missing: 0 };

  const cutoff = new Date(Date.now() - RETENTION_MS);
  const records = await prisma.attendance.findMany({
    where: {
      OR: [
        { checkInPhoto: { not: null } },
        { checkOutPhoto: { not: null } },
      ],
    },
    select: {
      id: true,
      employeeId: true,
      checkInPhoto: true,
      checkOutPhoto: true,
      checkInTime: true,
      checkOutTime: true,
    },
  });

  let expired = 0;
  let missing = 0;

  for (const rec of records) {
    const data = {};

    if (rec.checkInPhoto) {
      const expiredPhoto = rec.checkInTime ? rec.checkInTime < cutoff : true;
      const exists = await fileExists(rec.checkInPhoto);
      if (expiredPhoto) {
        if (exists) await removeUploadFile(rec.checkInPhoto);
        data.checkInPhoto = null;
        expired += 1;
      } else if (!exists) {
        missing += 1;
        console.warn('[AttendancePhotoCleanup] Missing check-in photo file (DB ref kept for visibility)', {
          event: 'attendance.photo_missing',
          attendanceId: rec.id,
          employeeId: rec.employeeId,
          photo: rec.checkInPhoto,
        });
      }
    }

    if (rec.checkOutPhoto) {
      const expiredPhoto = rec.checkOutTime ? rec.checkOutTime < cutoff : true;
      const exists = await fileExists(rec.checkOutPhoto);
      if (expiredPhoto) {
        if (exists) await removeUploadFile(rec.checkOutPhoto);
        data.checkOutPhoto = null;
        expired += 1;
      } else if (!exists) {
        missing += 1;
        console.warn('[AttendancePhotoCleanup] Missing check-out photo file (DB ref kept for visibility)', {
          event: 'attendance.photo_missing',
          attendanceId: rec.id,
          employeeId: rec.employeeId,
          photo: rec.checkOutPhoto,
        });
      }
    }

    if (Object.keys(data).length) {
      await prisma.attendance.update({ where: { id: rec.id }, data });
    }
  }

  if (expired || missing) {
    console.log('[AttendancePhotoCleanup] Completed', { expired, missing, retentionHours: RETENTION_HOURS });
  }
  return { expired, missing };
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

  console.log(`[AttendancePhotoCleanup] Enabled (retention: ${RETENTION_HOURS}h, uploadsDir: ${uploadsDir}).`);
  run();
  setInterval(run, CLEANUP_INTERVAL_MS).unref();
}

module.exports = { cleanupAttendancePhotos, startAttendancePhotoCleanup };
