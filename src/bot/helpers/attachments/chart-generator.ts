import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { createCanvas } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';

// Register Chart.js components
Chart.register(...registerables);

export interface OddsDataPoint {
  i: number;
  odds: number;
}

export interface ChartGenerationOptions {
  title: string;
  xAxisLabel: string;
  yAxisLabel: string;
  data: OddsDataPoint[];
  highlightIndex?: number;
  highlightLabel?: string;
  area?: 'top' | 'bottom';
  width?: number;
  height?: number;
}

export async function generateOddsChart(
  options: ChartGenerationOptions
): Promise<string> {
  const {
    title,
    xAxisLabel,
    yAxisLabel,
    data,
    highlightIndex,
    highlightLabel,
    area,
    width = 800,
    height = 600
  } = options;

  // Create canvas
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Prepare chart data
  const labels = data.map((point) => point.i.toString());
  const values = data.map((point) => point.odds);

  // Create background colors array with highlight
  const backgroundColors = data.map((_, index) => {
    if (highlightIndex !== undefined && index === highlightIndex) {
      return 'rgba(255, 99, 132, 0.8)'; // Red for highlighted point
    }
    return 'rgba(54, 162, 235, 0.6)'; // Blue for other points
  });

  const borderColors = data.map((_, index) => {
    if (highlightIndex !== undefined && index === highlightIndex) {
      return 'rgba(255, 99, 132, 1)';
    }
    return 'rgba(54, 162, 235, 1)';
  });

  // Prepare area data based on area parameter
  let areaData: number[] = [];
  if (area && highlightIndex !== undefined) {
    if (area === 'top') {
      // Fill area before (and including) the highlight index
      areaData = values.map((value, index) =>
        index <= highlightIndex ? value : (null as any)
      );
    } else if (area === 'bottom') {
      // Fill area after (and including) the highlight index
      areaData = values.map((value, index) =>
        index >= highlightIndex ? value : (null as any)
      );
    }
  }

  const chartConfig: ChartConfiguration = {
    type: 'line',
    data: {
      labels,
      datasets: [
        // Area fill dataset (only if area is specified)
        ...(area && highlightIndex !== undefined
          ? [
              {
                label: area === 'top' ? 'Area Before' : 'Area After',
                data: areaData,
                backgroundColor: 'rgba(255, 99, 132, 0.3)', // Semi-transparent red
                borderColor: 'rgba(255, 99, 132, 0.5)',
                borderWidth: 1,
                fill: true,
                tension: 0.1,
                pointRadius: 0,
                pointHoverRadius: 0,
                pointBackgroundColor: 'transparent',
                pointBorderColor: 'transparent',
                order: 2 // Render behind the main line
              }
            ]
          : []),
        // Main line dataset
        {
          label: 'Probability (%)',
          data: values,
          backgroundColor: 'rgba(54, 162, 235, 0.6)', // Blue for all points
          borderColor: 'rgba(54, 162, 235, 1)', // Blue line
          borderWidth: 2,
          fill: false,
          tension: 0.1,
          pointBackgroundColor: backgroundColors, // Use the color array for individual points
          pointBorderColor: borderColors, // Use the color array for individual point borders
          pointRadius: 4,
          pointHoverRadius: 6,
          order: 1 // Render in front of the area
        }
      ]
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        title: {
          display: true,
          text: title,
          font: {
            size: 16,
            weight: 'bold'
          },
          color: '#ffffff'
        },
        legend: {
          labels: {
            color: '#ffffff'
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: xAxisLabel,
            color: '#ffffff'
          },
          ticks: {
            color: '#ffffff'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        y: {
          title: {
            display: true,
            text: yAxisLabel,
            color: '#ffffff'
          },
          ticks: {
            color: '#ffffff',
            callback: function (value) {
              return value + '%';
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        }
      },
      layout: {
        padding: 20
      }
    },
    plugins: [
      {
        id: 'background',
        beforeDraw: (chart) => {
          const ctx = chart.canvas.getContext('2d');
          if (ctx) {
            ctx.save();
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = '#2f3136'; // Discord dark theme background
            ctx.fillRect(0, 0, chart.width, chart.height);
            ctx.restore();
          }
        }
      },
      {
        id: 'highlightLabel',
        afterDraw: (chart) => {
          if (
            highlightIndex !== undefined &&
            highlightLabel &&
            highlightIndex < data.length
          ) {
            const ctx = chart.canvas.getContext('2d');
            if (ctx) {
              // Find the main line dataset (the one with order: 1)
              const mainDatasetIndex =
                area && highlightIndex !== undefined ? 1 : 0;
              const meta = chart.getDatasetMeta(mainDatasetIndex);
              const point = meta.data[highlightIndex];

              if (point) {
                ctx.save();

                // Set text properties
                ctx.font = 'bold 14px Arial';
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 3;

                // Calculate label position (above the point)
                const x = point.x;
                const y = point.y - 15;

                // Draw text outline for better visibility
                ctx.strokeText(highlightLabel, x, y);
                ctx.fillText(highlightLabel, x, y);

                ctx.restore();
              }
            }
          }
        }
      }
    ]
  };

  // Create chart
  const chart = new Chart(ctx as any, chartConfig);

  // Ensure charts directory exists
  const chartsDir = path.join(process.cwd(), 'charts');
  if (!fs.existsSync(chartsDir)) {
    fs.mkdirSync(chartsDir, { recursive: true });
  }

  // Generate unique filename
  const timestamp = Date.now();
  const filename = `odds-chart-${timestamp}.png`;
  const filepath = path.join(chartsDir, filename);

  // Save chart as image
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filepath, buffer as any);

  // Clean up
  chart.destroy();

  return filepath;
}

export function cleanupOldCharts(maxAgeHours: number = 1): void {
  const chartsDir = path.join(process.cwd(), 'charts');

  if (!fs.existsSync(chartsDir)) {
    return;
  }

  const now = Date.now();
  const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert hours to milliseconds

  try {
    const files = fs.readdirSync(chartsDir);

    for (const file of files) {
      if (file.startsWith('odds-chart-') && file.endsWith('.png')) {
        const filepath = path.join(chartsDir, file);
        const stats = fs.statSync(filepath);

        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filepath);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up old charts:', error);
  }
}
