import { ChatInputCommandInteraction } from 'discord.js';
import { ICommand } from '../interfaces/command';

import {
  barterData,
  Barter,
  calculateOdds,
  barterOdds
} from './helpers/minecraftOddsHelper';

import Logger from '../decorators/executionLogger';

class MinecraftOddsCommand extends ICommand {
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
  }

  @Logger
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.user) {
      return interaction.reply(`Error`);
    }

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
      const result = calculateOdds(12, count, 0.1, countType);
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
      const result = calculateOdds(kills, rods, 0.5, countType);
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
      const result = calculateOdds(gravels, flints, 0.1, countType);
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

      const result = barterOdds(trades, dropCount, lootType, countType);

      if (countType === 'or_less') {
        return await interaction.editReply(
          `<@${interaction.user.id}> Odds of dropping ${dropCount} or less ${
            barter.name
          } from ${trades} trades: ${result.odds}%${
            result.approximate ? ' (Approximate)' : ''
          }`
        );
      } else if (countType === 'or_more') {
        return await interaction.editReply(
          `<@${interaction.user.id}> Odds of dropping ${dropCount} or more ${
            barter.name
          } from ${trades} trades: ${result.odds}%${
            result.approximate ? ' (Approximate)' : ''
          }`
        );
      } else {
        return await interaction.editReply(
          `<@${interaction.user.id}> Odds of dropping exactly ${dropCount} ${barter.name} from ${trades} trades: ${result.odds}%`
        );
      }
    } catch (err) {
      return await interaction.editReply(
        `<@${interaction.user.id}> Um erro ocorreu. Verifique seus inputs. (${err})`
      );
    }
  }
}

export { MinecraftOddsCommand };
