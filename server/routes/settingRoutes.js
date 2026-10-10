const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const {
  getAppSettings,
  updateAppSettings,
  getGlobalAttendanceSettings,
  updateGlobalAttendanceSettings,
} = require('../controllers/settingController');

router.use(protect, apiLimiter);

router.get('/', authorize('admin'), getAppSettings);
router.put('/', authorize('admin'), updateAppSettings);
router.get('/attendance', authorize('admin', 'employee'), getGlobalAttendanceSettings);
router.put('/attendance', authorize('admin'), updateGlobalAttendanceSettings);

module.exports = router;