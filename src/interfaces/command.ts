
import { Interaction, SlashCommandBuilder } from 'discord.js';

class ICommand {

  command: SlashCommandBuilder;

  constructor(name: string, description: string) {
    this.command = new SlashCommandBuilder()
      .setName(name)
      .setDescription(description);
  }

  async execute(interaction: Interaction) {}
}

export { ICommand }