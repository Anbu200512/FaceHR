const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');
const { faceLimiter, apiLimiter } = require('../middleware/rateLimiter');
const {
  checkIn,
  checkOut,
  getRecords,
  getToday,
  getMonthly,
  adminCheckIn,
  adminCheckOut,
} = require('../controllers/attendanceController');
const { getReport } = require('../controllers/reportController');

router.use(protect);

router.post('/check-in', authorize('employee'), faceLimiter, uploadImage, checkIn);
router.post('/check-out', authorize('employee'), faceLimiter, uploadImage, checkOut);
router.post('/admin/:employeeId/check-in', authorize('admin'), faceLimiter, uploadImage, adminCheckIn);
router.post('/admin/:employeeId/check-out', authorize('admin'), faceLimiter, uploadImage, adminCheckOut);
router.get('/report', authorize('admin'), apiLimiter, getReport);
router.get('/today', authorize('admin', 'employee'), apiLimiter, getToday);
router.get('/:employeeId', authorize('admin', 'employee'), apiLimiter, getMonthly);
router.get('/', authorize('admin'), apiLimiter, getRecords);

module.exports = router;