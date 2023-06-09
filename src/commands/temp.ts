import { ChatInputCommandInteraction, EmbedBuilder, GuildMember } from 'discord.js';
import { ICommand } from '../interfaces/command';

import api from '../services/weatherApi';
import { temperatureToColor } from '../utils/utils';

class TempCommand extends ICommand {

  constructor() {
    super('temp', 'Shows the current temperature of a given city');
    this.command.addStringOption(option => {
      return option
        .setName('city')
        .setDescription('City name')
        .setRequired(true)
    });
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const city = interaction.options.getString('city');

    try {
      const response = await api.get("", {
        params: {
          q: city,
        },
      });
  
      const cityName = response.data.name;
      const { temp, feels_like: tempFeelsLike, humidity } = response.data.main;
      const icon = response.data.weather[0].icon;

      const nickname = (interaction.member as GuildMember).nickname || interaction.user.username;

      const embed = new EmbedBuilder()
        .setTitle(`🧭 ${cityName}`)
        .setColor(temperatureToColor(temp))
        .setAuthor({ name: nickname, iconURL: interaction.user.avatarURL() || '' })
        .setThumbnail(
          `http://openweathermap.org/img/wn/${icon}@2x.png`
        )
        .addFields([
          { name: "Temperatura", value: `🌡️ ${temp}ºC`, inline: true },
          { name: "Sensação Térmica", value: `🌡️ ${tempFeelsLike}ºC`, inline: true },
          { name: "Umidade", value: `💧 ${humidity}%` },
          { name: '\u200b', value: '\u200b' }
        ])
        .setTimestamp()
        .setFooter({
          text: "openweathermap.org",
          iconURL: "https://openweathermap.org/themes/openweathermap/assets/img/logo_white_cropped.png"
        });

      interaction.reply({ embeds: [embed] })
    } catch (err: any) {
      if (err?.response?.status === 404) {
        interaction.reply('Cidade não encontrada');
      } else {
        interaction.reply('Ocorreu um erro 😯');
      }
    }
  }
}

export { TempCommand };