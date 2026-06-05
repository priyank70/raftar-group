import { Router } from 'express';
import {
  createInvestment, getInvestments, voteOnInvestment, getInvestmentById,
  recordRepayment, calculateInvestment, recordEmiRepayment,
  updateInvestment, approveInvestment
} from '../controllers/investmentController';
import { authenticate, requireAdmin, requireNotDisabled } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getInvestments);
router.post('/calculate', calculateInvestment);
router.get('/:id', getInvestmentById);
router.post('/', requireAdmin, createInvestment);
router.put('/:id', requireAdmin, updateInvestment);
router.post('/:id/vote', requireNotDisabled, voteOnInvestment);
router.post('/:id/approve', requireAdmin, approveInvestment);
router.post('/:id/emi', requireAdmin, recordEmiRepayment);
router.put('/:id/repayment', requireAdmin, recordRepayment);

export default router;
