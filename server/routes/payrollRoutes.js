const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const {
  getRuns,
  getRun,
  generateRun,
  markPaid,
  deleteRun,
  getMyPayslips,
  getPayslip,
} = require('../controllers/payrollController');

router.use(protect, apiLimiter);

router.get('/mine', authorize('employee'), getMyPayslips);
router.get('/payslips/:id', getPayslip);
router.get('/', authorize('admin'), getRuns);
router.post('/generate', authorize('admin'), generateRun);
router.get('/:id', authorize('admin'), getRun);
router.put('/:id/pay', authorize('admin'), markPaid);
router.delete('/:id', authorize('admin'), deleteRun);

module.exports = router;
