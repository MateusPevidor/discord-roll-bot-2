import { ChatInputCommandInteraction } from 'discord.js';
import { ICommand } from '../interfaces/command';

import { calculateOdds } from './helpers/diceOddsHelper';

import Logger from '../decorators/executionLogger';

class DiceOddsCommand extends ICommand {
  constructor() {
    super('diceodds', 'Calculates the odds of rolling dice.');
    this.command.addIntegerOption((option) => {
      return option
        .setName('faces')
        .setDescription('Number of faces of the dice')
        .setMinValue(2)
        .setRequired(true);
    });
    this.command.addIntegerOption((option) => {
      return option
        .setName('hits')
        .setDescription('Number of hits')
        .setRequired(true);
    });
  }

  @Logger
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.user) {
      return await interaction.reply(`Error`);
    }
    const faces = interaction.options.getInteger('faces');
    const hitCount = interaction.options.getInteger('hits');

    if (!faces || !hitCount) {
      return await interaction.reply(`Error`);
    }

    const odds = calculateOdds(faces, hitCount);

    return await interaction.reply(
      `<@${interaction.user.id}> Odds of hitting a specific value ${hitCount} times on a d${faces}: ${odds}%`
    );
  }
}

export { DiceOddsCommand };
