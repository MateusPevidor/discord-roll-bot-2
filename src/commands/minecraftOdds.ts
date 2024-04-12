import { ChatInputCommandInteraction } from 'discord.js';
import { ICommand } from '../interfaces/command';
import { create as MathCreate, all as MathAll } from 'mathjs';
import { MathJsChain, MathType, MathJsStatic, BigNumber } from 'mathjs';
import { generateSequenceArray, integerPartition } from '../utils';

import Logger from '../decorators/executionLogger';

const barterData = {
  fireRes: {
    odds: 10 / 423,
    inverseOdds: 413 / 423,
    amount: generateSequenceArray(1, 1),
    name: 'Fire Resistance'
  },
  glowstone: {
    odds: 5 / 846,
    inverseOdds: 403 / 423,
    amount: generateSequenceArray(5, 12),
    name: 'Glowstone Dust'
  },
  pearl: {
    odds: 4 / 423,
    inverseOdds: 403 / 423,
    amount: generateSequenceArray(4, 8),
    name: 'Ender Pearl'
  },
  string: {
    odds: 20 / 7191,
    inverseOdds: 403 / 423,
    amount: generateSequenceArray(8, 24),
    name: 'String'
  },
  obsidian: {
    odds: 40 / 423,
    inverseOdds: 383 / 423,
    amount: generateSequenceArray(1, 1),
    name: 'Obsidian'
  },
  cryingObsidian: {
    odds: 40 / 1269,
    inverseOdds: 383 / 423,
    amount: generateSequenceArray(1, 3),
    name: 'Crying Obsidian'
  }
};

type Barter = keyof typeof barterData;

class MinecraftOddsCommand extends ICommand {
  math: MathJsStatic;
  approximate: boolean = false;

  constructor() {
    super('mcodds', 'Calculates the odds of an event happening');

    const barterKeys = Object.keys(barterData) as Barter[];
    const barterChoices = barterKeys.map((key: Barter) => ({
      name: barterData[key].name,
      value: key
    }));

    this.command
      .addSubcommand((subcommand) => {
        return subcommand
          .setName('eye')
          .setDescription(
            'Calculates the odds of a portal room be generated with x eyes'
          )
          .addIntegerOption((option) => {
            return option
              .setName('count')
              .setDescription('Number of eyes to be spawned')
              .setMinValue(0)
              .setMaxValue(12)
              .setRequired(true);
          })
          .addStringOption((option) => {
            return option
              .setName('type')
              .setDescription(
                `Whether it's the odds of exactly, at least or at most x eyes`
              )
              .setRequired(true)
              .addChoices(
                { name: 'x or less', value: 'or_less' },
                { name: 'x or more', value: 'or_more' },
                { name: 'Exactly x', value: 'exact' }
              );
          });
      })
      .addSubcommand((subcommand) => {
        return subcommand
          .setName('blaze')
          .setDescription('Calculates the odds of blaze drop rates')
          .addIntegerOption((option) => {
            return option
              .setName('kills')
              .setDescription('Number of blazes killed')
              .setMinValue(0)
              .setRequired(true);
          })
          .addIntegerOption((option) => {
            return option
              .setName('rods')
              .setDescription('Number of rods obtained')
              .setMinValue(0)
              .setRequired(true);
          })
          .addStringOption((option) => {
            return option
              .setName('type')
              .setDescription(
                `Whether it's the odds of exactly, at least or at most x rods`
              )
              .setRequired(true)
              .addChoices(
                { name: 'x or less', value: 'or_less' },
                { name: 'x or more', value: 'or_more' },
                { name: 'Exactly x', value: 'exact' }
              );
          });
      })
      .addSubcommand((subcommand) => {
        return subcommand
          .setName('flint')
          .setDescription('Calculates the odds of flint drop rates')
          .addIntegerOption((option) => {
            return option
              .setName('gravels')
              .setDescription('Number of gravels dug')
              .setMinValue(0)
              .setRequired(true);
          })
          .addIntegerOption((option) => {
            return option
              .setName('flints')
              .setDescription('Number of flints obtained')
              .setMinValue(0)
              .setRequired(true);
          })
          .addStringOption((option) => {
            return option
              .setName('type')
              .setDescription(
                `Whether it's the odds of exactly, at least or at most x flints`
              )
              .setRequired(true)
              .addChoices(
                { name: 'x or less', value: 'or_less' },
                { name: 'x or more', value: 'or_more' },
                { name: 'Exactly x', value: 'exact' }
              );
          });
      })
      .addSubcommand((subcommand) => {
        return subcommand
          .setName('barter')
          .setDescription('Calculates the odds of barter loot drop rates')
          .addIntegerOption((option) => {
            return option
              .setName('trades')
              .setDescription('Number of ingots traded')
              .setMinValue(0)
              .setRequired(true);
          })
          .addIntegerOption((option) => {
            return option
              .setName('drops')
              .setDescription('Number of drops obtained')
              .setMinValue(0)
              .setRequired(true);
          })
          .addStringOption((option) => {
            return option
              .setName('loot')
              .setDescription(`Type of loot`)
              .setRequired(true)
              .addChoices(...barterChoices);
          })
          .addStringOption((option) => {
            return option
              .setName('type')
              .setDescription(
                `Whether it's the odds of exactly, at least or at most x drops`
              )
              .setRequired(true)
              .addChoices(
                { name: 'x or less', value: 'or_less' },
                { name: 'x or more', value: 'or_more' },
                { name: 'Exactly x', value: 'exact' }
              );
          });
      });

    this.subCommandMap.eye = this.eyeCommand.bind(this);
    this.subCommandMap.blaze = this.blazeCommand.bind(this);
    this.subCommandMap.flint = this.flintCommand.bind(this);
    this.subCommandMap.barter = this.barterCommand.bind(this);

    this.math = MathCreate(MathAll, { precision: 64, number: 'BigNumber' });
  }

