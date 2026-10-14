import { ChatInputCommandInteraction, InteractionContextType, SlashCommandBuilder } from 'discord.js';

export const setGuildOnly = (command: SlashCommandBuilder): SlashCommandBuilder => {
  const toJSON = command.toJSON.bind(command);
  command.toJSON = () => ({ ...toJSON(), integration_types: [0], contexts: [0] } as ReturnType<SlashCommandBuilder['toJSON']>);
  return command;
};

export function isSupportedAiInteraction(interaction: ChatInputCommandInteraction): boolean {
  if (!interaction.inGuild() || !interaction.guildId || interaction.context !== InteractionContextType.Guild) return false;
  return interaction.authorizingIntegrationOwners.guildId === interaction.guildId;
}

export const editOptions = (content: string) => ({ content, allowedMentions: { parse: [] as [], repliedUser: false } });

export function denialMessage(reason: string): string {
  if (reason === 'duplicate') return 'This interaction has already been processed.';
  if (reason === 'concurrency') return 'The AI is busy. Please try again shortly.';
  if (reason === 'budget') return 'The daily AI budget has been reached.';
  return 'The AI request limit has been reached. Please try again later.';
}
