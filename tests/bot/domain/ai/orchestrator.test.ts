import { AiConfig } from '../../../../src/shared/config/ai';
import { AiOrchestrator, maximumPromptTokens } from '../../../../src/bot/domain/ai/orchestrator';
import { ASK_SYSTEM_PROMPT } from '../../../../src/bot/domain/ai/prompts';

const config: AiConfig = {
  enabled: true, apiKey: 'secret', model: 'deepseek-flash', reasoningEffort: 'high', publicBaseUrl: 'https://bot.test',
  requestTimeoutMs: 1000, maxPromptChars: 2000, contextMessageLimit: 30,
  contextMaxAgeSeconds: 3600, contextMaxChars: 12000, maxGeneratedTokens: 100,
  shortAnswerMaxChars: 900, userRequestLimit: 5, userWindowSeconds: 600,
  guildRequestLimit: 30, guildWindowSeconds: 600, dailyGlobalTokenBudget: 100000,
  maxConcurrentRequests: 2, answerRetentionSeconds: 1000, usageRetentionSeconds: 86400,
  reservationRecoverySeconds: 2, cleanupIntervalSeconds: 3600
};

const input = { command: 'ask-ai' as const, content: 'Olá 🌍', interactionId: 'i', userId: 'u', guildId: 'g' };

function dependencies(answer: Record<string, unknown> = {}) {
  const provider = { answer: jest.fn().mockResolvedValue({
    status: 'answer', shortAnswer: 'Short', detailedAnswer: 'Detailed', totalTokens: 50,
    incomplete: false, ...answer
  }) };
  const usage = {
    admit: jest.fn().mockResolvedValue({ admitted: true, usageId: 1 }),
    complete: jest.fn().mockResolvedValue(true)
  };
  const responses = { create: jest.fn().mockResolvedValue('x'.repeat(43)) };
  const orchestrator = new AiOrchestrator(config, provider as never, usage as never, responses as never);
  return { orchestrator, provider, usage, responses };
}

describe('AI orchestration', () => {
  test('reserves a byte-conservative prompt bound including framing and output', async () => {
    const { orchestrator, usage } = dependencies();
    await orchestrator.run(input);
    const reservation = usage.admit.mock.calls[0][0].reservedTokens;
    expect(reservation).toBe(maximumPromptTokens(ASK_SYSTEM_PROMPT, input.content) + config.maxGeneratedTokens);
    expect(reservation).toBeGreaterThan(Buffer.byteLength(input.content, 'utf8') + config.maxGeneratedTokens);
    expect(reservation).toBeGreaterThanOrEqual(config.maxGeneratedTokens + 256);
  });

  test('conservatively completes failed and missing-usage provider attempts', async () => {
    const failed = dependencies();
    failed.provider.answer.mockRejectedValueOnce(new Error('secret provider error'));
    await expect(failed.orchestrator.run(input)).resolves.toEqual({ kind: 'failed', reason: 'The AI provider is currently unavailable.' });
    expect(failed.usage.complete).toHaveBeenCalledWith(1);

    const missing = dependencies({ totalTokens: undefined });
    missing.usage.complete.mockResolvedValueOnce(false);
    await expect(missing.orchestrator.run(input)).resolves.toEqual({ kind: 'failed', reason: 'The AI response could not be safely accounted.' });
    expect(missing.responses.create).not.toHaveBeenCalled();
  });

  test('fails closed when the usage database is unavailable', async () => {
    const { orchestrator, usage, provider } = dependencies();
    usage.admit.mockRejectedValueOnce(new Error('sqlite unavailable'));
    await expect(orchestrator.run(input)).resolves.toEqual({ kind: 'failed', reason: 'AI usage accounting is unavailable.' });
    expect(provider.answer).not.toHaveBeenCalled();
  });

  test('does not publish a URL when persistence fails', async () => {
    const { orchestrator, responses } = dependencies();
    responses.create.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(orchestrator.run(input)).resolves.toEqual({ kind: 'failed', reason: 'The answer could not be saved.' });
  });

  test('publishes only after save and labels incomplete output', async () => {
    const { orchestrator, responses } = dependencies({ incomplete: true });
    const result = await orchestrator.run(input);
    expect(responses.create).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ kind: 'answer' });
    if (result.kind === 'answer') {
      expect(result.content).toContain('may be incomplete');
      expect(result.content).toContain('[Complete answer](https://bot.test/ai/responses/');
      expect(result.content.length).toBeLessThanOrEqual(2000);
    }
  });

  test('returns no-topic without persisting a page', async () => {
    const { orchestrator, responses } = dependencies({ status: 'no_topic', shortAnswer: 'Nothing to explain.', detailedAnswer: '' });
    await expect(orchestrator.run({ ...input, command: 'ai-explain' })).resolves.toEqual({ kind: 'no_topic', content: 'Nothing to explain.' });
    expect(responses.create).not.toHaveBeenCalled();
  });
});
