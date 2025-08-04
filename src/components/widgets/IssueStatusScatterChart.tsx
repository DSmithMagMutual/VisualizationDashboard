import React, { useEffect, useRef } from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import Chart from 'chart.js/auto';

interface IssueStatusScatterChartProps {
  data: Array<{
    status: string;
    daysInStatus: number;
    key?: string | number;
  }>;
}

const statusColors: Record<string, string> = {
  'To Do': '#1E90FF', // Dodger Blue
  'In Progress': '#FF8C00', // Dark Orange
  'Done': '#43EA7F', // Bright Green
  'Blocked': '#FF3B30', // Vivid Red
  'Review': '#A259FF', // Purple
  'Testing': '#00CFFF', // Cyan
  'Unknown': '#B0B0B0', // Light Gray
};

const IssueStatusScatterChart: React.FC<IssueStatusScatterChartProps> = ({ data }) => {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    // Map statuses to x values
    const uniqueStatuses = Array.from(new Set(data.map(d => d.status)));
    const statusToX = Object.fromEntries(uniqueStatuses.map((s, i) => [s, i]));
    const scatterData = data.map(d => ({
      x: statusToX[d.status],
      y: d.daysInStatus,
      status: d.status,
    }));
    chartInstance.current = new Chart(chartRef.current, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Cards by Status Duration',
            data: scatterData,
            backgroundColor: scatterData.map(d => statusColors[d.status] || '#FFD600'),
            pointRadius: 10,
            pointHoverRadius: 14,
            borderWidth: 3,
            borderColor: scatterData.map(d => statusColors[d.status] || '#FFD600'),
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: {
              color: '#F3F6FA',
              font: { weight: 'bold' },
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx: any) => {
                const status = uniqueStatuses[ctx.parsed.x];
                return `Status: ${status}, Days: ${ctx.parsed.y}`;
              },
            },
          },
        },
        scales: {
          x: {
            type: 'linear',
            min: -0.5,
            max: uniqueStatuses.length - 0.5,
            ticks: {
              callback: function (tickValue: string | number, _index: number, _ticks: any[]) {
                return uniqueStatuses[Number(tickValue)] || '';
              },
              color: '#A259FF',
              font: { weight: 'bold' },
            },
            grid: {
              color: '#23293A',
            },
            title: {
              display: true,
              text: 'Card Status',
              color: '#7F5AF0',
              font: { weight: 'bold' },
            },
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Days in Status',
              color: '#7F5AF0',
              font: { weight: 'bold' },
            },
            ticks: {
              color: '#A259FF',
              font: { weight: 'bold' },
            },
            grid: {
              color: '#23293A',
            },
          },
        },
      },
    });
    return () => {
      chartInstance.current?.destroy();
    };
  }, [data]);

  return (
    <Card sx={{ mb: 2, maxWidth: 800, mx: 'auto', borderRadius: 3, boxShadow: '0 4px 24px 0 #7F5AF033', bgcolor: '#23293A', border: '1px solid #2D3142' }}>
      <CardContent>
        <Typography variant="h6" sx={{ color: '#A259FF', fontWeight: 700, mb: 2 }}>
          Issue Status Scatter Chart
        </Typography>
        <canvas ref={chartRef} height={320} />
      </CardContent>
    </Card>
  );
};

export default IssueStatusScatterChart; 