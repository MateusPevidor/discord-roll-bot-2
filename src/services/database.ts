import { PrismaClient } from '@prisma/client';

class DatabaseService {
  private static instance: DatabaseService;
  private prisma: PrismaClient;

  private constructor() {
    this.prisma = new PrismaClient();
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
