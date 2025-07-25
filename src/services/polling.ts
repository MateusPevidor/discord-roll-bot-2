import { Client, TextChannel } from 'discord.js';
import MatchTrackingService from './match-tracking';

class PollingService {
  private static instance: PollingService;
  private trackingService: MatchTrackingService;
  private client: Client;
  private pollingInterval: NodeJS.Timeout | null = null;
  private isPolling = false;

  private constructor(client: Client) {
    this.client = client;
    this.trackingService = MatchTrackingService.getInstance();
  }

  public static getInstance(client: Client): PollingService {
    if (!PollingService.instance) {
      PollingService.instance = new PollingService(client);
    }
    return PollingService.instance;
  }

  /**
   * Starts polling for new matches
   * @param intervalSeconds How often to check for new matches (in seconds)
   */
  startPolling(intervalSeconds: number = 5): void {
    if (this.isPolling) {
      return;
    }

    this.isPolling = true;

    this.checkAndNotify();
    this.pollingInterval = setInterval(() => {
      this.checkAndNotify();
    }, intervalSeconds * 1000);
  }

  stopPolling(): void {
    if (!this.isPolling) {
      return;
    }

    this.isPolling = false;

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private async checkAndNotify(): Promise<void> {
    try {
      const notifications = await this.trackingService.checkForNewMatches();

      if (notifications.length === 0) {
        return;
      }

      for (const notification of notifications) {
        await this.sendNotification(notification);
      }
    } catch (error) {
      console.error('Error during polling check:', error);
    }
  }

  private async sendNotification(notification: any): Promise<void> {
    try {
      const channel = this.client.channels.cache.get(notification.channelId);

      if (!channel || !channel.isTextBased()) {
        console.error(
          `Channel ${notification.channelId} not found or not text-based`
        );
        return;
      }

      const embed = this.trackingService.generateMatchEmbed(notification);
      await (channel as TextChannel).send(embed);
    } catch (error) {
      console.error(error);
    }
  }

  async manualCheck(): Promise<void> {
    await this.checkAndNotify();
  }

  getStatus(): { isPolling: boolean; intervalSeconds?: number } {
    return {
      isPolling: this.isPolling,
      intervalSeconds: this.pollingInterval ? 5 : undefined // Default interval
    };
  }
}

export default PollingService;
