import { Router } from 'express';
import {
  submitPayment, getPayments, approvePayment, rejectPayment, getPendingCount
} from '../controllers/paymentController';
import { authenticate, requireAdmin, requireNotDisabled } from '../middleware/auth';
import { uploadPaymentScreenshot } from '../middleware/upload';

const router = Router();

router.use(authenticate);

router.get('/', getPayments);
router.get('/pending-count', requireAdmin, getPendingCount);
router.post('/submit', requireNotDisabled, submitPayment);
router.put('/:id/approve', requireAdmin, approvePayment);
router.put('/:id/reject', requireAdmin, rejectPayment);

export default router;
