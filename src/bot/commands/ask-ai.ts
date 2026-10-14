import { ChatInputCommandInteraction } from 'discord.js';
import { ICommand } from '../interfaces/command';
import { loadAiConfig } from '../../shared/config/ai';
import { AiOrchestrator } from '../domain/ai/orchestrator';
import { denialMessage, editOptions, isSupportedAiInteraction, setGuildOnly } from './ai-command-utils';
import { AiConfig, AiConfigResult } from '../../shared/config/ai';

export class AskAiCommand extends ICommand {
  constructor(
    private readonly configLoader: () => AiConfigResult = loadAiConfig,
    private readonly orchestratorFactory: (config: AiConfig) => Pick<AiOrchestrator, 'run'> = (config) => new AiOrchestrator(config)
  ) {
    super('ask-ai', 'Ask the AI a question');
    setGuildOnly(this.command).addStringOption((option) => option
      .setName('prompt').setDescription('Your question').setRequired(true));
  }

  async execute(interaction: ChatInputCommandInteraction) {
    const config = this.configLoader();
    if (!config.enabled) return interaction.reply(editOptions('AI is unavailable because it is disabled or not configured.'));
    if (!isSupportedAiInteraction(interaction)) return interaction.reply(editOptions('This command is only available from a guild-installed bot in a server channel.'));
    const prompt = interaction.options.getString('prompt', true).trim();
    if (!prompt || prompt.length > config.maxPromptChars) return interaction.reply(editOptions(`The prompt must contain 1 to ${config.maxPromptChars} characters.`));
    try { await interaction.deferReply({ ephemeral: false }); } catch { return undefined; }
    const result = await this.orchestratorFactory(config).run({
      command: 'ask-ai', content: prompt, interactionId: interaction.id,
      userId: interaction.user.id, guildId: interaction.guildId!
    });
    const content = result.kind === 'denied' ? denialMessage(result.reason) : result.kind === 'failed' ? result.reason : result.content;
    try { return await interaction.editReply(editOptions(content)); } catch {
      console.error('AI command final edit failed', { command: 'ask-ai', interactionId: interaction.id, result: result.kind });
      return undefined;
    }
  }
}
