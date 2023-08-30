
import { InteractionResponse } from 'discord.js';
import { Interaction, SlashCommandBuilder } from 'discord.js';

abstract class ICommand {

  command: SlashCommandBuilder;

  constructor(name: string, description: string) {
    this.command = new SlashCommandBuilder()
      .setName(name)
      .setDescription(description);
  }

  abstract execute(interaction: Interaction): Promise<InteractionResponse<boolean>>;
}

export { ICommand }