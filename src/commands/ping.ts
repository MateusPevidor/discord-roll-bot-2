import { ChatInputCommandInteraction } from 'discord.js';
import { ICommand } from '../interfaces/command';

class PingCommand extends ICommand {
  constructor() {
    super('ping', 'Pings the bot');
  }

  async execute(interaction: ChatInputCommandInteraction) {
    return interaction.reply('Pong!');
  }
}

export { PingCommand };
