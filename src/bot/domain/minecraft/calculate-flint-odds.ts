import { calculateOdds, calculateOddsForCompare } from './common/odds-core';
import { getNumberSuffix } from '@/shared/utils/number-suffix';
import {
  generateOddsChart,
  cleanupOldCharts
} from '@/bot/helpers/attachments/chart-generator';

const FLINT_DROP_RATE = 0.1;

export interface FlintOddsResult {
  message: string;
  chartPath?: string;
}

export async function calculateFlintOdds(
  gravels: number,
  flints: number,
  type: string,
  compare: string | null = null
): Promise<FlintOddsResult> {
  let compareSuffix = '';
  let result: string | number = 0;
  let chartPath: string | undefined;

  if (!compare) {
    result = calculateOdds(gravels, flints, FLINT_DROP_RATE, type) as string;
  } else {
    const compareResult = calculateOddsForCompare(
      gravels,
      flints,
      FLINT_DROP_RATE,
      type
    );

    if (compare === 'top') {
      compareSuffix = ` (top ${compareResult.top}%)`;
    } else if (compare === 'bottom') {
      compareSuffix = ` (bottom ${compareResult.bottom}%)`;
    }

    const targetEntry = compareResult.odds.find((entry) => entry.i === gravels);
    result = targetEntry?.odds || 0;

    // Generate chart for comparison data
    try {
      // Clean up old charts first
      cleanupOldCharts(1);

      // Find the index of the target entry for highlighting
      const highlightIndex = compareResult.odds.findIndex(
        (entry) => entry.i === gravels
      );

      // Prepare chart data - convert BigNumber to regular numbers and format as percentages
      const chartData = compareResult.odds.map((entry) => ({
        i: entry.i,
        odds: typeof entry.odds === 'number' ? entry.odds : Number(entry.odds)
      }));

      chartPath = await generateOddsChart({
        title: `Flint Drop Probability Distribution (${type} ${flints} Flints)`,
        xAxisLabel: 'Total Gravels Mined',
        yAxisLabel: 'Probability (%)',
        data: chartData,
        highlightIndex: highlightIndex >= 0 ? highlightIndex : undefined,
        highlightLabel: `${compare} ${
          compareResult[compare as keyof typeof compareResult]
        }%`,
        area: compare === 'top' ? 'top' : 'bottom',
        width: 1000,
        height: 600
      });
    } catch (error) {
      console.error('Error generating chart:', error);
      // Chart generation failed, but we still return the message
    }
  }

  let message: string;
  switch (type) {
    case 'or_less':
      message = `Odds of dropping ${flints} or less flints from ${gravels} gravels: ${result}%${compareSuffix}`;
      break;
    case 'or_more':
      message = `Odds of dropping ${flints} or more flints from ${gravels} gravels: ${result}%${compareSuffix}`;
      break;
    case 'ends_at':
      message = `Odds of getting the ${flints}${getNumberSuffix(
        flints
      )} flint at the ${gravels}${getNumberSuffix(
        gravels
      )} gravel: ${result}%${compareSuffix}`;
      break;
    case 'exact':
    default:
      message = `Odds of dropping exactly ${flints} flints from ${gravels} gravels: ${result}%${compareSuffix}`;
      break;
  }

  return {
    message,
    chartPath
  };
}
