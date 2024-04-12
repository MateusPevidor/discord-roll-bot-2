import { ChatInputCommandInteraction } from 'discord.js';
import { ICommand } from '../interfaces/command';
import MyIpApi, { MyIpResponse } from '../services/ipinfo';
import { words } from '../utils/wordList';

import Logger from '../decorators/executionLogger';

class ConnectionCommand extends ICommand {
  constructor() {
    super('connection', 'Retrieves connection code for the bot.');
  }

  @Logger
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const response = await MyIpApi.get<MyIpResponse>('/');
      const { ip } = response.data;

      const ipWords: string = ip
        .split('.')
        .map((octet) => {
          return words[parseInt(octet)];
        })
        .join(' ');

      const userId = interaction.user.id;

      return interaction.reply({
        content: `${ipWords} ${userId}`,
        ephemeral: true
      });
    } catch (err) {
      console.log(err);
      return interaction.reply('Failed to retrieve connection code.');
    }
  }
}

export { ConnectionCommand };
