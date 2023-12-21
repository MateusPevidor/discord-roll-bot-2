import { APIApplicationCommandOptionChoice, ChatInputCommandInteraction } from 'discord.js';
import { ICommand } from '../interfaces/command';
import { InteractionResponse } from 'discord.js';
import { create as MathCreate, all as MathAll } from 'mathjs';
import { MathJsChain, MathType, MathJsStatic } from 'mathjs';
import { generateSequenceArray, integerPartition } from '../utils';

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
}

type Barter = keyof typeof barterData;

class MinecraftOddsCommand extends ICommand {
  math: MathJsStatic;

  constructor() {
    super('mcodds', 'Calculates the odds of an event happening');

    const barterKeys = Object.keys(barterData) as Barter[];
    const barterChoices = barterKeys
      .map((key: Barter) => (
        { name: barterData[key].name, value: key }
      ));

    this.command
      .addSubcommand(subcommand => {
        return subcommand
          .setName('eye')
          .setDescription('Calculates the odds of a portal room be generated with x eyes')
          .addIntegerOption(option => {
            return option
              .setName('count')
              .setDescription('Number of eyes to be spawned')
              .setMinValue(0)
              .setMaxValue(12)
              .setRequired(true)
          })
          .addStringOption(option => {
            return option
              .setName('type')
              .setDescription(`Whether it's the odds of exactly, at least or at most x eyes`)
              .setRequired(true)
              .addChoices(
                { name: 'x or less', value: 'or_less' },
                { name: 'x or more', value: 'or_more' },
                { name: 'Exactly x', value: 'exact' }
              )
          })
      })
      .addSubcommand(subcommand => {
        return subcommand
          .setName('blaze')
          .setDescription('Calculates the odds of blaze drop rates')
          .addIntegerOption(option => {
            return option
              .setName('kills')
              .setDescription('Number of blazes killed')
              .setMinValue(0)
              .setRequired(true)
          })
          .addIntegerOption(option => {
            return option
              .setName('rods')
              .setDescription('Number of rods obtained')
              .setMinValue(0)
              .setRequired(true)
          })
          .addStringOption(option => {
            return option
              .setName('type')
              .setDescription(`Whether it's the odds of exactly, at least or at most x rods`)
              .setRequired(true)
              .addChoices(
                { name: 'x or less', value: 'or_less' },
                { name: 'x or more', value: 'or_more' },
                { name: 'Exactly x', value: 'exact' }
              )
          })
      })
      .addSubcommand(subcommand => {
        return subcommand
          .setName('flint')
          .setDescription('Calculates the odds of flint drop rates')
          .addIntegerOption(option => {
            return option
              .setName('gravels')
              .setDescription('Number of gravels dug')
              .setMinValue(0)
              .setRequired(true)
          })
          .addIntegerOption(option => {
            return option
              .setName('flints')
              .setDescription('Number of flints obtained')
              .setMinValue(0)
              .setRequired(true)
          })
          .addStringOption(option => {
            return option
              .setName('type')
              .setDescription(`Whether it's the odds of exactly, at least or at most x flints`)
              .setRequired(true)
              .addChoices(
                { name: 'x or less', value: 'or_less' },
                { name: 'x or more', value: 'or_more' },
                { name: 'Exactly x', value: 'exact' }
              )
          })
      })
      .addSubcommand(subcommand => {
        return subcommand
          .setName('barter')
          .setDescription('Calculates the odds of barter loot drop rates')
          .addIntegerOption(option => {
            return option
              .setName('trades')
              .setDescription('Number of ingots traded')
              .setMinValue(0)
              .setRequired(true)
          })
          .addIntegerOption(option => {
            return option
              .setName('drops')
              .setDescription('Number of drops obtained')
              .setMinValue(0)
              .setRequired(true)
          })
          .addStringOption(option => {
            return option
              .setName('loot')
              .setDescription(`Type of loot`)
              .setRequired(true)
              .addChoices(
                ...barterChoices
              )
          })
          .addStringOption(option => {
            return option
              .setName('type')
              .setDescription(`Whether it's the odds of exactly, at least or at most x drops`)
              .setRequired(true)
              .addChoices(
                { name: 'x or less', value: 'or_less' },
                { name: 'x or more', value: 'or_more' },
                { name: 'Exactly x', value: 'exact' }
              )
          })
      })

    this.subCommandMap.eye = this.eyeCommand.bind(this);
    this.subCommandMap.blaze = this.blazeCommand.bind(this);
    this.subCommandMap.flint = this.flintCommand.bind(this);
    this.subCommandMap.barter = this.barterCommand.bind(this);

    this.math = MathCreate(MathAll, { precision: 64, number: 'BigNumber' });
  }

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.member) {
      return interaction.reply(`Error`);
    }

    const subCommandName = interaction.options.getSubcommand();

    if (!(subCommandName in this.subCommandMap)) {
      return interaction.reply(`<@${interaction.user.id}> command parsing error`);
    }

    return this.subCommandMap[subCommandName](interaction);
  }

  eyeCommand(interaction: ChatInputCommandInteraction): Promise<InteractionResponse<boolean>> {
    const count = interaction.options.getInteger('count') || 0;
    const countType = interaction.options.getString('type')!;

    try {
      const result = this.calculateOdds(12, count, 0.1, countType);
      if (countType === 'or_less') {
        return interaction.reply(`<@${interaction.user.id}> Odds of ${count} or less eyes: ${result}%`);
      } else if (countType === 'or_more') {
        return interaction.reply(`<@${interaction.user.id}> Odds of ${count} or more eyes: ${result}%`);
      } else {
        return interaction.reply(`<@${interaction.user.id}> Odds of exactly ${count} eyes: ${result}%`);
      }
    } catch (err) {
      return interaction.reply(`<@${interaction.user.id}> Um erro ocorreu. Verifique seus inputs. (${err})`);
    }
  }

  blazeCommand(interaction: ChatInputCommandInteraction): Promise<InteractionResponse<boolean>> {
    const kills = interaction.options.getInteger('kills') || 0;
    const rods = interaction.options.getInteger('rods') || 0;
    const countType = interaction.options.getString('type')!;

    try {
      const result = this.calculateOdds(kills, rods, 0.5, countType);
      if (countType === 'or_less') {
        return interaction.reply(`<@${interaction.user.id}> Odds of dropping ${rods} or less rods from ${kills} blazes: ${result}%`);
      } else if (countType === 'or_more') {
        return interaction.reply(`<@${interaction.user.id}> Odds of dropping ${rods} or more rods from ${kills} blazes: ${result}%`);
      } else {
        return interaction.reply(`<@${interaction.user.id}> Odds of dropping exactly ${rods} rods from ${kills} blazes: ${result}%`);
      }
    } catch (err) {
      return interaction.reply(`<@${interaction.user.id}> Um erro ocorreu. Verifique seus inputs. (${err})`);
    }
  }

  flintCommand(interaction: ChatInputCommandInteraction): Promise<InteractionResponse<boolean>> {
    const gravels = interaction.options.getInteger('gravels') || 0;
    const flints = interaction.options.getInteger('flints') || 0;
    const countType = interaction.options.getString('type')!;

    try {
      const result = this.calculateOdds(gravels, flints, 0.1, countType);
      if (countType === 'or_less') {
        return interaction.reply(`<@${interaction.user.id}> Odds of dropping ${flints} or less flints from ${gravels} gravels: ${result}%`);
      } else if (countType === 'or_more') {
        return interaction.reply(`<@${interaction.user.id}> Odds of dropping ${flints} or more flints from ${gravels} gravels: ${result}%`);
      } else {
        return interaction.reply(`<@${interaction.user.id}> Odds of dropping exactly ${flints} flints from ${gravels} gravels: ${result}%`);
      }
    } catch (err) {
      return interaction.reply(`<@${interaction.user.id}> Um erro ocorreu. Verifique seus inputs. (${err})`);
    }
  }

  barterCommand(interaction: ChatInputCommandInteraction): Promise<InteractionResponse<boolean>> {
    const trades = interaction.options.getInteger('trades') || 0;
    const dropCount = interaction.options.getInteger('drops') || 0;
    const lootType = interaction.options.getString('loot') as Barter;
    const countType = interaction.options.getString('type')!;

    try {
      // const result = this.math.factorial(this.math.bignumber(200));
      console.time('command');
      const result = this.barterOdds(trades, dropCount, lootType, countType);
      console.timeEnd('command');
      return interaction.reply(`<@${interaction.user.id}> ${result}%`);
    } catch (err) {
      return interaction.reply(`<@${interaction.user.id}> Um erro ocorreu. Verifique seus inputs. (${err})`);
    }
    // try {
    //   const result = this.calculateOdds(gravels, flints, 0.1, countType);
    //   if (countType === 'or_less') {
    //     return interaction.reply(`<@${interaction.user.id}> Odds of dropping ${flints} or less flints from ${gravels} gravels: ${result}%`);
    //   } else if (countType === 'or_more') {
    //     return interaction.reply(`<@${interaction.user.id}> Odds of dropping ${flints} or more flints from ${gravels} gravels: ${result}%`);
    //   } else {
    //     return interaction.reply(`<@${interaction.user.id}> Odds of dropping exactly ${flints} flints from ${gravels} gravels: ${result}%`);
    //   }
    // } catch (err) {
    //   return interaction.reply(`<@${interaction.user.id}> Um erro ocorreu. Verifique seus inputs. (${err})`);
    // }
    return interaction.reply('oi');
  }

  barterOdds(trades: number, drops: number, loot: Barter, type: string) {
    if (drops > trades) throw new Error("Drops cannot be greater than Trades");
    const { pow, factorial, chain, bignumber, format } = this.math;

    const barter = barterData[loot];
    if (type === 'or_less') {
      let odds = chain(0) as MathJsChain<MathType>;
      for (let i = 0; i <= drops; i++) {
        console.time('part');
        const rounds = integerPartition(i, barter.amount);
        console.timeEnd('part');
        for (const round of rounds) {
          // console.time('round');
          const roundSum = round.reduce((acc, curr) => acc + curr, 0);

          let coefficient = chain(1)
            .multiply(factorial(bignumber(trades)))
            .divide(factorial(bignumber(trades - roundSum)));

          for (const repetition of round) {
            coefficient = coefficient.divide(factorial(bignumber(repetition)));
          }

          let iterationOdds = chain(1)
            .multiply(pow(bignumber(barter.odds), roundSum))
            .multiply(pow(bignumber(barter.inverseOdds), trades - roundSum))
            .multiply(coefficient.done());

          odds = odds.add(iterationOdds.done());
          // console.timeEnd('round');
        }
      }
      return format(odds.multiply(100).done(), { notation: 'fixed' });
    } else if (type === 'or_more') {
      let odds = chain(0) as MathJsChain<MathType>;
      for (let i = drops; i <= trades; i++) {
        const rounds = integerPartition(i, barter.amount);
        for (const round of rounds) {
          const roundSum = round.reduce((acc, curr) => acc + curr, 0);

          let coefficient = chain(1)
            .multiply(factorial(bignumber(trades)))
            .divide(factorial(bignumber(trades - roundSum)));

          for (const repetition of round) {
            coefficient = coefficient.divide(factorial(bignumber(repetition)));
          }

          let iterationOdds = chain(1)
            .multiply(pow(bignumber(barter.odds), roundSum))
            .multiply(pow(bignumber(barter.inverseOdds), trades - roundSum))
            .multiply(coefficient.done());

          odds = odds.add(iterationOdds.done());
        }
      }
      return format(odds.multiply(100).done(), { notation: 'fixed' });
    } else {
      // const odds = chain(100)
      //   .multiply(pow(bignumber(eventOdds), k))
      //   .multiply(pow(bignumber(1 - eventOdds), n - k))
      //   .multiply(combinations(n, k))
      //   .done();
      // return format(odds, { notation: 'fixed' });
    }

  }

  calculateOdds(n: number, k: number, eventOdds: number, type: string) {
    if (k > n) throw new Error("k cannot be greater than n");
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