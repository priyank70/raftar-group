import { Router } from 'express';
import { login, refreshToken, logout, getMe, changePassword } from '../controllers/authController';
import { authenticate, requireNotDisabled } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.put('/change-password', authenticate, requireNotDisabled, changePassword);

export default router;