  @Logger
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.member) {
      return interaction.reply(`Error`);
    }

    this.approximate = false;

    const subCommandName = interaction.options.getSubcommand();

    if (!(subCommandName in this.subCommandMap)) {
      return interaction.reply(
        `<@${interaction.user.id}> command parsing error`
      );
    }

    return this.subCommandMap[subCommandName](interaction);
  }

  async eyeCommand(interaction: ChatInputCommandInteraction) {
    const count = interaction.options.getInteger('count') || 0;
    const countType = interaction.options.getString('type')!;

    try {
      const result = this.calculateOdds(12, count, 0.1, countType);
      if (countType === 'or_less') {
        return await interaction.reply(
          `<@${interaction.user.id}> Odds of ${count} or less eyes: ${result}%`
        );
      } else if (countType === 'or_more') {
        return await interaction.reply(
          `<@${interaction.user.id}> Odds of ${count} or more eyes: ${result}%`
        );
      } else {
        return await interaction.reply(
          `<@${interaction.user.id}> Odds of exactly ${count} eyes: ${result}%`
        );
      }
    } catch (err) {
      return await interaction.reply(
        `<@${interaction.user.id}> Um erro ocorreu. Verifique seus inputs. (${err})`
      );
    }
  }

  async blazeCommand(interaction: ChatInputCommandInteraction) {
    const kills = interaction.options.getInteger('kills') || 0;
    const rods = interaction.options.getInteger('rods') || 0;
    const countType = interaction.options.getString('type')!;

    try {
      const result = this.calculateOdds(kills, rods, 0.5, countType);
      if (countType === 'or_less') {
        return await interaction.reply(
          `<@${interaction.user.id}> Odds of dropping ${rods} or less rods from ${kills} blazes: ${result}%`
        );
      } else if (countType === 'or_more') {
        return await interaction.reply(
          `<@${interaction.user.id}> Odds of dropping ${rods} or more rods from ${kills} blazes: ${result}%`
        );
      } else {
        return await interaction.reply(
          `<@${interaction.user.id}> Odds of dropping exactly ${rods} rods from ${kills} blazes: ${result}%`
        );
      }
    } catch (err) {
      return await interaction.reply(
        `<@${interaction.user.id}> Um erro ocorreu. Verifique seus inputs. (${err})`
      );
    }
  }

  async flintCommand(interaction: ChatInputCommandInteraction) {
    const gravels = interaction.options.getInteger('gravels') || 0;
    const flints = interaction.options.getInteger('flints') || 0;
    const countType = interaction.options.getString('type')!;

    try {
      const result = this.calculateOdds(gravels, flints, 0.1, countType);
      if (countType === 'or_less') {
        return await interaction.reply(
          `<@${interaction.user.id}> Odds of dropping ${flints} or less flints from ${gravels} gravels: ${result}%`
        );
      } else if (countType === 'or_more') {
        return await interaction.reply(
          `<@${interaction.user.id}> Odds of dropping ${flints} or more flints from ${gravels} gravels: ${result}%`
        );
      } else {
        return await interaction.reply(
          `<@${interaction.user.id}> Odds of dropping exactly ${flints} flints from ${gravels} gravels: ${result}%`
        );
      }
    } catch (err) {
      return await interaction.reply(
        `<@${interaction.user.id}> Um erro ocorreu. Verifique seus inputs. (${err})`
      );
    }
  }

  async barterCommand(interaction: ChatInputCommandInteraction) {
    const trades = interaction.options.getInteger('trades') || 0;
    const dropCount = interaction.options.getInteger('drops') || 0;
    const lootType = interaction.options.getString('loot') as Barter;
    const countType = interaction.options.getString('type')!;

    const barter = barterData[lootType];

    try {
      await interaction.reply(`<@${interaction.user.id}> Calculating...`);

      const result = this.barterOdds(trades, dropCount, lootType, countType);

      if (countType === 'or_less') {
        return await interaction.editReply(
          `<@${interaction.user.id}> Odds of dropping ${dropCount} or less ${
            barter.name
          } from ${trades} trades: ${result}%${
            this.approximate ? ' (Approximate)' : ''
          }`
        );
      } else if (countType === 'or_more') {
        return await interaction.editReply(
          `<@${interaction.user.id}> Odds of dropping ${dropCount} or more ${
            barter.name
          } from ${trades} trades: ${result}%${
            this.approximate ? ' (Approximate)' : ''
          }`
        );
      } else {
        return await interaction.editReply(
          `<@${interaction.user.id}> Odds of dropping exactly ${dropCount} ${barter.name} from ${trades} trades: ${result}%`
        );
      }
    } catch (err) {
      return await interaction.editReply(
        `<@${interaction.user.id}> Um erro ocorreu. Verifique seus inputs. (${err})`
      );
    }
  }

  barterOdds(trades: number, drops: number, loot: Barter, type: string) {
    const barter = barterData[loot];

    if (drops > trades * barter.amount.at(-1)!)
      throw new Error('Drops cannot be greater than Trades');
    const { pow, factorial, chain, bignumber, format, compare } = this.math;

    const factorialTable: BigNumber[] = [];
    function getFactorial(n: number) {
      if (n in factorialTable) {
        return factorialTable[n];
      } else {
        const result = factorial<BigNumber>(bignumber(n));
        factorialTable[n] = result;
        return result;
      }
    }

    const roundsTable: Map<string, MathType> = new Map<string, MathType>();
    function getRound(numbers: number[]) {
      const key = numbers.sort().join(',');
      if (roundsTable.has(key)) {
        return roundsTable.get(key)!;
      } else {
        const roundSum = numbers.reduce((acc, curr) => acc + curr, 0);

        if (trades - roundSum < 0) return 0;

        let coefficient = chain(1)
          .multiply(getFactorial(trades))
          .divide(getFactorial(trades - roundSum));

        for (const repetition of numbers) {
          coefficient = coefficient.divide(getFactorial(repetition));
        }

        const iterationOdds = chain(1)
          .multiply(pow(bignumber(barter.odds), roundSum))
          .multiply(pow(bignumber(barter.inverseOdds), trades - roundSum))
          .multiply(coefficient.done())
          .done();

        roundsTable.set(key, iterationOdds);

        return iterationOdds;
      }
    }

    if (type === 'or_less') {
      let odds = chain(0) as MathJsChain<MathType>;
      for (let i = 0; i <= drops; i++) {
        const rounds = integerPartition(i, barter.amount);

        if (rounds.length > 200000) {
          this.approximate = true;
          break;
        }

        let roundOdds: MathType = 0;
        for (const round of rounds) {
          roundOdds = getRound(round);
          odds = odds.add(roundOdds);
        }
        if (compare(roundOdds, bignumber(1e-20)) == -1 && rounds.length > 1) {
          this.approximate = true;
          break;
        }
      }
      return format(odds.multiply(100).done(), {
        notation: 'fixed',
        precision: 10
      });
    } else if (type === 'or_more') {
      let odds = chain(1) as MathJsChain<MathType>;
      for (let i = 0; i <= drops - 1; i++) {
        const rounds = integerPartition(i, barter.amount);

        if (rounds.length > 200000) {
          this.approximate = true;
          break;
        }

        let roundOdds: MathType = 0;
        for (const round of rounds) {
          roundOdds = getRound(round);
          odds = odds.subtract(roundOdds);
        }
        if (compare(roundOdds, bignumber(1e-20)) == -1 && rounds.length > 1) {
          this.approximate = true;
          break;
        }
      }
      return format(odds.multiply(100).done(), {
        notation: 'fixed',
        precision: 10
      });
    } else {
      let odds = chain(0) as MathJsChain<MathType>;
      const rounds = integerPartition(drops, barter.amount);

      for (const round of rounds) {
        odds = odds.add(getRound(round));
      }
      return format(odds.multiply(100).done(), {
        notation: 'fixed',
        precision: 10
      });
    }
  }

  calculateOdds(n: number, k: number, eventOdds: number, type: string) {
    if (k > n) throw new Error('k cannot be greater than n');
    const { pow, combinations, chain, bignumber, format } = this.math;

    if (type === 'or_less') {
      let odds = chain(0) as MathJsChain<MathType>;
      for (let i = 0; i <= k; i++) {
        const iterationOdds = chain(1)
          .multiply(pow(bignumber(eventOdds), i))
          .multiply(pow(bignumber(1 - eventOdds), n - i))
          .multiply(combinations(n, i));
        odds = odds.add(iterationOdds.done());
      }
      return format(odds.multiply(100).done(), { notation: 'fixed' });
    } else if (type === 'or_more') {
      let odds = chain(0) as MathJsChain<MathType>;
      for (let i = 0; i < n - k + 1; i++) {
        const iterationOdds = chain(1)
          .multiply(pow(bignumber(eventOdds), k + i))
          .multiply(pow(bignumber(1 - eventOdds), n - (k + i)))
          .multiply(combinations(n, k + i));
        odds = odds.add(iterationOdds.done());
      }
      return format(odds.multiply(100).done(), { notation: 'fixed' });
    } else {
      const odds = chain(100)
        .multiply(pow(bignumber(eventOdds), k))
        .multiply(pow(bignumber(1 - eventOdds), n - k))
        .multiply(combinations(n, k))
        .done();
      return format(odds, { notation: 'fixed' });
    }
  }
}

export { MinecraftOddsCommand };
