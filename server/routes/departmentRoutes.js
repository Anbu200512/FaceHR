const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const responseCache = require('../middleware/responseCache');
const config = require('../config/config');
const departmentController = require('../controllers/departmentController');

router.use(protect, apiLimiter);

router.get('/', authorize('admin', 'employee'), responseCache(config.listCacheTtlMs, () => 'departments'), departmentController.getDepartments);
router.post('/', authorize('admin'), departmentController.createDepartment);
router.put('/:id', authorize('admin'), departmentController.updateDepartment);
router.delete('/:id', authorize('admin'), departmentController.deleteDepartment);

module.exports = router;