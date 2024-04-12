import { ChatInputCommandInteraction } from 'discord.js';
import { ICommand } from '../interfaces/command';

import Logger from '../decorators/executionLogger';

class PingCommand extends ICommand {
  constructor() {
    super('ping', 'Pings the bot');
  }

  @Logger
  async execute(interaction: ChatInputCommandInteraction) {
    return interaction.reply('Pong!');
  }
}

export { PingCommand };
