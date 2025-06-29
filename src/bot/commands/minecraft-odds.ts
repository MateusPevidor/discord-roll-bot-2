import { ChatInputCommandInteraction } from 'discord.js';
import { ICommand } from '../interfaces/command';

import { calculateEyeOdds } from '../domain/minecraft/calculate-eyes-odds';
import { calculateBlazeOdds } from '../domain/minecraft/calculate-blaze-odds';
import { calculateFlintOdds } from '../domain/minecraft/calculate-flint-odds';

import { Barter, barterData } from '../domain/minecraft/common/odds-core';

import Logger from '../decorators/execution-logger';
import { calculateBarterOdds } from '../domain/minecraft/calculate-barter-odds';

class MinecraftOddsCommand extends ICommand {
  constructor() {
    super('mcodds', 'Calculates the odds of an event happening');

    const barterChoices = Object.entries(barterData).map(([key, value]) => ({
      name: value.name,
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
          })
          .addStringOption((option) => {
            return option
              .setName('compare')
              .setDescription('Compare against bottom% or top% of odds')
              .addChoices(
                { name: 'Bottom %', value: 'bottom' },
                { name: 'Top %', value: 'top' }
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
                { name: 'Exactly x', value: 'exact' },
                { name: 'Ends at x', value: 'ends_at' }
              );
          })
          .addStringOption((option) => {
            return option
              .setName('compare')
              .setDescription('Compare against bottom% or top% of odds')
              .addChoices(
                { name: 'Bottom %', value: 'bottom' },
                { name: 'Top %', value: 'top' }
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
                { name: 'Exactly x', value: 'exact' },
                { name: 'Ends at x', value: 'ends_at' }
              );
          })
          .addStringOption((option) => {
            return option
              .setName('compare')
              .setDescription('Compare against bottom% or top% of odds')
              .addChoices(
                { name: 'Bottom %', value: 'bottom' },
                { name: 'Top %', value: 'top' }
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
                { name: 'Exactly x', value: 'exact' },
                { name: 'Ends at x', value: 'ends_at' }
              );
            // TODO: Add 'ends_at' option
          });
      });

    this.subCommandMap.eye = this.eyeCommand.bind(this);
    this.subCommandMap.blaze = this.blazeCommand.bind(this);
    this.subCommandMap.flint = this.flintCommand.bind(this);
    this.subCommandMap.barter = this.barterCommand.bind(this);
  }

  @Logger
  async execute(interaction: ChatInputCommandInteraction) {
    const subCommandName = interaction.options.getSubcommand();
    const handler = this.subCommandMap[subCommandName];

    if (!handler) {
      return await interaction.reply('Invalid subcommand.');
    }

    return await handler(interaction);
  }

  async eyeCommand(interaction: ChatInputCommandInteraction) {
    try {
      const count = interaction.options.getInteger('count')!;
      const type = interaction.options.getString('type')!;
      const compare = interaction.options.getString('compare');

      const result = await calculateEyeOdds(count, type, compare);

      const replyOptions: any = {
        content: `<@${interaction.user.id}> ${result.message}`
      };

      // If a chart was generated, attach it
      if (result.chartPath) {
        const { AttachmentBuilder } = await import('discord.js');
        replyOptions.files = [
          new AttachmentBuilder(result.chartPath, {
            name: 'eye-odds-chart.png'
          })
        ];
      }

      return await interaction.reply(replyOptions);
    } catch (err) {
      console.error('Error calculating eye odds:', err);
      return await interaction.reply('Erro ao calcular odds dos olhos.');
    }
  }

  async blazeCommand(interaction: ChatInputCommandInteraction) {
    try {
      const kills = interaction.options.getInteger('kills')!;
      const rods = interaction.options.getInteger('rods')!;
      const type = interaction.options.getString('type')!;
      const compare = interaction.options.getString('compare');

      const result = await calculateBlazeOdds(kills, rods, type, compare);

      const replyOptions: any = {
        // content: `<@${interaction.user.id}> ${result.message}`
      };

      // If a chart was generated, attach it
      if (result.chartPath) {
        const { AttachmentBuilder } = await import('discord.js');
        replyOptions.files = [
          new AttachmentBuilder(result.chartPath, {
            name: 'blaze-odds-chart.png'
          })
        ];
      }

      return await interaction.reply(replyOptions);
    } catch (err) {
      console.error('Error calculating blaze odds:', err);
      return await interaction.reply('Erro ao calcular odds dos blazes.');
    }
  }

  async flintCommand(interaction: ChatInputCommandInteraction) {
    try {
      const gravels = interaction.options.getInteger('gravels')!;
      const flints = interaction.options.getInteger('flints')!;
      const type = interaction.options.getString('type')!;
      const compare = interaction.options.getString('compare');

      const result = await calculateFlintOdds(gravels, flints, type, compare);

      const replyOptions: any = {
        content: `<@${interaction.user.id}> ${result.message}`
      };

      // If a chart was generated, attach it
      if (result.chartPath) {
        const { AttachmentBuilder } = await import('discord.js');
        replyOptions.files = [
          new AttachmentBuilder(result.chartPath, {
            name: 'flint-odds-chart.png'
          })
        ];
      }

      return await interaction.reply(replyOptions);
    } catch (err) {
      console.error('Error calculating flint odds:', err);
      return await interaction.reply('Erro ao calcular odds dos flints.');
    }
  }

  async barterCommand(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.reply('Calculando...');
      const trades = interaction.options.getInteger('trades')!;
      const drops = interaction.options.getInteger('drops')!;
      const loot = interaction.options.getString('loot') as Barter;
      const type = interaction.options.getString('type')!;

      const message = calculateBarterOdds(trades, drops, loot, type);
      return await interaction.editReply(
        `<@${interaction.user.id}> ${message}`
      );
    } catch (err) {
      return await interaction.editReply('Erro ao calcular odds de bartering.');
    }
  }
}

export { MinecraftOddsCommand };
