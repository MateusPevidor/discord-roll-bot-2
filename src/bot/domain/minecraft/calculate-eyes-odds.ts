import { calculateOdds, calculateOddsForCompare } from './common/odds-core';
import {
  generateOddsChart,
  cleanupOldCharts
} from '@/bot/helpers/attachments/chart-generator';

const EYE_SPAWN_RATE = 0.1;
const MAX_EYES = 12;

export interface EyeOddsResult {
  message: string;
  chartPath?: string;
}

export async function calculateEyeOdds(
  count: number,
  type: string,
  compare: string | null = null
): Promise<EyeOddsResult> {
  let compareSuffix = '';
  let result: string | number = 0;
  let chartPath: string | undefined;

  if (!compare) {
    result = calculateOdds(MAX_EYES, count, EYE_SPAWN_RATE, type) as string;
  } else {
    const compareResult = calculateOddsForCompare(
      MAX_EYES,
      count,
      EYE_SPAWN_RATE,
      type
    );

    if (compare === 'top') {
      compareSuffix = ` (top ${compareResult.top}%)`;
    } else if (compare === 'bottom') {
      compareSuffix = ` (bottom ${compareResult.bottom}%)`;
    }

    const targetEntry = compareResult.odds.find(
      (entry) => entry.i === MAX_EYES
    );
    result = targetEntry?.odds || 0;

    // Generate chart for comparison data
    try {
      // Clean up old charts first
      cleanupOldCharts(1);

      // Find the index of the target entry for highlighting
      const highlightIndex = compareResult.odds.findIndex(
        (entry) => entry.i === MAX_EYES
      );

      // Prepare chart data - convert BigNumber to regular numbers and format as percentages
      const chartData = compareResult.odds.map((entry) => ({
        i: entry.i,
        odds: typeof entry.odds === 'number' ? entry.odds : Number(entry.odds)
      }));

      chartPath = await generateOddsChart({
        title: `Ender Eye Spawn Probability Distribution (${type} ${count} Eyes)`,
        xAxisLabel: 'Portal Frames',
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
      message = `Odds of ${count} or less eyes: ${result}%${compareSuffix}`;
      break;
    case 'or_more':
      message = `Odds of ${count} or more eyes: ${result}%${compareSuffix}`;
      break;
    case 'exact':
    default:
      message = `Odds of exactly ${count} eyes: ${result}%${compareSuffix}`;
      break;
  }

  return {
    message,
    chartPath
  };
}
