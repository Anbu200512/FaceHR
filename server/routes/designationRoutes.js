const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const designationController = require('../controllers/designationController');

router.use(protect, apiLimiter);

router.get('/', authorize('admin', 'employee'), designationController.getDesignations);
router.post('/', authorize('admin'), designationController.createDesignation);
router.put('/:id', authorize('admin'), designationController.updateDesignation);
router.delete('/:id', authorize('admin'), designationController.deleteDesignation);

module.exports = router;