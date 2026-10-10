const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const { getDashboard } = require('../controllers/dashboardController');

router.use(protect, apiLimiter);

router.get('/', authorize('admin'), getDashboard);

module.exports = router;