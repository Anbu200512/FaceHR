const rateLimit = require('express-rate-limit');

const positiveInt = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

// Rate-limit per authenticated user (so several members behind the same office
// NAT / proxy IP each get their own budget) and fall back to IP for anonymous
// requests such as login.
const keyGenerator = (req) => (req.user && req.user.id ? `user:${req.user.id}` : `ip:${req.ip || 'unknown'}`);

const skipOptions = (req) => req.method === 'OPTIONS';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: positiveInt(process.env.RATE_LIMIT_AUTH_MAX, 100),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  skip: skipOptions,
  message: { success: false, message: 'Too many sign-in attempts. Please try again later.' },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: positiveInt(process.env.RATE_LIMIT_API_MAX, 1200),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  skip: skipOptions,
  message: { success: false, message: 'Too many requests. Please slow down.' },
});

const faceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: positiveInt(process.env.RATE_LIMIT_FACE_MAX, 60),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  skip: skipOptions,
  message: { success: false, message: 'Face verification is being attempted too frequently. Please wait a moment.' },
});

module.exports = { authLimiter, apiLimiter, faceLimiter };
