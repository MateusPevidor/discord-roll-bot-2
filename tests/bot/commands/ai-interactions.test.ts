import { ChatInputCommandInteraction, InteractionContextType } from 'discord.js';
import { AskAiCommand } from '../../../src/bot/commands/ask-ai';
import { AiExplainCommand } from '../../../src/bot/commands/ai-explain';
import { isSupportedAiInteraction } from '../../../src/bot/commands/ai-command-utils';
import { AiConfig, loadAiConfig } from '../../../src/shared/config/ai';

const loaded = loadAiConfig({
  AI_ENABLED: 'true', DEEPSEEK_API_KEY: 'secret', DEEPSEEK_MODEL: 'deepseek-flash',
  AI_PUBLIC_BASE_URL: 'https://bot.test', AI_DAILY_GLOBAL_TOKEN_BUDGET: '100000'
});
if (!loaded.enabled) throw new Error('Test AI configuration is invalid');
const config: AiConfig = loaded;

function interaction(overrides: Record<string, unknown> = {}) {
  const events: string[] = [];
  const value: Record<string, any> = {
    id: 'interaction', channelId: 'channel', guildId: 'guild', context: InteractionContextType.Guild, createdTimestamp: Date.now(),
    user: { id: 'user' }, authorizingIntegrationOwners: { guildId: 'guild', userId: null },
    inGuild: jest.fn(() => true),
    options: { getString: jest.fn(() => ' question ') },
    reply: jest.fn(async () => { events.push('reply'); return {}; }),
    deferReply: jest.fn(async () => { events.push('defer'); return {}; }),
    editReply: jest.fn(async () => { events.push('edit'); return {}; }),
    ...overrides
  };
  return { value: value as ChatInputCommandInteraction, raw: value, events };
}

describe('AI interaction authorization', () => {
  test.each([
    ['DM', { guildId: null, inGuild: () => false, authorizingIntegrationOwners: { guildId: null, userId: 'user' } }, false],
    ['user install in a guild', { authorizingIntegrationOwners: { guildId: null, userId: 'user' } }, false],
    ['non-guild interaction context', { context: InteractionContextType.BotDM }, false],
    ['wrong guild installation', { authorizingIntegrationOwners: { guildId: 'other', userId: null } }, false],
    ['guild installation', { authorizingIntegrationOwners: { guildId: 'guild', userId: null } }, true]
  ])('%s support is %s', (_name, shape, expected) => {
    expect(isSupportedAiInteraction(interaction(shape).value)).toBe(expected);
  });
});

describe('/ask-ai interaction flow', () => {
  test.each(['   ', 'x'.repeat(config.maxPromptChars + 1)])('validates prompt bounds before deferral', async (prompt) => {
    const item = interaction({ options: { getString: () => prompt } });
    const run = jest.fn();
    await new AskAiCommand(() => config, () => ({ run })).execute(item.value);
    expect(item.raw.reply).toHaveBeenCalledWith(expect.objectContaining({ allowedMentions: { parse: [], repliedUser: false } }));
    expect(item.raw.deferReply).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  test('defers publicly before orchestration and suppresses mentions on edit', async () => {
    const item = interaction();
    const run = jest.fn(async () => { item.events.push('run'); return { kind: 'answer' as const, content: '@everyone safe' }; });
    await new AskAiCommand(() => config, () => ({ run })).execute(item.value);
    expect(item.events).toEqual(['defer', 'run', 'edit']);
    expect(item.raw.deferReply).toHaveBeenCalledWith({ ephemeral: false });
    expect(item.raw.editReply).toHaveBeenCalledWith({ content: '@everyone safe', allowedMentions: { parse: [], repliedUser: false } });
  });

  test('does no work after deferral failure', async () => {
    const item = interaction({ deferReply: jest.fn().mockRejectedValue(new Error('Discord unavailable')) });
    const run = jest.fn();
    await new AskAiCommand(() => config, () => ({ run })).execute(item.value);
    expect(run).not.toHaveBeenCalled();
    expect(item.raw.editReply).not.toHaveBeenCalled();
  });

  test('does not repeat provider work or send an initial reply after final edit failure', async () => {
    const item = interaction({ editReply: jest.fn().mockRejectedValue(new Error('expired interaction')) });
    const run = jest.fn().mockResolvedValue({ kind: 'answer', content: 'answer' });
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await new AskAiCommand(() => config, () => ({ run })).execute(item.value);
    expect(run).toHaveBeenCalledTimes(1);
    expect(item.raw.reply).not.toHaveBeenCalled();
    error.mockRestore();
  });
});

describe('/ai-explain interaction flow', () => {
  function explainInteraction(channelOverrides: Record<string, unknown> = {}) {
    const messages = new Map([['m1', { id: 'm1', content: 'What is this?', createdTimestamp: Date.now() - 1000, author: { bot: false } }]]);
    const channel = {
      isTextBased: () => true,
      permissionsFor: () => ({ has: () => true }),
      messages: { fetch: jest.fn().mockResolvedValue(messages) },
      ...channelOverrides
    };
    const item = interaction();
    item.raw.guild = {
      channels: { fetch: jest.fn(async (id: string) => { item.events.push(`fetch:${id}`); return channel; }) },
      members: { me: { id: 'bot' }, fetchMe: jest.fn() }
    };
    return { ...item, channel };
  }

  test('defers before current-channel history access and orchestration', async () => {
    const item = explainInteraction();
    const run = jest.fn(async () => { item.events.push('run'); return { kind: 'answer' as const, content: 'answer' }; });
    await new AiExplainCommand(() => config, () => ({ run })).execute(item.value);
    expect(item.events).toEqual(['defer', 'fetch:channel', 'run', 'edit']);
    expect(item.raw.guild.channels.fetch).toHaveBeenCalledWith('channel');
    expect(item.channel.messages.fetch).toHaveBeenCalledWith({ limit: config.contextMessageLimit, before: 'interaction' });
  });

  test('reports permission and history failures only through editReply', async () => {
    const denied = explainInteraction({ permissionsFor: () => ({ has: () => false }) });
    await new AiExplainCommand(() => config, () => ({ run: jest.fn() })).execute(denied.value);
    expect(denied.raw.reply).not.toHaveBeenCalled();
    expect(denied.raw.editReply).toHaveBeenCalledTimes(1);

    const failed = explainInteraction();
    failed.raw.guild.channels.fetch.mockRejectedValue(new Error('missing access'));
    await new AiExplainCommand(() => config, () => ({ run: jest.fn() })).execute(failed.value);
    expect(failed.raw.editReply).toHaveBeenCalledTimes(1);
  });

  test('does not call the provider for empty history or failed deferral', async () => {
    const empty = explainInteraction({ messages: { fetch: jest.fn().mockResolvedValue(new Map()) } });
    const run = jest.fn();
    await new AiExplainCommand(() => config, () => ({ run })).execute(empty.value);
    expect(run).not.toHaveBeenCalled();
    expect(empty.raw.editReply).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining('no recent') }));

    const failed = explainInteraction();
    failed.raw.deferReply.mockRejectedValue(new Error('failed'));
    await new AiExplainCommand(() => config, () => ({ run })).execute(failed.value);
    expect(failed.raw.guild.channels.fetch).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  test('does not repeat orchestration after final edit failure', async () => {
    const item = explainInteraction();
    item.raw.editReply.mockRejectedValue(new Error('expired'));
    const run = jest.fn().mockResolvedValue({ kind: 'answer', content: 'answer' });
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await new AiExplainCommand(() => config, () => ({ run })).execute(item.value);
    expect(run).toHaveBeenCalledTimes(1);
    expect(item.raw.reply).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
