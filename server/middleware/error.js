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
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0] || '';
    message = field ? `Record already exists: ${field}` : 'Duplicate record found';
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid identifier provided';
  }

  console.error(`[API ERROR] ${req.method} ${req.originalUrl} -> ${message}`);
  res.status(status).json({ success: false, message });
};

module.exports = { notFound, errorHandler };