import { Router } from 'express';
import { authenticate, requireAdmin, requireNotDisabled } from '../middleware/auth';
import {
  initiateLeaveRequest,
  getSettlements,
  proposeSettlement,
  acceptSettlement
} from '../controllers/settlementController';

const router = Router();

router.use(authenticate);

router.post('/leave-request', requireNotDisabled, initiateLeaveRequest);
router.get('/', getSettlements);
router.put('/:id/propose', requireAdmin, proposeSettlement);
router.put('/:id/accept', requireNotDisabled, acceptSettlement);

export default router;
