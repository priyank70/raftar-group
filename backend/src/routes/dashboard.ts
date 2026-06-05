import { Router } from 'express';
import {
  getAdminDashboard, getMemberDashboard, getGroupSettings,
  updateGroupSettings, getActivityLog, sendAnnouncement
} from '../controllers/dashboardController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { uploadQRCode } from '../middleware/upload';

const router = Router();

router.use(authenticate);

router.get('/admin', requireAdmin, getAdminDashboard);
router.get('/member', getMemberDashboard);
router.get('/group-settings', getGroupSettings);
router.put('/group-settings', requireAdmin, uploadQRCode.single('qrCode'), updateGroupSettings);
router.get('/activity-log', getActivityLog);
router.post('/announcement', requireAdmin, sendAnnouncement);

export default router;
