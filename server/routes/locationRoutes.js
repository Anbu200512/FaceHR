const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const responseCache = require('../middleware/responseCache');
const config = require('../config/config');
const locationController = require('../controllers/locationController');

router.use(protect, apiLimiter);

router.get('/', authorize('admin', 'employee'), responseCache(config.listCacheTtlMs, () => 'locations'), locationController.getLocations);
router.post('/', authorize('admin'), locationController.createLocation);
router.put('/:id', authorize('admin'), locationController.updateLocation);
router.delete('/:id', authorize('admin'), locationController.deleteLocation);

module.exports = router;