import { ChatInputCommandInteraction } from 'discord.js';
import { ICommand } from '../interfaces/command';
import Logger from '../decorators/execution-logger';
import { generateConnectionCode } from '../domain/general/generate-connection-code';

class ConnectionCommand extends ICommand {
  constructor() {
    super('connection', 'Retrieves connection code for the bot.');
  }

  @Logger
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const userId = interaction.user.id;
      const code = await generateConnectionCode(userId);

      return await interaction.reply({
        content: code,
        ephemeral: true
      });
    } catch (err) {
      console.error('Erro ao gerar código de conexão:', err);
      return await interaction.reply({
        content: 'Erro ao gerar o código de conexão.',
        ephemeral: true
      });
    }
  }
}

export { ConnectionCommand };
