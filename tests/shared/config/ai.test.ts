import {
  AI_COMPLETE_ANSWER_LABEL,
  AI_INCOMPLETE_WARNING,
  AI_RESPONSE_ROUTE,
  AI_RESPONSE_TOKEN_LENGTH,
  loadAiConfig,
  loadAiMaintenanceConfig
} from '../../../src/shared/config/ai';

const valid = (): NodeJS.ProcessEnv => ({
  AI_ENABLED: 'true', DEEPSEEK_API_KEY: 'secret', DEEPSEEK_MODEL: 'deepseek-flash',
  AI_PUBLIC_BASE_URL: 'https://bot.example.test', AI_DAILY_GLOBAL_TOKEN_BUDGET: '100000'
});

describe('AI configuration', () => {
  test('is disabled by default', () => {
    expect(loadAiConfig({})).toEqual({ enabled: false, reason: 'AI is disabled' });
  });

  test('fails closed without a positive daily budget', () => {
    expect(loadAiConfig({ ...valid(), AI_DAILY_GLOBAL_TOKEN_BUDGET: '' }).enabled).toBe(false);
    expect(loadAiConfig({ ...valid(), AI_DAILY_GLOBAL_TOKEN_BUDGET: '0' }).enabled).toBe(false);
  });

  test('loads bounded defaults and configurable limits', () => {
    const result = loadAiConfig({ ...valid(), AI_USER_REQUEST_LIMIT: '9' });
    expect(result.enabled).toBe(true);
    if (result.enabled) {
      expect(result.userRequestLimit).toBe(9);
      expect(result.maxGeneratedTokens).toBe(2048);
      expect(result.model).toBe('deepseek-flash');
      expect(result.reasoningEffort).toBe('high');
    }
  });

  test('requires HTTPS in production and rejects unsupported models', () => {
    expect(loadAiConfig({ ...valid(), NODE_ENV: 'production', AI_PUBLIC_BASE_URL: 'http://example.test' }).enabled).toBe(false);
    expect(loadAiConfig({ ...valid(), DEEPSEEK_MODEL: 'deepseek-reasoner' }).enabled).toBe(false);
    expect(loadAiConfig({ ...valid(), DEEPSEEK_REASONING_EFFORT: 'invalid' }).enabled).toBe(false);
  });

  test('validates the complete worst-case Discord reply length', () => {
    const accepted = loadAiConfig({ ...valid(), AI_SHORT_ANSWER_MAX_CHARS: '1500' });
    expect(accepted.enabled).toBe(true);
    if (accepted.enabled) {
      expect(accepted.shortAnswerMaxChars + AI_INCOMPLETE_WARNING.length + AI_COMPLETE_ANSWER_LABEL.length +
        accepted.publicBaseUrl.length + AI_RESPONSE_ROUTE.length + AI_RESPONSE_TOKEN_LENGTH).toBeLessThanOrEqual(2000);
    }
    const longUrl = `https://bot.example.test/${'a'.repeat(700)}`;
    expect(loadAiConfig({ ...valid(), AI_SHORT_ANSWER_MAX_CHARS: '1500', AI_PUBLIC_BASE_URL: longUrl }).enabled).toBe(false);
  });

  test('loads cleanup settings even when admission is disabled or provider settings are invalid', () => {
    expect(loadAiMaintenanceConfig({ AI_ENABLED: 'false', AI_USAGE_RETENTION_SECONDS: '90000' }))
      .toEqual({ usageRetentionSeconds: 90000, cleanupIntervalSeconds: 3600 });
    expect(loadAiMaintenanceConfig({ AI_ENABLED: 'true', DEEPSEEK_API_KEY: '' }))
      .toEqual({ usageRetentionSeconds: 691200, cleanupIntervalSeconds: 3600 });
  });
});
