export interface ContextMessage {
  id: string;
  content: string;
  createdTimestamp: number;
  author: { bot: boolean };
  system?: boolean;
}

export function selectContext(messages: Iterable<ContextMessage>, options: {
  invocationId: string; invocationTimestamp: number; maxAgeSeconds: number; maxMessages: number; maxChars: number;
}): string {
  const cutoff = options.invocationTimestamp - options.maxAgeSeconds * 1000;
  const eligible = Array.from(messages)
    .filter((message) => message.id !== options.invocationId && !message.author.bot && !message.system &&
      message.createdTimestamp <= options.invocationTimestamp && message.createdTimestamp >= cutoff && message.content.trim())
    .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
    .slice(0, options.maxMessages);
  const selected: string[] = [];
  let used = 0;
  for (const message of eligible) {
    const text = message.content.trim();
    const remaining = options.maxChars - used - (selected.length ? 1 : 0);
    if (remaining <= 0) break;
    selected.push(text.slice(0, remaining));
    used += Math.min(text.length, remaining) + (selected.length > 1 ? 1 : 0);
  }
  return selected.reverse().join('\n');
}
