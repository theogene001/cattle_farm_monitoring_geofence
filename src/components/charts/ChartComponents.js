// src/components/charts/ChartComponents.js
import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Default chart options with cattle farm theme
const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        boxWidth: 12,
        padding: 15,
        font: {
          size: 12,
          family: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
        }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(26, 26, 26, 0.9)',
      titleColor: '#FFFFFF',
      bodyColor: '#FFFFFF',
      borderColor: '#3CB371',
      borderWidth: 1,
      cornerRadius: 8,
      padding: 12
    }
  },
  scales: {
    x: {
      ticks: {
        font: {
          size: 11
        },
        color: '#666666'
      },
      grid: {
        color: 'rgba(224, 224, 224, 0.3)'
      }
    },
    y: {
      ticks: {
        font: {
          size: 11
        },
        color: '#666666'
      },
      grid: {
        color: 'rgba(224, 224, 224, 0.3)'
      }
    }
  }
};

// Cattle farm color palette
export const chartColors = {
  primary: '#3CB371',      // Medium Sea Green
  secondary: '#2E8B57',    // Sea Green Dark
  accent: '#7CFC00',       // Sea Green Light
  danger: '#FF6B6B',       // Alert Red
  warning: '#FFA726',      // Alert Orange
  success: '#4CAF50',      // Alert Green
  info: '#42A5F5',         // Blue
  muted: '#666666',        // Gray Dark
  light: '#F5F5F5'         // Gray Light
};

// Bar Chart Component
export const BarChart = ({ data, options = {}, height = 300 }) => {
  const mergedOptions = {
    ...defaultOptions,
    ...options
  };

  return (
    <div style={{ height: `${height}px`, width: '100%' }}>
      <Bar data={data} options={mergedOptions} />
    </div>
  );
};

// Line Chart Component
export const LineChart = ({ data, options = {}, height = 300 }) => {
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    scales: {
      ...defaultOptions.scales,
      y: {
        ...defaultOptions.scales.y,
        beginAtZero: true
      }
    }
  };

  return (
    <div style={{ height: `${height}px`, width: '100%' }}>
      <Line data={data} options={mergedOptions} />
    </div>
  );
};

// Doughnut Chart Component
export const DoughnutChart = ({ data, options = {}, height = 300 }) => {
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 12,
          padding: 20,
          font: {
            size: 12,
            family: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(26, 26, 26, 0.9)',
        titleColor: '#FFFFFF',
        bodyColor: '#FFFFFF',
        borderColor: '#3CB371',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
    cutout: '60%',
    ...options
  };

  return (
    <div style={{ height: `${height}px`, width: '100%' }}>
      <Doughnut data={data} options={doughnutOptions} />
    </div>
  );
};

// Pie Chart Component
export const PieChart = ({ data, options = {}, height = 300 }) => {
  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 12,
          padding: 20,
          font: {
            size: 12,
            family: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(26, 26, 26, 0.9)',
        titleColor: '#FFFFFF',
        bodyColor: '#FFFFFF',
        borderColor: '#3CB371',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
    ...options
  };

  return (
    <div style={{ height: `${height}px`, width: '100%' }}>
      <Pie data={data} options={pieOptions} />
    </div>
  );
};

// Area Chart Component (Line chart with fill)
export const AreaChart = ({ data, options = {}, height = 300 }) => {
  const areaOptions = {
    ...defaultOptions,
    ...options,
    scales: {
      ...defaultOptions.scales,
      y: {
        ...defaultOptions.scales.y,
        beginAtZero: true
      }
    },
    elements: {
      line: {
        fill: true
      }
    }
  };

  // Ensure fill property is set on datasets
  const areaData = {
    ...data,
    datasets: data.datasets.map(dataset => ({
      ...dataset,
      fill: dataset.fill !== undefined ? dataset.fill : true,
      backgroundColor: dataset.backgroundColor || 'rgba(60, 179, 113, 0.1)',
      borderColor: dataset.borderColor || chartColors.primary,
      borderWidth: dataset.borderWidth || 2,
      pointBackgroundColor: dataset.pointBackgroundColor || chartColors.primary,
      pointBorderColor: dataset.pointBorderColor || '#FFFFFF',
      pointBorderWidth: dataset.pointBorderWidth || 2,
      pointRadius: dataset.pointRadius || 4,
      pointHoverRadius: dataset.pointHoverRadius || 6
    }))
  };

  return (
    <div style={{ height: `${height}px`, width: '100%' }}>
      <Line data={areaData} options={areaOptions} />
    </div>
  );
};

const ChartComponents = {
  BarChart,
  LineChart,
  DoughnutChart,
  PieChart,
  AreaChart,
  chartColors
};

export default ChartComponents;