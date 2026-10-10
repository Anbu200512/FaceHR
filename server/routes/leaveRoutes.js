const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const {
  applyLeave,
  getLeaves,
  getMyLeaves,
  getLeaveBalance,
  getLeaveSummary,
  approveLeave,
  rejectLeave,
} = require('../controllers/leaveController');

router.use(protect, apiLimiter);

router.get('/mine', authorize('employee'), getMyLeaves);
router.get('/balance', authorize('employee'), getLeaveBalance);
router.get('/summary', authorize('admin'), getLeaveSummary);
router.get('/', authorize('admin'), getLeaves);
router.post('/', authorize('employee'), applyLeave);
router.put('/:id/approve', authorize('admin'), approveLeave);
router.put('/:id/reject', authorize('admin'), rejectLeave);

module.exports = router;