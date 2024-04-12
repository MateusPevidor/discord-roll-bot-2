import { ChatInputCommandInteraction } from 'discord.js';
import { ICommand } from '../interfaces/command';

import Logger from '../decorators/executionLogger';

class RollCommand extends ICommand {
  constructor() {
    super('roll', 'Rolls between 1 and 100 (or the defined limit) inclusive.');
    this.command.addIntegerOption((option) => {
      return option.setName('limit').setDescription('Upper limit');
    });
  }

  @Logger
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.member) {
      return await interaction.reply(`Error`);
    }
    const limit = interaction.options.getInteger('limit') || 100;
    const roll = Math.floor(Math.random() * limit) + 1;

    return await interaction.reply(`<@${interaction.user.id}> rolled ${roll}`);
  }
}

export { RollCommand };
