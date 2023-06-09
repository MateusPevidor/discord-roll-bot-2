import { ChatInputCommandInteraction, Guild, GuildMember } from 'discord.js';
import { ICommand } from '../interfaces/command';

class RollCommand extends ICommand {

  constructor() {
    super('roll', 'Rolls between 1 and 100 (or the defined limit) inclusive.');
    this.command.addIntegerOption(option => {
      return option
        .setName('limit')
        .setDescription('Upper limit')
    });
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.member) {
      interaction.reply(`Error`);
      return;
    }
    const limit = interaction.options.getInteger('limit') || 100;
    const roll = Math.floor(Math.random() * limit) + 1;

    interaction.reply(`<@${interaction.user.id}> rolled ${roll}`);
  }
}

export { RollCommand };