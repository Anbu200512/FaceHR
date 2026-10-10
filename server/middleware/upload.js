const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) return cb(null, true);
  return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only JPG, PNG or WebP images are allowed'));
};

const uploadImage = multer({
  storage,
  limits: { fileSize: MAX_SIZE, files: 1 },
  fileFilter,
}).single('image');

const uploadProfilePhoto = multer({
  storage,
  limits: { fileSize: MAX_SIZE, files: 1 },
  fileFilter,
}).single('profilePhoto');

const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10 MB

const uploadDocument = multer({
  storage,
  limits: { fileSize: MAX_DOC_SIZE, files: 1 },
}).single('file');

function saveBuffer(buffer, ext) {
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext || 'jpg'}`;
  const fullPath = path.join(uploadsDir, name);
  fs.writeFileSync(fullPath, buffer);
  return `/uploads/${name}`;
}

/** Derive a safe extension from an original filename ("" when none). */
function extFromName(filename) {
  if (typeof filename !== 'string') return '';
  const base = path.basename(filename).split('.');
  if (base.length < 2) return '';
  const ext = base[base.length - 1].toLowerCase().replace(/[^a-z0-9]/g, '');
  return ext.slice(0, 8);
}

module.exports = {
  uploadImage,
  uploadProfilePhoto,
  uploadDocument,
  saveBuffer,
  extFromName,
  uploadsDir,
  ALLOWED_IMAGE_TYPES,
  MAX_SIZE,
};