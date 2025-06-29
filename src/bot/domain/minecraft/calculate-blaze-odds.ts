import { calculateOdds, calculateOddsForCompare } from './common/odds-core';
import { getNumberSuffix } from '@/shared/utils/number-suffix';
import {
  generateOddsChart,
  cleanupOldCharts
} from '@/bot/helpers/attachments/chart-generator';

const BLAZE_ROD_DROP_RATE = 0.5;

export interface BlazeOddsResult {
  message: string;
  chartPath?: string;
}

export async function calculateBlazeOdds(
  kills: number,
  rods: number,
  type: string,
  compare: string | null = null
): Promise<BlazeOddsResult> {
  let compareSuffix = '';
  let result: string | number = 0;
  let chartPath: string | undefined;

  if (!compare) {
    result = calculateOdds(kills, rods, BLAZE_ROD_DROP_RATE, type) as string;
  } else {
    const compareResult = calculateOddsForCompare(
      kills,
      rods,
      BLAZE_ROD_DROP_RATE,
      type
    );

    if (compare === 'top') {
      compareSuffix = ` (top ${compareResult.top}%)`;
    } else if (compare === 'bottom') {
      compareSuffix = ` (bottom ${compareResult.bottom}%)`;
    }

    const targetEntry = compareResult.odds.find((entry) => entry.i === kills);
    result = targetEntry?.odds || 0;

    // Generate chart for comparison data
    try {
      // Clean up old charts first
      cleanupOldCharts(1);

      // Find the index of the target entry for highlighting
      const highlightIndex = compareResult.odds.findIndex(
        (entry) => entry.i === kills
      );

      // Prepare chart data - convert BigNumber to regular numbers and format as percentages
      const chartData = compareResult.odds.map((entry) => ({
        i: entry.i,
        odds: typeof entry.odds === 'number' ? entry.odds : Number(entry.odds)
      }));

      chartPath = await generateOddsChart({
        title: `Blaze Rod Drop Probability Distribution (${type} ${rods} Rods)`,
        xAxisLabel: 'Total Blazes Killed',
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
      message = `Odds of dropping ${rods} or less rods from ${kills} blazes: ${result}%${compareSuffix}`;
      break;
    case 'or_more':
      message = `Odds of dropping ${rods} or more rods from ${kills} blazes: ${result}%${compareSuffix}`;
      break;
    case 'ends_at':
      message = `Odds of getting the ${rods}${getNumberSuffix(
        rods
      )} rod at the ${kills}${getNumberSuffix(
        kills
      )} blaze: ${result}%${compareSuffix}`;
      break;
    case 'exact':
    default:
      message = `Odds of dropping exactly ${rods} rods from ${kills} blazes: ${result}%${compareSuffix}`;
      break;
  }

  return {
    message,
    chartPath
  };
}
