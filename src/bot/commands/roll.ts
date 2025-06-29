import { ChatInputCommandInteraction } from 'discord.js';
import { ICommand } from '../interfaces/command';
import Logger from '../decorators/execution-logger';
import { roll } from '../domain/general/roll';

export class RollCommand extends ICommand {
  constructor() {
    super('roll', 'Rolls between 1 and 100 (or the defined limit) inclusive.');
    this.command.addIntegerOption((option) => {
      return option.setName('limit').setDescription('Upper limit');
    });
  }

  @Logger
  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user?.id;
    if (!userId) {
      return await interaction.reply('Error');
    }

    const limit = interaction.options.getInteger('limit') || 100;
    const result = roll(limit);

    return await interaction.reply(`<@${userId}> rolled ${result}`);
  }
}
