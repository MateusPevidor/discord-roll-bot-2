import { PrismaClient } from '@prisma/client';

export type AiAdmissionResult =
  | { admitted: true; usageId: number }
  | { admitted: false; reason: 'duplicate' | 'user_limit' | 'guild_limit' | 'concurrency' | 'budget' };

export interface AiAdmissionInput {
  interactionId: string;
  userId: string;
  guildId: string;
  reservedTokens: number;
  now: Date;
  userWindowSeconds: number;
  guildWindowSeconds: number;
  userLimit: number;
  guildLimit: number;
  dailyBudget: number;
  maxConcurrent: number;
  recoverySeconds: number;
}

class DatabaseService {
  private static instance: DatabaseService;
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async ensureGuild(guildId: string): Promise<void> {
    await this.prisma.guild.upsert({
      where: { id: guildId },
      update: {},
      create: { id: guildId }
    });
  }

  async setTrackerChannel(guildId: string, channelId: string): Promise<void> {
    await this.ensureGuild(guildId);
    await this.prisma.guild.update({
      where: { id: guildId },
      data: { trackerChannelId: channelId }
    });
  }

  async getTrackerChannel(guildId: string): Promise<string | null> {
    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
      select: { trackerChannelId: true }
    });
    return guild?.trackerChannelId || null;
  }

  async addTrackedPlayer(
    guildId: string,
    target: string,
    isCountry: boolean = false
  ): Promise<boolean> {
    try {
      await this.ensureGuild(guildId);
      await this.prisma.trackedPlayer.create({
        data: {
          guildId,
          target,
          isCountry
        }
      });
      return true;
    } catch (error) {
      // Handle unique constraint violation (player already tracked)
      if (
        error instanceof Error &&
        error.message.includes('UNIQUE constraint failed')
      ) {
        return false;
      }
      throw error;
    }
  }

  async removeTrackedPlayer(
    guildId: string,
    target: string,
    isCountry: boolean = false
  ): Promise<boolean> {
    const result = await this.prisma.trackedPlayer.deleteMany({
      where: {
        guildId,
        target,
        isCountry
      }
    });
    return result.count > 0;
  }

  async getTrackedPlayers(
    guildId: string
  ): Promise<{ players: string[]; countries: string[] }> {
    const tracked = await this.prisma.trackedPlayer.findMany({
      where: { guildId },
      select: { target: true, isCountry: true }
    });

    const players = tracked.filter((t) => !t.isCountry).map((t) => t.target);
    const countries = tracked.filter((t) => t.isCountry).map((t) => t.target);

    return { players, countries };
  }

  async isPlayerTracked(
    guildId: string,
    target: string,
    isCountry: boolean = false
  ): Promise<boolean> {
    const tracked = await this.prisma.trackedPlayer.findUnique({
      where: {
        guildId_target_isCountry: {
          guildId,
          target,
          isCountry
        }
      }
    });
    return tracked !== null;
  }

  async isMatchSent(guildId: string, matchId: string): Promise<boolean> {
    const match = await this.prisma.sentMatch.findUnique({
      where: {
        guildId_matchId: {
          guildId,
          matchId
        }
      }
    });
    return match !== null;
  }

  async markMatchAsSent(guildId: string, matchId: string): Promise<void> {
    await this.ensureGuild(guildId);
    await this.prisma.sentMatch.create({
      data: {
        guildId,
        matchId
      }
    });
  }

  async cleanupOldMatches(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.sentMatch.deleteMany({
      where: {
        sentAt: {
          lt: cutoffDate
        }
      }
    });

    return result.count;
  }

  async admitAiUsage(input: AiAdmissionInput): Promise<AiAdmissionResult> {
    return this.prisma.$transaction(async (tx) => {
      const stale = await tx.aiUsage.findMany({
        where: { status: 'reserved', recoveryAt: { lte: input.now } },
        select: { id: true, reservedTokens: true }
      });
      for (const reservation of stale) {
        await tx.aiUsage.update({ where: { id: reservation.id }, data: {
          status: 'uncertain', chargedTokens: reservation.reservedTokens,
          reservedTokens: 0, completedAt: input.now
        } });
      }
      if (await tx.aiUsage.findUnique({ where: { interactionId: input.interactionId }, select: { id: true } })) {
        return { admitted: false, reason: 'duplicate' };
      }
      const [userCount, guildCount, concurrent, budget] = await Promise.all([
        tx.aiUsage.count({ where: { userId: input.userId, admittedAt: { gte: new Date(input.now.getTime() - input.userWindowSeconds * 1000) } } }),
        tx.aiUsage.count({ where: { guildId: input.guildId, admittedAt: { gte: new Date(input.now.getTime() - input.guildWindowSeconds * 1000) } } }),
        tx.aiUsage.count({ where: { status: 'reserved' } }),
        tx.aiUsage.aggregate({ where: { budgetDay: input.now.toISOString().slice(0, 10) }, _sum: { reservedTokens: true, chargedTokens: true } })
      ]);
      if (userCount >= input.userLimit) return { admitted: false, reason: 'user_limit' };
      if (guildCount >= input.guildLimit) return { admitted: false, reason: 'guild_limit' };
      if (concurrent >= input.maxConcurrent) return { admitted: false, reason: 'concurrency' };
      const spent = (budget._sum.reservedTokens || 0) + (budget._sum.chargedTokens || 0);
      if (spent + input.reservedTokens > input.dailyBudget) return { admitted: false, reason: 'budget' };
      const usage = await tx.aiUsage.create({ data: {
        interactionId: input.interactionId, userId: input.userId, guildId: input.guildId,
        admittedAt: input.now, budgetDay: input.now.toISOString().slice(0, 10), status: 'reserved',
        reservedTokens: input.reservedTokens, recoveryAt: new Date(input.now.getTime() + input.recoverySeconds * 1000)
      }, select: { id: true } });
      return { admitted: true, usageId: usage.id };
    });
  }

  async completeAiUsage(usageId: number, tokenUsage?: number): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const usage = await tx.aiUsage.findUnique({ where: { id: usageId } });
      if (!usage || usage.status !== 'reserved') return false;
      const hasUsage = Number.isSafeInteger(tokenUsage) && tokenUsage! > 0;
      const verified = hasUsage && tokenUsage! <= usage.reservedTokens;
      await tx.aiUsage.update({ where: { id: usageId }, data: {
        status: verified ? 'completed' : 'uncertain',
        chargedTokens: hasUsage ? Math.max(tokenUsage!, usage.reservedTokens) : usage.reservedTokens,
        reservedTokens: 0,
        completedAt: new Date()
      } });
      return verified;
    });
  }

  async createAiResponse(data: { tokenHash: string; commandType: string; shortAnswer: string; detailedAnswer: string; expiresAt: Date }): Promise<void> {
    await this.prisma.aiResponse.create({ data });
  }

  async findAiResponse(tokenHash: string, now: Date): Promise<{ detailedAnswer: string; createdAt: Date; expiresAt: Date } | null> {
    return this.prisma.aiResponse.findFirst({
      where: { tokenHash, expiresAt: { gt: now } },
      select: { detailedAnswer: true, createdAt: true, expiresAt: true }
    });
  }

  async cleanupAiData(now: Date, usageBefore: Date, batchSize = 100): Promise<void> {
    const responses = await this.prisma.aiResponse.findMany({ where: { expiresAt: { lte: now } }, select: { id: true }, take: batchSize });
    if (responses.length) await this.prisma.aiResponse.deleteMany({ where: { id: { in: responses.map((item) => item.id) } } });
    const usages = await this.prisma.aiUsage.findMany({ where: { admittedAt: { lt: usageBefore }, status: { not: 'reserved' } }, select: { id: true }, take: batchSize });
    if (usages.length) await this.prisma.aiUsage.deleteMany({ where: { id: { in: usages.map((item) => item.id) } } });
  }

  // Get all guilds with tracker channels configured
  async getGuildsWithTrackers(): Promise<
    { guildId: string; channelId: string }[]
  > {
    const guilds = await this.prisma.guild.findMany({
      where: {
        trackerChannelId: {
          not: null
        }
      },
      select: {
        id: true,
        trackerChannelId: true
      }
    });

    return guilds
      .filter((guild) => guild.trackerChannelId !== null)
      .map((guild) => ({
        guildId: guild.id,
        channelId: guild.trackerChannelId!
      }));
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export default DatabaseService;
