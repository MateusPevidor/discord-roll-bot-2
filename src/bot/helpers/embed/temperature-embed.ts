import { EmbedBuilder, User } from 'discord.js';
import { TemperatureInfo } from '../../domain/general/fetch-temperature';
import { temperatureToColor } from '../../../shared/utils/temperature-to-color';

export function buildTemperatureEmbed(
  data: TemperatureInfo,
  user: User,
  nickname: string
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`🧭 ${data.city}`)
    .setColor(temperatureToColor(data.temp))
    .setAuthor({
      name: nickname,
      iconURL: user.avatarURL() || ''
    })
    .setThumbnail(`http://openweathermap.org/img/wn/${data.icon}@2x.png`)
    .addFields([
      { name: 'Temperatura', value: `🌡️ ${data.temp}ºC`, inline: true },
      {
        name: 'Sensação Térmica',
        value: `🌡️ ${data.feelsLike}ºC`,
        inline: true
      },
      { name: 'Umidade', value: `💧 ${data.humidity}%` },
      { name: '\u200b', value: '\u200b' }
    ])
    .setTimestamp()
    .setFooter({
      text: 'openweathermap.org',
      iconURL:
        'https://openweathermap.org/themes/openweathermap/assets/img/logo_white_cropped.png'
    });
}
