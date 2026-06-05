import { Router } from 'express';
import {
  getUsers, getUserById, createUser, updateUser, removeUser,
  getUserSummary, updateAvatar, updateProfile
} from '../controllers/userController';
import {
  createPromotionRequest, getPromotionRequests, voteOnPromotionRequest
} from '../controllers/promotionController';
import {
  createDisableRequest, getDisableRequests, voteOnDisableRequest
} from '../controllers/disableRequestController';
import { authenticate, requireAdmin, requireNotDisabled } from '../middleware/auth';
import { uploadAvatar } from '../middleware/upload';

const router = Router();

router.use(authenticate);

router.get('/', getUsers);
router.get('/promotion-requests', getPromotionRequests);
router.put('/promotion-requests/:id/vote', requireNotDisabled, voteOnPromotionRequest);
router.get('/disable-requests', getDisableRequests);
router.put('/disable-requests/:id/vote', requireNotDisabled, voteOnDisableRequest);
router.get('/:id', getUserById);
router.get('/:id/summary', getUserSummary);
router.post('/', requireAdmin, createUser);
router.put('/:id', requireAdmin, updateUser);
router.delete('/:id', requireAdmin, removeUser);
router.put('/:id/promote', requireAdmin, createPromotionRequest);
router.put('/:id/disable', requireAdmin, createDisableRequest);
router.put('/profile/me', requireNotDisabled, updateProfile);
router.put('/profile/avatar', requireNotDisabled, uploadAvatar.single('avatar'), updateAvatar);

export default router;
