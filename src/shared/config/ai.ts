export interface AiConfig {
  enabled: true;
  apiKey: string;
  model: 'deepseek-flash';
  reasoningEffort: 'low' | 'high' | 'max';
  publicBaseUrl: string;
  requestTimeoutMs: number;
  maxPromptChars: number;
  contextMessageLimit: number;
  contextMaxAgeSeconds: number;
  contextMaxChars: number;
  maxGeneratedTokens: number;
  shortAnswerMaxChars: number;
  userRequestLimit: number;
  userWindowSeconds: number;
  guildRequestLimit: number;
  guildWindowSeconds: number;
  dailyGlobalTokenBudget: number;
  maxConcurrentRequests: number;
  answerRetentionSeconds: number;
  usageRetentionSeconds: number;
  reservationRecoverySeconds: number;
  cleanupIntervalSeconds: number;
}

export type AiConfigResult = AiConfig | { enabled: false; reason: string };
export interface AiMaintenanceConfig {
  usageRetentionSeconds: number;
  cleanupIntervalSeconds: number;
}
export type AiMaintenanceConfigResult = AiMaintenanceConfig | { reason: string };

export const AI_RESPONSE_TOKEN_LENGTH = 43;
export const AI_RESPONSE_ROUTE = '/ai/responses/';
export const AI_INCOMPLETE_WARNING = '\nThe provider reached its output limit, so this answer may be incomplete.';
export const AI_COMPLETE_ANSWER_LABEL = '\n\n[Complete answer](';

const defaults = {
  AI_REQUEST_TIMEOUT_MS: 45000,
  AI_MAX_PROMPT_CHARS: 2000,
  AI_CONTEXT_MESSAGE_LIMIT: 30,
  AI_CONTEXT_MAX_AGE_SECONDS: 3600,
  AI_CONTEXT_MAX_CHARS: 12000,
  AI_MAX_GENERATED_TOKENS: 2048,
  AI_SHORT_ANSWER_MAX_CHARS: 900,
  AI_USER_REQUEST_LIMIT: 5,
  AI_USER_WINDOW_SECONDS: 600,
  AI_GUILD_REQUEST_LIMIT: 30,
  AI_GUILD_WINDOW_SECONDS: 600,
  AI_MAX_CONCURRENT_REQUESTS: 2,
  AI_ANSWER_RETENTION_SECONDS: 604800,
  AI_USAGE_RETENTION_SECONDS: 691200,
  AI_RESERVATION_RECOVERY_SECONDS: 120,
  AI_CLEANUP_INTERVAL_SECONDS: 3600
} as const;

function integer(env: NodeJS.ProcessEnv, name: keyof typeof defaults | 'AI_DAILY_GLOBAL_TOKEN_BUDGET', max: number): number {
  const raw = env[name];
  const value = raw === undefined ? defaults[name as keyof typeof defaults] : Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0 || value > max) throw new Error(`${name} must be a positive integer`);
  return value;
}

