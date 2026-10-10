const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const {
  applyResignation,
  getResignations,
  getMyResignations,
  approveResignation,
  rejectResignation,
} = require('../controllers/resignationController');

router.use(protect, apiLimiter);

router.get('/mine', authorize('employee'), getMyResignations);
router.get('/', authorize('admin'), getResignations);
router.post('/', authorize('employee'), applyResignation);
router.put('/:id/approve', authorize('admin'), approveResignation);
router.put('/:id/reject', authorize('admin'), rejectResignation);

module.exports = router;