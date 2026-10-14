import { selectContext } from '../../../../src/bot/domain/ai/context';

const message = (id: string, content: string, time: number, bot = false) => ({
  id, content, createdTimestamp: time, author: { bot }
});

describe('selectContext', () => {
  test('filters and chronologically orders bounded recent messages', () => {
    const result = selectContext([
      message('newer', 'second', 9_000), message('bot', 'ignore', 8_000, true),
      message('future', 'ignore', 11_000), message('old', 'ignore', 1_000),
      message('first', 'first', 7_000), message('invocation', 'ignore', 9_500)
    ], { invocationId: 'invocation', invocationTimestamp: 10_000, maxAgeSeconds: 5, maxMessages: 2, maxChars: 100 });
    expect(result).toBe('first\nsecond');
  });

  test('favors newest context and enforces total characters', () => {
    const result = selectContext([
      message('1', 'older text', 1), message('2', 'newest text', 2)
    ], { invocationId: 'x', invocationTimestamp: 3, maxAgeSeconds: 5, maxMessages: 1, maxChars: 6 });
    expect(result).toBe('newest');
  });
});
