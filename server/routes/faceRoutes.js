const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');
const { faceLimiter } = require('../middleware/rateLimiter');
const {
  registerFace,
  verifyFace,
  getFaceStatus,
  deleteFace,
} = require('../controllers/faceController');

router.use(protect, faceLimiter);

router.post('/register', authorize('admin'), uploadImage, registerFace);
router.post('/verify', authorize('admin', 'employee'), uploadImage, verifyFace);
router.get('/:employeeId', authorize('admin', 'employee'), getFaceStatus);
router.delete('/:employeeId', authorize('admin'), deleteFace);

module.exports = router;