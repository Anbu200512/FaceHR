const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const {
  applyRegularization,
  getMyRegularizations,
  getRegularizations,
  approveRegularization,
  rejectRegularization,
} = require('../controllers/regularizationController');

router.use(protect, apiLimiter);

router.get('/mine', authorize('employee'), getMyRegularizations);
router.get('/', authorize('admin'), getRegularizations);
router.post('/', authorize('employee'), applyRegularization);
router.put('/:id/approve', authorize('admin'), approveRegularization);
router.put('/:id/reject', authorize('admin'), rejectRegularization);

module.exports = router;
