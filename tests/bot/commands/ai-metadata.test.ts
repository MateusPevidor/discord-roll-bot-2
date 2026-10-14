import { AskAiCommand } from '../../../src/bot/commands/ask-ai';
import { AiExplainCommand } from '../../../src/bot/commands/ai-explain';

describe('AI command metadata', () => {
  test('is guild-installed and guild-context only', () => {
    const ask = new AskAiCommand().command.toJSON() as unknown as Record<string, unknown>;
    const explain = new AiExplainCommand().command.toJSON() as unknown as Record<string, unknown>;
    expect(ask).toMatchObject({ name: 'ask-ai', integration_types: [0], contexts: [0] });
    expect((ask.options as unknown[])).toHaveLength(1);
    expect(explain).toMatchObject({ name: 'ai-explain', integration_types: [0], contexts: [0] });
    expect(explain.options || []).toHaveLength(0);
  });
});
