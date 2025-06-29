import { barterData, Barter, barterOdds } from './common/odds-core';
import { getNumberSuffix } from '../../../shared/utils/number-suffix';

export function calculateBarterOdds(
  trades: number,
  dropCount: number,
  lootType: Barter,
  type: string
): string {
  const barter = barterData[lootType];
  const result = barterOdds(trades, dropCount, lootType, type);

  const suffix = result.approximate ? ' (Approximate)' : '';

  switch (type) {
    case 'or_less':
      return `Odds of dropping ${dropCount} or less ${barter.name} from ${trades} trades: ${result.odds}%${suffix}`;
    case 'or_more':
      return `Odds of dropping ${dropCount} or more ${barter.name} from ${trades} trades: ${result.odds}%${suffix}`;
    case 'ends_at':
      return `Odds of getting the ${dropCount}${getNumberSuffix(dropCount)} ${
        barter.name
      } at the ${trades}${getNumberSuffix(trades)} trade: ${
        result.odds
      }%${suffix}`;
    case 'exact':
    default:
      return `Odds of dropping exactly ${dropCount} ${barter.name} from ${trades} trades: ${result.odds}%`;
  }
}
