import { AiConfig } from '../../../src/shared/config/ai';
import { DeepSeekApi, DeepSeekError } from '../../../src/bot/services/deepseek-api';

const config = { model: 'deepseek-flash', reasoningEffort: 'high', apiKey: 'hidden', requestTimeoutMs: 1000,
  maxGeneratedTokens: 100, shortAnswerMaxChars: 20 } as AiConfig;

describe('DeepSeekApi', () => {
  test('sends one bounded structured request and validates usage', async () => {
    const post = jest.fn().mockResolvedValue({ status: 200, data: {
      choices: [{ finish_reason: 'stop', message: { content: '{"status":"answer","shortAnswer":"Short","detailedAnswer":"Detailed"}' } }],
      usage: { prompt_tokens: 5, completion_tokens: 6, total_tokens: 11 }
    } });
    const result = await new DeepSeekApi(config, { post } as never).answer('system', 'question');
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][1]).toMatchObject({ model: 'deepseek-flash', thinking: { type: 'enabled' }, reasoning_effort: 'high', max_tokens: 100, response_format: { type: 'json_object' }, stream: false });
    expect(result).toMatchObject({ shortAnswer: 'Short', detailedAnswer: 'Detailed', totalTokens: 11 });
  });

  test('fails closed when token accounting is inconsistent', async () => {
    const post = jest.fn().mockResolvedValue({ status: 200, data: {
      choices: [{ finish_reason: 'stop', message: { content: '{"status":"answer","shortAnswer":"Short","detailedAnswer":"Detailed"}' } }],
      usage: { prompt_tokens: 5, completion_tokens: 6, total_tokens: 10 }
    } });
    await expect(new DeepSeekApi(config, { post } as never).answer('s', 'q')).rejects.toEqual(new DeepSeekError('invalid'));
  });
});
