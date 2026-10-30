const notFound = (req, res, next) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
};

const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Server error';

  if (err.name === 'MulterError') {
    status = 400;
    if (err.code === 'LIMIT_FILE_SIZE') message = 'Image is too large. Maximum size is 5 MB.';
    else if (err.code === 'LIMIT_UNEXPECTED_FILE') message = err.message || 'Only JPG, PNG or WebP images are allowed.';
    else message = 'Image upload failed. Please try again.';
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  } else if (err.code === 'P2002') {
    status = 409;
    const fields = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : err.meta?.target || '';
    message = fields ? `Record already exists: ${fields}` : 'Duplicate record found';
  } else if (err.code === 'P2025') {
    status = 404;
    message = 'Record not found';
  } else if (err.code === 'P2003') {
    status = 409;
    message = 'This record is still referenced by other data and cannot be changed';
  } else if (err.name === 'PrismaClientValidationError') {
    status = 400;
    message = 'Invalid request data';
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid identifier provided';
  }

  console.error(`[API ERROR] ${req.method} ${req.originalUrl} -> ${message}`);
  res.status(status).json({ success: false, message });
};

module.exports = { notFound, errorHandler };
