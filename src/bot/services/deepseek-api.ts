import axios, { AxiosInstance } from 'axios';
import { AiConfig } from '../../shared/config/ai';

export interface AiAnswer {
  status: 'answer' | 'no_topic';
  shortAnswer: string;
  detailedAnswer: string;
  totalTokens: number;
  incomplete: boolean;
}

export class DeepSeekError extends Error {
  constructor(public readonly category: 'auth' | 'rate' | 'timeout' | 'network' | 'invalid') {
    super(`DeepSeek request failed: ${category}`);
  }
}

export class DeepSeekApi {
  private readonly client: AxiosInstance;
  constructor(private readonly config: AiConfig, client?: AxiosInstance) {
    this.client = client || axios.create({
      baseURL: 'https://api.deepseek.com', timeout: config.requestTimeoutMs,
      maxContentLength: 1024 * 1024, maxBodyLength: 128 * 1024,
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      validateStatus: () => true
    });
  }

  async answer(system: string, content: string): Promise<AiAnswer> {
    let response;
    try {
      response = await this.client.post('/chat/completions', {
        model: this.config.model,
        messages: [{ role: 'system', content: system }, { role: 'user', content }],
        thinking: { type: 'enabled' },
        reasoning_effort: this.config.reasoningEffort,
        max_tokens: this.config.maxGeneratedTokens,
        response_format: { type: 'json_object' },
        stream: false
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') throw new DeepSeekError('timeout');
      throw new DeepSeekError('network');
    }
    if (response.status === 401 || response.status === 403) throw new DeepSeekError('auth');
    if (response.status === 429) throw new DeepSeekError('rate');
    if (response.status < 200 || response.status >= 300) throw new DeepSeekError('network');

    const choice = response.data?.choices?.[0];
    const usage = response.data?.usage;
    if (!choice || !['stop', 'length'].includes(choice.finish_reason) || typeof choice.message?.content !== 'string') throw new DeepSeekError('invalid');
    if (!Number.isSafeInteger(usage?.prompt_tokens) || usage.prompt_tokens < 0 ||
        !Number.isSafeInteger(usage?.completion_tokens) || usage.completion_tokens < 0 ||
        !Number.isSafeInteger(usage?.total_tokens) || usage.total_tokens <= 0 ||
        usage.prompt_tokens + usage.completion_tokens !== usage.total_tokens) throw new DeepSeekError('invalid');
    let parsed: unknown;
    try { parsed = JSON.parse(choice.message.content); } catch { throw new DeepSeekError('invalid'); }
    const value = parsed as Record<string, unknown>;
    if (!value || !['answer', 'no_topic'].includes(value.status as string) ||
        typeof value.shortAnswer !== 'string' || typeof value.detailedAnswer !== 'string') throw new DeepSeekError('invalid');
    const shortAnswer = value.shortAnswer.trim();
    const detailedAnswer = value.detailedAnswer.trim();
    if (!shortAnswer || shortAnswer.length > this.config.shortAnswerMaxChars ||
        detailedAnswer.length > this.config.maxGeneratedTokens * 8 ||
        (value.status === 'answer' && !detailedAnswer)) throw new DeepSeekError('invalid');
    return {
      status: value.status as 'answer' | 'no_topic', shortAnswer, detailedAnswer,
      totalTokens: usage.total_tokens, incomplete: choice.finish_reason === 'length'
    };
  }
}
