export function roll(limit: number = 100): number {
  return Math.floor(Math.random() * limit) + 1;
}
