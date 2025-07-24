import { ChatInputCommandInteraction } from 'discord.js';
import { ICommand } from '../interfaces/command';
import DatabaseService from '../../services/database';

import Logger from '../decorators/execution-logger';

class TrackerCommand extends ICommand {
  constructor() {
    super('tracker', 'Manages MCSR ranked match tracking for this server');

    this.command
      .addSubcommand((subcommand) => {
        return subcommand
          .setName('set')
          .setDescription(
            'Sets the current channel as the tracker channel for MCSR ranked matches'
          );
      })
      .addSubcommand((subcommand) => {
        return subcommand
          .setName('add')
          .setDescription('Adds a player or country to the tracker list')
          .addStringOption((option) => {
            return option
              .setName('target')
              .setDescription('Player name or country code to track')
              .setRequired(true);
          })
          .addBooleanOption((option) => {
            return option
              .setName('is_country')
              .setDescription(
                'Set to true if the target is a country code (default: false)'
              )
              .setRequired(false);
          });
      })
      .addSubcommand((subcommand) => {
        return subcommand
          .setName('remove')
          .setDescription('Removes a player or country from the tracker list')
          .addStringOption((option) => {
            return option
              .setName('target')
              .setDescription('Player name or country code to stop tracking')
              .setRequired(true);
          })
          .addBooleanOption((option) => {
            return option
              .setName('is_country')
              .setDescription(
                'Set to true if the target is a country code (default: false)'
              )
              .setRequired(false);
          });
      })
      .addSubcommand((subcommand) => {
        return subcommand
          .setName('list')
          .setDescription(
            'Lists all players and countries being tracked in this server'
          );
      });

    this.subCommandMap.set = this.setCommand.bind(this) as any;
    this.subCommandMap.add = this.addCommand.bind(this) as any;
    this.subCommandMap.remove = this.removeCommand.bind(this) as any;
    this.subCommandMap.list = this.listCommand.bind(this) as any;
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

  async setCommand(interaction: ChatInputCommandInteraction) {
    try {
      const channelId = interaction.channelId;
      const guildId = interaction.guildId;

      if (!guildId) {
        return await interaction.reply({
          content: 'This command can only be used in a server.',
          ephemeral: true
        });
      }

      const db = DatabaseService.getInstance();
      await db.setTrackerChannel(guildId, channelId);

      return await interaction.reply({
        content: `✅ This channel (<#${channelId}>) has been set as the tracker channel for MCSR ranked matches.`,
        ephemeral: true
      });
    } catch (err) {
      console.error('Error setting tracker channel:', err);
      return await interaction.reply({
        content: 'An error occurred while setting the tracker channel.',
        ephemeral: true
      });
    }
  }

  async addCommand(interaction: ChatInputCommandInteraction) {
    try {
      const target = interaction.options.getString('target')!;
      const isCountry = interaction.options.getBoolean('is_country') ?? false;
      const guildId = interaction.guildId;

      if (!guildId) {
        return await interaction.reply({
          content: 'This command can only be used in a server.',
          ephemeral: true
        });
      }

      const db = DatabaseService.getInstance();
      const wasAdded = await db.addTrackedPlayer(guildId, target, isCountry);

      if (!wasAdded) {
        const type = isCountry ? 'country' : 'player';
        return await interaction.reply({
          content: `❌ ${
            isCountry ? target.toUpperCase() : target
          } is already being tracked as a ${type}.`,
          ephemeral: true
        });
      }

      if (isCountry) {
        return await interaction.reply({
          content: `✅ All players from **${target.toUpperCase()}** have been added to the tracker list.`,
          ephemeral: true
        });
      } else {
        return await interaction.reply({
          content: `✅ Player **${target}** has been added to the tracker list.`,
          ephemeral: true
        });
      }
    } catch (err) {
      console.error('Error adding to tracker:', err);
      return await interaction.reply({
        content: 'An error occurred while adding to the tracker list.',
        ephemeral: true
      });
    }
  }

  async removeCommand(interaction: ChatInputCommandInteraction) {
    try {
      const target = interaction.options.getString('target')!;
      const isCountry = interaction.options.getBoolean('is_country') ?? false;
      const guildId = interaction.guildId;

      if (!guildId) {
        return await interaction.reply({
          content: 'This command can only be used in a server.',
          ephemeral: true
        });
      }

      const db = DatabaseService.getInstance();
      const wasRemoved = await db.removeTrackedPlayer(
        guildId,
        target,
        isCountry
      );

      if (!wasRemoved) {
        const type = isCountry ? 'country' : 'player';
        return await interaction.reply({
          content: `❌ ${
            isCountry ? target.toUpperCase() : target
          } was not found in the tracking list as a ${type}.`,
          ephemeral: true
        });
      }

      if (isCountry) {
        return await interaction.reply({
          content: `✅ All players from **${target.toUpperCase()}** have been removed from the tracker list.`,
          ephemeral: true
        });
      } else {
        return await interaction.reply({
          content: `✅ Player **${target}** has been removed from the tracker list.`,
          ephemeral: true
        });
      }
    } catch (err) {
      console.error('Error removing from tracker:', err);
      return await interaction.reply({
        content: 'An error occurred while removing from the tracker list.',
        ephemeral: true
      });
    }
  }

  async listCommand(interaction: ChatInputCommandInteraction) {
    try {
      const guildId = interaction.guildId;

      if (!guildId) {
        return await interaction.reply({
          content: 'This command can only be used in a server.',
          ephemeral: true
        });
      }

      const db = DatabaseService.getInstance();
      const trackerChannelId = await db.getTrackerChannel(guildId);
      const { players: trackedPlayers, countries: trackedCountries } =
        await db.getTrackedPlayers(guildId);

      let content = '📊 **MCSR Ranked Match Tracker Status**\n\n';

      if (!trackerChannelId) {
        content += '❌ **Tracker Channel:** Not configured\n';
        content += 'Use `/tracker set` to set up a tracker channel first.\n\n';
      } else {
        content += `✅ **Tracker Channel:** <#${trackerChannelId}>\n\n`;
      }

      if (trackedPlayers.length === 0 && trackedCountries.length === 0) {
        content += '📝 **Tracked Players/Countries:** None\n';
        content += 'Use `/tracker add` to start tracking players or countries.';
      } else {
        if (trackedPlayers.length > 0) {
          content += '👤 **Tracked Players:**\n';
          trackedPlayers.forEach((player) => {
            content += `• ${player}\n`;
          });
          content += '\n';
        }

        if (trackedCountries.length > 0) {
          content += '🌍 **Tracked Countries:**\n';
          trackedCountries.forEach((country) => {
            content += `• ${country.toUpperCase()}\n`;
          });
        }
      }

      return await interaction.reply({
        content: content,
        ephemeral: true
      });
    } catch (err) {
      console.error('Error listing tracker data:', err);
      return await interaction.reply({
        content: 'An error occurred while retrieving the tracker list.',
        ephemeral: true
      });
    }
  }
}

export { TrackerCommand };
