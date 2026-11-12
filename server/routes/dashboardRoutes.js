const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const responseCache = require('../middleware/responseCache');
const config = require('../config/config');
const { getDashboard } = require('../controllers/dashboardController');

router.use(protect, apiLimiter);

// Dashboard is read-only and expensive; serve repeated loads from memory briefly.
router.get('/', authorize('admin'), responseCache(config.dashboardCacheTtlMs), getDashboard);

module.exports = router;