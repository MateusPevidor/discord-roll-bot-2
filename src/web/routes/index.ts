import { Router } from 'express';
import { SetMute, SetMuteStatus } from './set-mute.route';

const router = Router();

router.post('/setMute', SetMute);
router.get('/setMute/status', SetMuteStatus);

export default router;
