const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const responseCache = require('../middleware/responseCache');
const config = require('../config/config');
const { getActivity } = require('../controllers/activityController');

router.use(protect, apiLimiter);

router.get('/', authorize('admin'), responseCache(config.activityCacheTtlMs), getActivity);

module.exports = router;