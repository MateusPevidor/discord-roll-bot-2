import { calculateOdds } from './common/odds-core';
import { getNumberSuffix } from '@/shared/utils/number-suffix';

const BLAZE_ROD_DROP_RATE = 0.5;

export function calculateBlazeOdds(
  kills: number,
  rods: number,
  type: string
): string {
  const result = calculateOdds(kills, rods, BLAZE_ROD_DROP_RATE, type);

  switch (type) {
    case 'or_less':
      return `Odds of dropping ${rods} or less rods from ${kills} blazes: ${result}%`;
    case 'or_more':
      return `Odds of dropping ${rods} or more rods from ${kills} blazes: ${result}%`;
    case 'ends_at':
      return `Odds of getting the ${rods}${getNumberSuffix(
        rods
      )} rod at the ${kills}${getNumberSuffix(kills)} blaze: ${result}%`;
    case 'exact':
    default:
      return `Odds of dropping exactly ${rods} rods from ${kills} blazes: ${result}%`;
  }
}
