import { ChatInputCommandInteraction } from 'discord.js';
import { ICommand } from '../interfaces/command';
import Logger from '../decorators/execution-logger';
import { calculateDiceOdds } from '../domain/general/calculate-dice-odds';

class DiceOddsCommand extends ICommand {
  constructor() {
    super('diceodds', 'Calculates the odds of rolling dice.');

    this.command.addIntegerOption((option) =>
      option
        .setName('faces')
        .setDescription('Number of faces of the dice')
        .setMinValue(2)
        .setRequired(true)
    );

    this.command.addIntegerOption((option) =>
      option.setName('hits').setDescription('Number of hits').setRequired(true)
    );
  }

  @Logger
  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user?.id;
    if (!userId) return await interaction.reply('User not found');

    const faces = interaction.options.getInteger('faces', true);
    const hitCount = interaction.options.getInteger('hits', true);

    const odds = calculateDiceOdds(faces, hitCount);

    return await interaction.reply(
      `<@${userId}> Odds of hitting a specific value ${hitCount} times on a d${faces}: ${odds}%`
    );
  }
}

export { DiceOddsCommand };
