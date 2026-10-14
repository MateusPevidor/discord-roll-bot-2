# AI command configuration

AI admission is disabled by default. Set `AI_ENABLED=true` only after all values validate, including a positive `AI_DAILY_GLOBAL_TOKEN_BUDGET`. Production requires an HTTPS `AI_PUBLIC_BASE_URL`. The supported model is `deepseek-flash`; requests use DeepSeek thinking mode, with `DEEPSEEK_REASONING_EFFORT=high` by default (`low`, `high`, or `max`). The configured `AI_MAX_GENERATED_TOKENS` limit applies to generated output, including reasoning tokens.

DeepSeek's chat-completions API does not provide the model with internet access through a configuration flag. It supports function/tool calls, but the application must implement and run a search tool itself. No web-search integration is currently enabled, so answers rely on the prompt and supplied channel context.

Retention cleanup starts independently of provider admission. Disabling AI or misconfiguring provider credentials does not stop cleanup when `AI_USAGE_RETENTION_SECONDS` and `AI_CLEANUP_INTERVAL_SECONDS` remain valid.

| Variable | Default when enabled |
| --- | --- |
| `DEEPSEEK_API_KEY` | Required |
| `DEEPSEEK_MODEL` | Required, `deepseek-flash` |
| `DEEPSEEK_REASONING_EFFORT` | `high` (`low`, `high`, or `max`) |
| `AI_PUBLIC_BASE_URL` | Required canonical URL |
| `AI_REQUEST_TIMEOUT_MS` | 45000 |
| `AI_MAX_PROMPT_CHARS` | 2000 |
| `AI_CONTEXT_MESSAGE_LIMIT` | 30 |
| `AI_CONTEXT_MAX_AGE_SECONDS` | 3600 |
| `AI_CONTEXT_MAX_CHARS` | 12000 |
| `AI_MAX_GENERATED_TOKENS` | 2048 |
| `AI_SHORT_ANSWER_MAX_CHARS` | 900 |
| `AI_USER_REQUEST_LIMIT` / `AI_USER_WINDOW_SECONDS` | 5 / 600 |
| `AI_GUILD_REQUEST_LIMIT` / `AI_GUILD_WINDOW_SECONDS` | 30 / 600 |
| `AI_DAILY_GLOBAL_TOKEN_BUDGET` | Required, no default |
| `AI_MAX_CONCURRENT_REQUESTS` | 2 |
| `AI_ANSWER_RETENTION_SECONDS` | 604800 |
| `AI_USAGE_RETENTION_SECONDS` | 691200 |
| `AI_RESERVATION_RECOVERY_SECONDS` | 120, must exceed request timeout |
| `AI_CLEANUP_INTERVAL_SECONDS` | 3600 |

Run `pnpm exec prisma migrate deploy` separately before startup. Deploy Discord commands with `pnpm deploy-commands` as a separate explicit operation. Bearer answer links can be read by anyone who receives them until expiry, and membership changes do not revoke them. Keep one application instance and persistent SQLite storage.

Token admission reserves the maximum generated tokens plus a conservative prompt bound. The bound counts every byte of the serialized UTF-8 message envelope as a token and adds 256 tokens for fixed roles, separators, and chat-template framing. Reported provider usage above a reservation is charged in full and treated as an accounting failure rather than published.
