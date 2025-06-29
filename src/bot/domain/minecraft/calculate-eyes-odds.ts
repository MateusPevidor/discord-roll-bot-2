import { calculateOdds } from './common/odds-core';

export function calculateEyeOdds(count: number, type: string): string {
  const result = calculateOdds(12, count, 0.1, type);

  switch (type) {
    case 'or_less':
      return `Odds of ${count} or less eyes: ${result}%`;
    case 'or_more':
      return `Odds of ${count} or more eyes: ${result}%`;
    case 'exact':
    default:
      return `Odds of exactly ${count} eyes: ${result}%`;
  }
}
