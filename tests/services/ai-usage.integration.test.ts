import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import DatabaseService, { AiAdmissionInput } from '../../src/services/database';
import { AiUsageService } from '../../src/services/ai-usage';
import { loadAiMaintenanceConfig } from '../../src/shared/config/ai';
import { runAiMaintenance } from '../../src/services/ai-maintenance';

describe('AI usage persistence', () => {
  const directory = mkdtempSync(join(tmpdir(), 'roll-bot-ai-'));
  const databasePath = join(directory, 'test.db').replace(/\\/g, '/');
  const databaseUrl = `file:${databasePath}`;
  let prisma: PrismaClient;
  let database: DatabaseService;

  beforeAll(() => {
    execFileSync(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['exec', 'prisma', 'db', 'push', '--skip-generate', '--accept-data-loss'], {
      cwd: process.cwd(), env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: 'pipe', shell: process.platform === 'win32'
    });
    prisma = new PrismaClient({ datasourceUrl: databaseUrl });
    database = new DatabaseService(prisma);
  });

  beforeEach(async () => {
    await prisma.aiResponse.deleteMany();
    await prisma.aiUsage.deleteMany();
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
    rmSync(directory, { recursive: true, force: true });
  });

  const admission = (overrides: Partial<AiAdmissionInput> = {}): AiAdmissionInput => ({
    interactionId: 'i1', userId: 'u1', guildId: 'g1', reservedTokens: 100,
    now: new Date('2026-10-14T12:00:00.000Z'), userWindowSeconds: 600,
    guildWindowSeconds: 600, userLimit: 5, guildLimit: 30, dailyBudget: 1000,
    maxConcurrent: 10, recoverySeconds: 120, ...overrides
  });

  test.each([
    ['user', { userLimit: 1 }, { interactionId: 'i2' }, 'user_limit'],
    ['guild', { guildLimit: 1 }, { interactionId: 'i2', userId: 'u2' }, 'guild_limit'],
    ['concurrency', { maxConcurrent: 1 }, { interactionId: 'i2', userId: 'u2' }, 'concurrency'],
    ['daily budget', { dailyBudget: 150 }, { interactionId: 'i2', userId: 'u2' }, 'budget']
  ])('serializes parallel %s boundaries process-wide', async (_name, firstOverrides, secondOverrides, reason) => {
    const first = new AiUsageService(database);
    const second = new AiUsageService(database);
    const results = await Promise.all([
      first.admit(admission(firstOverrides)),
      second.admit(admission({ ...firstOverrides, ...secondOverrides }))
    ]);
    expect(results.filter((result) => result.admitted)).toHaveLength(1);
    expect(results).toContainEqual({ admitted: false, reason });
  });

  test('enforces duplicate interactions and persists limits across service restarts', async () => {
    expect((await new AiUsageService(database).admit(admission())).admitted).toBe(true);
    await expect(new AiUsageService(database).admit(admission())).resolves.toEqual({ admitted: false, reason: 'duplicate' });
    await expect(new AiUsageService(database).admit(admission({ interactionId: 'i2', userLimit: 1 })))
      .resolves.toEqual({ admitted: false, reason: 'user_limit' });
  });

  test('uses UTC days and rolling-window boundaries', async () => {
    const usage = new AiUsageService(database);
    const first = await usage.admit(admission({ now: new Date('2026-10-14T23:59:59.000Z'), dailyBudget: 100 }));
    expect(first.admitted).toBe(true);
    await usage.complete((first as { usageId: number }).usageId, 100);
    const second = await usage.admit(admission({ interactionId: 'i2', now: new Date('2026-10-15T00:00:00.000Z'), dailyBudget: 100 }));
    expect(second.admitted).toBe(true);
    await usage.complete((second as { usageId: number }).usageId, 100);
    await expect(usage.admit(admission({ interactionId: 'i3', now: new Date('2026-10-15T00:10:01.000Z'), userLimit: 1, dailyBudget: 1000 })))
      .resolves.toMatchObject({ admitted: true });
  });

  test('never undercharges reported usage above the reservation', async () => {
    const result = await database.admitAiUsage(admission());
    expect(result.admitted).toBe(true);
    await expect(database.completeAiUsage((result as { usageId: number }).usageId, 175)).resolves.toBe(false);
    const stored = await prisma.aiUsage.findUniqueOrThrow({ where: { interactionId: 'i1' } });
    expect(stored).toMatchObject({ status: 'uncertain', reservedTokens: 0, chargedTokens: 175 });
  });

  test('charges missing usage, releases capacity, and conservatively recovers stale reservations', async () => {
    const missing = await database.admitAiUsage(admission({ maxConcurrent: 1 }));
    await database.completeAiUsage((missing as { usageId: number }).usageId);
    expect(await prisma.aiUsage.findUniqueOrThrow({ where: { interactionId: 'i1' } })).toMatchObject({
      status: 'uncertain', reservedTokens: 0, chargedTokens: 100
    });
    const stale = await database.admitAiUsage(admission({ interactionId: 'i2', userId: 'u2', recoverySeconds: 1, maxConcurrent: 1 }));
    expect(stale.admitted).toBe(true);
    const recovered = await database.admitAiUsage(admission({ interactionId: 'i3', userId: 'u3', now: new Date('2026-10-14T12:00:02.000Z'), maxConcurrent: 1 }));
    expect(recovered.admitted).toBe(true);
    expect(await prisma.aiUsage.findUniqueOrThrow({ where: { interactionId: 'i2' } })).toMatchObject({
      status: 'uncertain', reservedTokens: 0, chargedTokens: 100
    });
  });

  test('cleans bounded expired data while protecting live reservations', async () => {
    await prisma.aiResponse.create({ data: {
      tokenHash: 'expired', commandType: 'ask-ai', shortAnswer: 's', detailedAnswer: 'd',
      expiresAt: new Date('2026-10-13T00:00:00Z')
    } });
    const completed = await database.admitAiUsage(admission({ now: new Date('2026-10-01T00:00:00Z') }));
    await database.completeAiUsage((completed as { usageId: number }).usageId, 50);
    await database.admitAiUsage(admission({ interactionId: 'live', now: new Date('2026-10-01T00:00:00Z'), recoverySeconds: 9999999 }));
    await database.cleanupAiData(new Date('2026-10-14T00:00:00Z'), new Date('2026-10-10T00:00:00Z'));
    await database.cleanupAiData(new Date('2026-10-14T00:00:00Z'), new Date('2026-10-10T00:00:00Z'));
    expect(await prisma.aiResponse.count()).toBe(0);
    expect(await prisma.aiUsage.findMany({ select: { interactionId: true } })).toEqual([{ interactionId: 'live' }]);
  });

  test.each([
    { AI_ENABLED: 'false' },
    { AI_ENABLED: 'true', DEEPSEEK_API_KEY: '', AI_DAILY_GLOBAL_TOKEN_BUDGET: 'invalid' }
  ])('runs retention cleanup independently of provider admission configuration', async (env) => {
    await prisma.aiResponse.create({ data: {
      tokenHash: `expired-${env.AI_ENABLED}-${env.DEEPSEEK_API_KEY || 'none'}`,
      commandType: 'ask-ai', shortAnswer: 's', detailedAnswer: 'd', expiresAt: new Date('2026-10-01T00:00:00Z')
    } });
    const maintenance = loadAiMaintenanceConfig(env);
    expect('usageRetentionSeconds' in maintenance).toBe(true);
    if ('usageRetentionSeconds' in maintenance) {
      await runAiMaintenance(maintenance, database, new Date('2026-10-14T00:00:00Z'));
    }
    expect(await prisma.aiResponse.count()).toBe(0);
  });
});