export function loadAiConfig(env: NodeJS.ProcessEnv = process.env): AiConfigResult {
  if (env.AI_ENABLED !== 'true') return { enabled: false, reason: 'AI is disabled' };
  try {
    if (!env.DEEPSEEK_API_KEY?.trim()) throw new Error('DEEPSEEK_API_KEY is required');
    if (env.DEEPSEEK_MODEL !== 'deepseek-flash') throw new Error('DEEPSEEK_MODEL must be deepseek-flash');
    const reasoningEffort = env.DEEPSEEK_REASONING_EFFORT || 'high';
    if (!['low', 'high', 'max'].includes(reasoningEffort)) throw new Error('DEEPSEEK_REASONING_EFFORT must be low, high, or max');
    if (!env.AI_PUBLIC_BASE_URL) throw new Error('AI_PUBLIC_BASE_URL is required');
    const publicUrl = new URL(env.AI_PUBLIC_BASE_URL);
    if (publicUrl.username || publicUrl.password || publicUrl.search || publicUrl.hash) throw new Error('AI_PUBLIC_BASE_URL must be canonical');
    if (env.NODE_ENV === 'production' && publicUrl.protocol !== 'https:') throw new Error('AI_PUBLIC_BASE_URL must use HTTPS in production');
    if (!['https:', 'http:'].includes(publicUrl.protocol)) throw new Error('AI_PUBLIC_BASE_URL has an invalid scheme');

    const config: AiConfig = {
      enabled: true,
      apiKey: env.DEEPSEEK_API_KEY.trim(), model: 'deepseek-flash', reasoningEffort: reasoningEffort as AiConfig['reasoningEffort'],
      publicBaseUrl: publicUrl.toString().replace(/\/$/, ''),
      requestTimeoutMs: integer(env, 'AI_REQUEST_TIMEOUT_MS', 120000),
      maxPromptChars: integer(env, 'AI_MAX_PROMPT_CHARS', 20000),
      contextMessageLimit: integer(env, 'AI_CONTEXT_MESSAGE_LIMIT', 100),
      contextMaxAgeSeconds: integer(env, 'AI_CONTEXT_MAX_AGE_SECONDS', 86400),
      contextMaxChars: integer(env, 'AI_CONTEXT_MAX_CHARS', 100000),
      maxGeneratedTokens: integer(env, 'AI_MAX_GENERATED_TOKENS', 8192),
      shortAnswerMaxChars: integer(env, 'AI_SHORT_ANSWER_MAX_CHARS', 1500),
      userRequestLimit: integer(env, 'AI_USER_REQUEST_LIMIT', 1000),
      userWindowSeconds: integer(env, 'AI_USER_WINDOW_SECONDS', 86400),
      guildRequestLimit: integer(env, 'AI_GUILD_REQUEST_LIMIT', 10000),
      guildWindowSeconds: integer(env, 'AI_GUILD_WINDOW_SECONDS', 86400),
      dailyGlobalTokenBudget: integer(env, 'AI_DAILY_GLOBAL_TOKEN_BUDGET', 1000000000),
      maxConcurrentRequests: integer(env, 'AI_MAX_CONCURRENT_REQUESTS', 100),
      answerRetentionSeconds: integer(env, 'AI_ANSWER_RETENTION_SECONDS', 31536000),
      usageRetentionSeconds: integer(env, 'AI_USAGE_RETENTION_SECONDS', 31536000),
      reservationRecoverySeconds: integer(env, 'AI_RESERVATION_RECOVERY_SECONDS', 86400),
      cleanupIntervalSeconds: integer(env, 'AI_CLEANUP_INTERVAL_SECONDS', 86400)
    };
    const maximumReplyLength = config.shortAnswerMaxChars + AI_INCOMPLETE_WARNING.length +
      AI_COMPLETE_ANSWER_LABEL.length + config.publicBaseUrl.length + AI_RESPONSE_ROUTE.length + AI_RESPONSE_TOKEN_LENGTH;
    if (maximumReplyLength > 2000) throw new Error('AI_SHORT_ANSWER_MAX_CHARS and AI_PUBLIC_BASE_URL exceed the Discord reply limit');
    if (config.reservationRecoverySeconds * 1000 <= config.requestTimeoutMs) throw new Error('AI_RESERVATION_RECOVERY_SECONDS must exceed the request timeout');
    if (config.usageRetentionSeconds < Math.max(86400, config.userWindowSeconds, config.guildWindowSeconds, config.reservationRecoverySeconds)) throw new Error('AI_USAGE_RETENTION_SECONDS is too short');
    return config;
  } catch (error) {
    return { enabled: false, reason: error instanceof Error ? error.message : 'Invalid AI configuration' };
  }
}

export function loadAiMaintenanceConfig(env: NodeJS.ProcessEnv = process.env): AiMaintenanceConfigResult {
  try {
    return {
      usageRetentionSeconds: integer(env, 'AI_USAGE_RETENTION_SECONDS', 31536000),
      cleanupIntervalSeconds: integer(env, 'AI_CLEANUP_INTERVAL_SECONDS', 86400)
    };
  } catch (error) {
    return { reason: error instanceof Error ? error.message : 'Invalid AI maintenance configuration' };
  }
}
