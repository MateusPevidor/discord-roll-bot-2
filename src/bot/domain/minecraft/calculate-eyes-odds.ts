import { calculateOdds } from './common/odds-core';

const EYE_SPAWN_RATE = 0.1;
const MAX_EYES = 12;

export function calculateEyeOdds(count: number, type: string): string {
  const result = calculateOdds(MAX_EYES, count, EYE_SPAWN_RATE, type);

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
