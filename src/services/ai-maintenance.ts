import { AiMaintenanceConfig } from '../shared/config/ai';
import DatabaseService from './database';

export async function runAiMaintenance(
  config: AiMaintenanceConfig,
  database = DatabaseService.getInstance(),
  now = new Date()
): Promise<void> {
  const usageBefore = new Date(now.getTime() - config.usageRetentionSeconds * 1000);
  await database.cleanupAiData(now, usageBefore);
}

export function startAiMaintenance(config: AiMaintenanceConfig, database = DatabaseService.getInstance()): NodeJS.Timeout {
  const cleanup = async () => {
    try { await runAiMaintenance(config, database); }
    catch { console.error('AI cleanup failed'); }
  };
  void cleanup();
  const timer = setInterval(cleanup, config.cleanupIntervalSeconds * 1000);
  timer.unref();
  return timer;
}
