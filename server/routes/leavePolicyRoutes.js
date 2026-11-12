const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const { getPolicies, createPolicy, updatePolicy, deletePolicy } = require('../controllers/leavePolicyController');

router.use(protect, apiLimiter);

router.get('/', getPolicies);
router.post('/', authorize('admin'), createPolicy);
router.put('/:id', authorize('admin'), updatePolicy);
router.delete('/:id', authorize('admin'), deletePolicy);

module.exports = router;
