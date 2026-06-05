import { Router } from 'express';
import {
  getInstallments, calculateLivePenalty, getMyInstallmentStatus, regenerateInstallments, delayInstallment
} from '../controllers/installmentController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getInstallments);
router.get('/my-status', getMyInstallmentStatus);
router.get('/calculate-penalty', calculateLivePenalty);
router.post('/regenerate', requireAdmin, regenerateInstallments);
router.put('/:id/delay', requireAdmin, delayInstallment);

export default router;
