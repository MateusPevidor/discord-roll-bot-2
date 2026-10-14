import * as dotenv from 'dotenv';
dotenv.config();

import { RollBot } from './bot/bot';
import { Server } from './web/server';
import { loadAiMaintenanceConfig } from './shared/config/ai';
import { startAiMaintenance } from './services/ai-maintenance';

RollBot.create();
Server.create();

const aiMaintenanceConfig = loadAiMaintenanceConfig();
if ('usageRetentionSeconds' in aiMaintenanceConfig) startAiMaintenance(aiMaintenanceConfig);
else console.error('AI maintenance is disabled because its retention configuration is invalid');
