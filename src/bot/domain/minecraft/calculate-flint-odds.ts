import { calculateOdds } from './common/odds-core';
import { getNumberSuffix } from '@/shared/utils/number-suffix';

const FLINT_DROP_RATE = 0.1;

export function calculateFlintOdds(
  gravels: number,
  flints: number,
  type: string
): string {
  const result = calculateOdds(gravels, flints, FLINT_DROP_RATE, type);

  switch (type) {
    case 'or_less':
      return `Odds of dropping ${flints} or less flints from ${gravels} gravels: ${result}%`;
    case 'or_more':
      return `Odds of dropping ${flints} or more flints from ${gravels} gravels: ${result}%`;
    case 'ends_at':
      return `Odds of getting the ${flints}${getNumberSuffix(
        flints
      )} flint at the ${gravels}${getNumberSuffix(gravels)} gravel: ${result}%`;
    case 'exact':
    default:
      return `Odds of dropping exactly ${flints} flints from ${gravels} gravels: ${result}%`;
  }
}
