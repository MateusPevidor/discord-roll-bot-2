import { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { ICommand } from '../interfaces/command';
import Logger from '../decorators/execution-logger';

import { fetchTemperature } from '../domain/general/fetch-temperature';
import { buildTemperatureEmbed } from '../helpers/embed/temperature-embed';

class TempCommand extends ICommand {
  constructor() {
    super('temp', 'Shows the current temperature of a given city');
    this.command.addStringOption((option) =>
      option.setName('city').setDescription('City name').setRequired(true)
    );
  }

  @Logger
  async execute(interaction: ChatInputCommandInteraction) {
    const city = interaction.options.getString('city', true);

    try {
      const data = await fetchTemperature(city);

      const nickname =
        (interaction.member as GuildMember)?.nickname ||
        interaction.user.username;

      const embed = buildTemperatureEmbed(data, interaction.user, nickname);

      return await interaction.reply({ embeds: [embed] });
    } catch (err: any) {
      let message = 'Ocorreu um erro 😯';

      if (err.message === 'CITY_NOT_FOUND') {
        message = `Cidade "${city}" não encontrada.`;
      }

      return await interaction.reply({ content: message, ephemeral: true });
    }
  }
}

export { TempCommand };
