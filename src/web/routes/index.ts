import { Router } from 'express';
import { SetMute, SetMuteStatus } from './set-mute.route';
import { AiResponse } from './ai-response.route';

const router = Router();

router.post('/setMute', SetMute);
router.get('/setMute/status', SetMuteStatus);
router.get('/ai/responses/:token', AiResponse);

export default router;
