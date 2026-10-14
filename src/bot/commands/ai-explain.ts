import { ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { ICommand } from '../interfaces/command';
import { loadAiConfig } from '../../shared/config/ai';
import { AiOrchestrator } from '../domain/ai/orchestrator';
import { selectContext } from '../domain/ai/context';
import { denialMessage, editOptions, isSupportedAiInteraction, setGuildOnly } from './ai-command-utils';
import { AiConfig, AiConfigResult } from '../../shared/config/ai';

export class AiExplainCommand extends ICommand {
  constructor(
    private readonly configLoader: () => AiConfigResult = loadAiConfig,
    private readonly orchestratorFactory: (config: AiConfig) => Pick<AiOrchestrator, 'run'> = (config) => new AiOrchestrator(config)
  ) {
    super('ai-explain', 'Explain the active question or topic in this channel');
    setGuildOnly(this.command);
  }

  async execute(interaction: ChatInputCommandInteraction) {
    const config = this.configLoader();
    if (!config.enabled) return interaction.reply(editOptions('AI is unavailable because it is disabled or not configured.'));
    if (!isSupportedAiInteraction(interaction)) return interaction.reply(editOptions('This command is only available from a guild-installed bot in a server channel.'));
    try { await interaction.deferReply({ ephemeral: false }); } catch { return undefined; }

    let channel;
    try {
      channel = await interaction.guild!.channels.fetch(interaction.channelId);
    } catch {
      return interaction.editReply(editOptions('I could not read this channel history.'));
    }
    if (!channel || !channel.isTextBased() || !('messages' in channel)) return interaction.editReply(editOptions('This channel does not support message history.'));

    let context: string;
    try {
      const me = interaction.guild!.members.me || await interaction.guild!.members.fetchMe();
      const permissions = channel.permissionsFor(me);
      if (!permissions?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory])) {
        return interaction.editReply(editOptions('I do not have permission to read this channel history.'));
      }
      const messages = await channel.messages.fetch({ limit: config.contextMessageLimit, before: interaction.id });
      context = selectContext(messages.values(), {
        invocationId: interaction.id, invocationTimestamp: interaction.createdTimestamp,
        maxAgeSeconds: config.contextMaxAgeSeconds, maxMessages: config.contextMessageLimit,
        maxChars: config.contextMaxChars
      });
    } catch {
      return interaction.editReply(editOptions('I could not read this channel history.'));
    }
    if (!context) return interaction.editReply(editOptions('There are no recent text messages to explain.'));
    const result = await this.orchestratorFactory(config).run({
      command: 'ai-explain', content: `Quoted recent messages:\n<channel_messages>\n${context}\n</channel_messages>`,
      interactionId: interaction.id, userId: interaction.user.id, guildId: interaction.guildId!
    });
    const content = result.kind === 'denied' ? denialMessage(result.reason) : result.kind === 'failed' ? result.reason : result.content;
    try { return await interaction.editReply(editOptions(content)); } catch {
      console.error('AI command final edit failed', { command: 'ai-explain', interactionId: interaction.id, result: result.kind });
      return undefined;
    }
  }
}
