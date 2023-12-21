
import { ChatInputCommandInteraction, Message } from 'discord.js';
import { InteractionResponse } from 'discord.js';
import { Interaction, SlashCommandBuilder } from 'discord.js';

abstract class ICommand {

  command: SlashCommandBuilder;
  protected subCommandMap: {
    [name: string]: (interaction: ChatInputCommandInteraction) => Promise<InteractionResponse<boolean> | Message<boolean>>;
  };

  constructor(name: string, description: string) {
    this.command = new SlashCommandBuilder()
      .setName(name)
      .setDescription(description);

    this.subCommandMap = {};
  }

  abstract execute(interaction: Interaction): Promise<InteractionResponse<boolean> | Message<boolean>>;
}

export { ICommand }