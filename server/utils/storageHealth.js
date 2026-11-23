const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const config = require('../config/config');

const uploadsDir = config.uploadsDir;
const PROBE_TTL_MS = 30 * 1000;
let last = { at: 0, ok: false, error: null, uploadsDir };

function markUploadStorageUnhealthy(err) {
  last = {
    at: Date.now(),
    ok: false,
    error: { message: err?.message || String(err), code: err?.code || null },
    uploadsDir,
  };
}

async function getUploadStorageHealth({ force = false } = {}) {
  if (!force && last.at && Date.now() - last.at < PROBE_TTL_MS) return last;

  const probe = path.join(
    uploadsDir,
    '.healthcheck-' + process.pid + '-' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.tmp'
  );
  try {
    await fsp.mkdir(uploadsDir, { recursive: true });
    await fsp.access(uploadsDir, fs.constants.R_OK | fs.constants.W_OK);
    await fsp.writeFile(probe, 'ok');
    await fsp.unlink(probe);
    last = { at: Date.now(), ok: true, error: null, uploadsDir };
  } catch (err) {
    try { await fsp.unlink(probe); } catch (_) {}
    markUploadStorageUnhealthy(err);
  }
  return last;
}

module.exports = { getUploadStorageHealth, markUploadStorageUnhealthy };
