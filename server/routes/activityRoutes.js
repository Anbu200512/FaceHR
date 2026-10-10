const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const { getActivity } = require('../controllers/activityController');

router.use(protect, apiLimiter);

router.get('/', authorize('admin'), getActivity);

module.exports = router;