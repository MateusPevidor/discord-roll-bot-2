import { ChatInputCommandInteraction } from 'discord.js';
import { ICommand } from '../interfaces/command';
import { InteractionResponse } from 'discord.js';
import { create as MathCreate, all as MathAll } from 'mathjs';
import { MathJsChain, MathType, MathJsStatic } from 'mathjs';

class MinecraftOddsCommand extends ICommand {
  math: MathJsStatic;

  constructor() {
    super('mcodds', 'Calculates the odds of an event happening');
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
          .addBooleanOption(option => {
            return option
              .setName('exact')
              .setDescription(`Whether it's the odds of exactly x eyes or at least x eyes`)
              .setRequired(true)
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
          .addBooleanOption(option => {
            return option
              .setName('exact')
              .setDescription(`Whether it's the odds of exactly x rods or at least x rods`)
              .setRequired(true)
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
          .addBooleanOption(option => {
            return option
              .setName('exact')
              .setDescription(`Whether it's the odds of exactly x flints or at least x flints`)
              .setRequired(true)
          })
      })

    this.subCommandMap.eye = this.eyeCommand.bind(this);
    this.subCommandMap.blaze = this.blazeCommand.bind(this);
    this.subCommandMap.flint = this.flintCommand.bind(this);

    this.math = MathCreate(MathAll, { precision: 32, number: 'BigNumber' });
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
    const exact = !!interaction.options.getBoolean('exact');
    console.log(exact);

    const result = this.calculateOdds(12, count, 0.1, !exact);
    if (!exact) {
      return interaction.reply(`<@${interaction.user.id}> Odds of at least ${count} eye: ${result}%`)
    } else {
      return interaction.reply(`<@${interaction.user.id}> Odds of exactly ${count} eye: ${result}%`)
    }
  }

  blazeCommand(interaction: ChatInputCommandInteraction): Promise<InteractionResponse<boolean>> {
    const kills = interaction.options.getInteger('kills') || 0;
    const rods = interaction.options.getInteger('rods') || 0;
    const exact = !!interaction.options.getBoolean('exact');

    const result = this.calculateOdds(kills, rods, 0.5, !exact);
    if (!exact) {
      return interaction.reply(`<@${interaction.user.id}> Odds of dropping at least ${rods} rods from ${kills} blazes: ${result}%`);
    } else {
      return interaction.reply(`<@${interaction.user.id}> Odds of dropping exactly ${rods} rods from ${kills} blazes: ${result}%`);
    }
  }

  flintCommand(interaction: ChatInputCommandInteraction): Promise<InteractionResponse<boolean>> {
    const gravels = interaction.options.getInteger('gravels') || 0;
    const flints = interaction.options.getInteger('flints') || 0;
    const exact = !!interaction.options.getBoolean('exact');

    const result = this.calculateOdds(gravels, flints, 0.1, !exact);
    if (!exact) {
      return interaction.reply(`<@${interaction.user.id}> Odds of dropping at least ${flints} flints from ${gravels} gravels: ${result}%`);
    } else {
      return interaction.reply(`<@${interaction.user.id}> Odds of dropping exactly ${flints} flints from ${gravels} gravels: ${result}%`);
    }
  }

  calculateOdds(n: number, k: number, eventOdds: number, expand = false) {
    const { pow, combinations, chain, bignumber, format } = this.math;

    if (expand) {
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