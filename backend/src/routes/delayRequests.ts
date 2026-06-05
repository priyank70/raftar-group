import { Router } from 'express';
import { createDelayRequest, getDelayRequests, voteOnDelayRequest } from '../controllers/delayRequestController';
import { authenticate, requireNotDisabled } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', requireNotDisabled, createDelayRequest);
router.get('/', getDelayRequests);
router.put('/:id/vote', requireNotDisabled, voteOnDelayRequest);

export default router;
