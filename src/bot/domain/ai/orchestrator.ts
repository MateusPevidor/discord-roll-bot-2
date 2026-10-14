import { AI_COMPLETE_ANSWER_LABEL, AI_INCOMPLETE_WARNING, AI_RESPONSE_ROUTE, AiConfig } from '../../../shared/config/ai';
import { AiResponseService } from '../../../services/ai-responses';
import { AiUsageService } from '../../../services/ai-usage';
import { DeepSeekApi } from '../../services/deepseek-api';
import { ASK_SYSTEM_PROMPT, EXPLAIN_SYSTEM_PROMPT } from './prompts';

export type AiRunResult =
  | { kind: 'answer'; content: string }
  | { kind: 'no_topic'; content: string }
  | { kind: 'denied'; reason: string }
  | { kind: 'failed'; reason: string };

// DeepSeek uses a byte-level tokenizer. Counting every UTF-8 byte as a token is
// conservative for content. The serialized envelope plus 256 tokens covers
// roles, separators, and chat-template framing submitted by this client.
export function maximumPromptTokens(system: string, content: string): number {
  const messages = JSON.stringify([{ role: 'system', content: system }, { role: 'user', content }]);
  return Buffer.byteLength(messages, 'utf8') + 256;
}

export class AiOrchestrator {
  constructor(private readonly config: AiConfig, private readonly provider = new DeepSeekApi(config),
    private readonly usage = new AiUsageService(), private readonly responses = new AiResponseService()) {}

  async run(input: { command: 'ask-ai' | 'ai-explain'; content: string; interactionId: string; userId: string; guildId: string }): Promise<AiRunResult> {
    const system = input.command === 'ask-ai' ? ASK_SYSTEM_PROMPT : EXPLAIN_SYSTEM_PROMPT;
    const reservedTokens = maximumPromptTokens(system, input.content) + this.config.maxGeneratedTokens;
    let admission;
    try {
      admission = await this.usage.admit({
        interactionId: input.interactionId, userId: input.userId, guildId: input.guildId, reservedTokens, now: new Date(),
        userWindowSeconds: this.config.userWindowSeconds, guildWindowSeconds: this.config.guildWindowSeconds,
        userLimit: this.config.userRequestLimit, guildLimit: this.config.guildRequestLimit,
        dailyBudget: this.config.dailyGlobalTokenBudget, maxConcurrent: this.config.maxConcurrentRequests,
        recoverySeconds: this.config.reservationRecoverySeconds
      });
    } catch { return { kind: 'failed', reason: 'AI usage accounting is unavailable.' }; }
    if (!admission.admitted) return { kind: 'denied', reason: admission.reason };
    let answer;
    try {
      answer = await this.provider.answer(system, input.content);
    } catch {
      await this.usage.complete(admission.usageId).catch(() => undefined);
      return { kind: 'failed', reason: 'The AI provider is currently unavailable.' };
    }
    const accounted = await this.usage.complete(admission.usageId, answer.totalTokens).catch(() => false);
    if (!accounted) return { kind: 'failed', reason: 'The AI response could not be safely accounted.' };
    if (answer.status === 'no_topic') return { kind: 'no_topic', content: answer.shortAnswer };
    try {
      const token = await this.responses.create(input.command, answer.shortAnswer, answer.detailedAnswer, this.config.answerRetentionSeconds);
      const warning = answer.incomplete ? AI_INCOMPLETE_WARNING : '';
      const completeAnswerUrl = `${this.config.publicBaseUrl}${AI_RESPONSE_ROUTE}${token}`;
      const content = `${answer.shortAnswer}${warning}${AI_COMPLETE_ANSWER_LABEL}${completeAnswerUrl})`;
      if (content.length > 2000) return { kind: 'failed', reason: 'The AI response was too long to publish safely.' };
      return { kind: 'answer', content };
    } catch { return { kind: 'failed', reason: 'The answer could not be saved.' }; }
  }
}
