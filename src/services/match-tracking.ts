import DatabaseService from './database';
import MCSRApiService, { MCSRMatch } from './mcsr-api';

export interface MatchNotification {
  guildId: string;
  channelId: string;
  match: MCSRMatch;
  trackedPlayers: string[];
  trackedCountries: string[];
}

class MatchTrackingService {
  private static instance: MatchTrackingService;
  private db: DatabaseService;
  private api: MCSRApiService;

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.api = MCSRApiService.getInstance();
  }

  public static getInstance(): MatchTrackingService {
    if (!MatchTrackingService.instance) {
      MatchTrackingService.instance = new MatchTrackingService();
    }
    return MatchTrackingService.instance;
  }

  async checkForNewMatches(): Promise<MatchNotification[]> {
    try {
      const recentMatches = await this.api.getRecentMatches();

      const notifications: MatchNotification[] = [];

      const guildsWithTrackers = await this.getGuildsWithTrackers();

      for (const { guildId, channelId } of guildsWithTrackers) {
        const { players: trackedPlayers, countries: trackedCountries } =
          await this.db.getTrackedPlayers(guildId);

        if (trackedPlayers.length === 0 && trackedCountries.length === 0) {
          continue;
        }

        for (const match of recentMatches) {
          if (await this.db.isMatchSent(guildId, match.id.toString())) {
            continue;
          }

          // Check if this match involves any tracked players or countries
          const matchedPlayers = this.getMatchedPlayers(match, trackedPlayers);
          const matchedCountries = this.getMatchedCountries(
            match,
            trackedCountries
          );

          if (matchedPlayers.length > 0 || matchedCountries.length > 0) {
            notifications.push({
              guildId,
              channelId,
              match,
              trackedPlayers: matchedPlayers,
              trackedCountries: matchedCountries
            });

            await this.db.markMatchAsSent(guildId, match.id.toString());
          }
        }
      }

      return notifications;
    } catch (error) {
      console.error('Error checking for new matches:', error);
      return [];
    }
  }

  private async getGuildsWithTrackers(): Promise<
    { guildId: string; channelId: string }[]
  > {
    return await this.db.getGuildsWithTrackers();
  }

  private getMatchedPlayers(
    match: MCSRMatch,
    trackedPlayers: string[]
  ): string[] {
    const matchedPlayers: string[] = [];

    for (const trackedPlayer of trackedPlayers) {
      if (this.api.isPlayerInMatch(match, trackedPlayer)) {
        matchedPlayers.push(trackedPlayer);
      }
    }

    return matchedPlayers;
  }

  private getMatchedCountries(
    match: MCSRMatch,
    trackedCountries: string[]
  ): string[] {
    const matchedCountries: string[] = [];

    for (const trackedCountry of trackedCountries) {
      if (this.api.isCountryInMatch(match, trackedCountry)) {
        matchedCountries.push(trackedCountry);
      }
    }

    return matchedCountries;
  }

  generateMatchEmbed(notification: MatchNotification): any {
    const { match, trackedPlayers, trackedCountries } = notification;

    const winner = match.players.find((p) => p.uuid === match.result.uuid);
    const loser = match.players.find((p) => p.uuid !== match.result.uuid);

    const timeFormatted = this.api.formatMatchTime(match.result.time);

    let title = '🏆 **MCSR Ranked Match**';
    if (match.forfeited) {
      title = '⚠️ **MCSR Ranked Match (Forfeited)**';
    }

    let description = '';

    if (trackedPlayers.length > 0) {
      description += `**Tracked Players:** ${trackedPlayers.join(', ')}\n`;
    }

    if (trackedCountries.length > 0) {
      description += `**Tracked Countries:** ${trackedCountries
        .map((c) => c.toUpperCase())
        .join(', ')}\n`;
    }

    description += '\n';

    if (winner && loser) {
      const winnerFlag = winner.country ? `:flag_${winner.country}:` : '🏳️';
      const loserFlag = loser.country ? `:flag_${loser.country}:` : '🏳️';

      description += `**Winner:** ${winnerFlag} **${winner.nickname}** (${
        winner.eloRate
      } → ${
        winner.eloRate +
        (match.changes.find((c) => c.uuid === winner.uuid)?.change || 0)
      })\n`;
      description += `**Loser:** ${loserFlag} **${loser.nickname}** (${
        loser.eloRate
      } → ${
        loser.eloRate +
        (match.changes.find((c) => c.uuid === loser.uuid)?.change || 0)
      })\n`;

      if (!match.forfeited) {
        description += `**Time:** ${timeFormatted}\n`;
      }
    }

    description += `**Seed Type:** ${match.seedType}\n`;
    description += `**Bastion Type:** ${match.bastionType}\n`;
    description += `**Date:** ${this.api.formatMatchDate(match.date)}\n`;

    return {
      embeds: [
        {
          title,
          description,
          color: match.forfeited ? 0xffa500 : 0x00ff00, // Orange for forfeited, green for completed
          footer: {
            text: `Match ID: ${match.id} | Season ${match.season}`
          },
          timestamp: new Date(match.date * 1000).toISOString()
        }
      ]
    };
  }
}

export default MatchTrackingService;
