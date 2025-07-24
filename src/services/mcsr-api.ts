import axios from 'axios';

export interface MCSRMatch {
  id: number;
  type: number;
  seed: {
    id: string;
    overworld: string;
    nether: string;
    endTowers: number[];
    variations: string[];
  };
  category: string;
  gameMode: string;
  players: MCSRPlayer[];
  spectators: any[];
  result: {
    uuid: string | null;
    time: number;
  };
  forfeited: boolean;
  decayed: boolean;
  rank: {
    season: number | null;
    allTime: number | null;
  };
  vod: any[];
  changes: {
    uuid: string;
    change: number;
    eloRate: number;
  }[];
  beginner: boolean;
  botSource: string | null;
  season: number;
  date: number;
  seedType: string;
  bastionType: string;
  tag: string | null;
}

export interface MCSRPlayer {
  uuid: string;
  nickname: string;
  roleType: number;
  eloRate: number;
  eloRank: number;
  country: string | null;
  seasonResult?: {
    eloRate: number;
    eloRank: number;
    phasePoint: number;
  };
}

export interface MCSRMatchesResponse {
  status: string;
  data: MCSRMatch[];
}

export interface MCSRLeaderboardResponse {
  status: string;
  data: {
    season: {
      startsAt: number;
      endsAt: number;
      number: number;
    };
    users: MCSRPlayer[];
  };
}

class MCSRApiService {
  private static instance: MCSRApiService;
  private readonly baseUrl = 'https://mcsrranked.com/api';
  private readonly axiosInstance;

  private constructor() {
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'User-Agent': 'Discord-Bot-Tracker/1.0'
      }
    });
  }

  public static getInstance(): MCSRApiService {
    if (!MCSRApiService.instance) {
      MCSRApiService.instance = new MCSRApiService();
    }
    return MCSRApiService.instance;
  }

  async getRecentMatches(): Promise<MCSRMatch[]> {
    try {
      const response = await this.axiosInstance.get<MCSRMatchesResponse>(
        '/matches?type=2'
      );

      if (response.data.status !== 'success') {
        throw new Error(
          `API returned non-success status: ${response.data.status}`
        );
      }

      return response.data.data;
    } catch (error) {
      console.error('Error fetching recent matches:', error);
      throw new Error(
        `Failed to fetch recent matches: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Fetches players from a specific country
   * @param countryCode ISO 3166-1 alpha-2 country code (lowercase)
   */
  async getPlayersByCountry(countryCode: string): Promise<MCSRPlayer[]> {
    try {
      const normalizedCountryCode = countryCode.toLowerCase();
      const response = await this.axiosInstance.get<MCSRLeaderboardResponse>(
        `/leaderboard?country=${normalizedCountryCode}`
      );

      if (response.data.status !== 'success') {
        throw new Error(
          `API returned non-success status: ${response.data.status}`
        );
      }

      return response.data.data.users;
    } catch (error) {
      console.error(
        `Error fetching players for country ${countryCode}:`,
        error
      );
      throw new Error(
        `Failed to fetch players for country ${countryCode}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  isPlayerInMatch(match: MCSRMatch, playerName: string): boolean {
    return match.players.some(
      (player) => player.nickname.toLowerCase() === playerName.toLowerCase()
    );
  }

  isCountryInMatch(match: MCSRMatch, countryCode: string): boolean {
    const normalizedCountryCode = countryCode.toLowerCase();
    return match.players.some(
      (player) => player.country?.toLowerCase() === normalizedCountryCode
    );
  }

  getPlayerFromMatch(match: MCSRMatch, playerName: string): MCSRPlayer | null {
    return (
      match.players.find(
        (player) => player.nickname.toLowerCase() === playerName.toLowerCase()
      ) || null
    );
  }

  getPlayersFromCountryInMatch(
    match: MCSRMatch,
    countryCode: string
  ): MCSRPlayer[] {
    const normalizedCountryCode = countryCode.toLowerCase();
    return match.players.filter(
      (player) => player.country?.toLowerCase() === normalizedCountryCode
    );
  }

  formatMatchTime(timeMs: number): string {
    const totalSeconds = Math.floor(timeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = timeMs % 1000;

    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds
        .toString()
        .padStart(3, '0')}`;
    } else {
      return `${seconds}.${milliseconds.toString().padStart(3, '0')}`;
    }
  }

  formatMatchDate(unixTimestamp: number): string {
    const date = new Date(unixTimestamp * 1000);
    return date.toLocaleString();
  }
}

export default MCSRApiService;
