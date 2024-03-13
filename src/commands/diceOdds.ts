import { ChatInputCommandInteraction } from 'discord.js';
import { ICommand } from '../interfaces/command';
import { MathJsChain, MathJsStatic, MathType } from 'mathjs';
import { create as MathCreate, all as MathAll } from 'mathjs';

class DiceOddsCommand extends ICommand {
  math: MathJsStatic;

  constructor() {
    super('diceodds', 'Calculates the odds of rolling dice.');
    this.command.addIntegerOption(option => {
      return option
        .setName('faces')
        .setDescription('Number of faces of the dice')
        .setMinValue(2)
        .setRequired(true);
    });
    this.command.addIntegerOption(option => {
      return option
        .setName('hits')
        .setDescription('Number of hits')
        .setRequired(true);
    });

    this.math = MathCreate(MathAll, { precision: 64, number: 'BigNumber' });
  }

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.member) {
      return await interaction.reply(`Error`);
    }
    const faces = interaction.options.getInteger('faces');
    const hitCount = interaction.options.getInteger('hits');

    if (!faces || !hitCount) {
      return await interaction.reply(`Error`);
    }

    const odds = this.calculateOdds(faces, hitCount);

    return await interaction.reply(`<@${interaction.user.id}> Odds of hitting a specific value ${hitCount} times on a d${faces}: ${odds}%`);
  }

  calculateOdds(faces: number, hits: number) {
    const { chain, bignumber, format } = this.math;

    let odds = chain(bignumber(1)) as MathJsChain<MathType>;

    for (let i = 0; i < hits; i++) {
      odds = odds.divide(bignumber(faces));
    }

    return format(odds.multiply(100).done(), { notation: 'fixed', precision: 10 });
  }
}

export { DiceOddsCommand };
