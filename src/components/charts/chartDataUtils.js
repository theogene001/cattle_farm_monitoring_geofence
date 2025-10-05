// src/components/charts/chartDataUtils.js
import { chartColors } from './ChartComponents';

// Helper function to process animal health data for charts
export const processHealthData = (animals) => {
  if (!animals || animals.length === 0) {
    return {
      labels: ['No Data'],
      datasets: [{
        data: [1],
        backgroundColor: [chartColors.muted],
        borderColor: [chartColors.muted],
        borderWidth: 1
      }]
    };
  }

  const healthCounts = animals.reduce((acc, animal) => {
    const status = animal.health_status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const statusColors = {
    healthy: chartColors.success,
    monitoring: chartColors.warning,
    sick: chartColors.danger,
    unknown: chartColors.muted
  };

  return {
    labels: Object.keys(healthCounts).map(status => 
      status.charAt(0).toUpperCase() + status.slice(1)
    ),
    datasets: [{
      data: Object.values(healthCounts),
      backgroundColor: Object.keys(healthCounts).map(status => statusColors[status] || chartColors.muted),
      borderColor: Object.keys(healthCounts).map(status => statusColors[status] || chartColors.muted),
      borderWidth: 2
    }]
  };
};

// Helper function to process alert data over time
export const processAlertTrendData = (alerts, days = 7) => {
  if (!alerts || alerts.length === 0) {
    return {
      labels: ['No Data'],
      datasets: [{
        label: 'Alerts',
        data: [0],
        backgroundColor: chartColors.muted,
        borderColor: chartColors.muted,
        borderWidth: 2,
        fill: false
      }]
    };
  }

  // Get last N days
  const today = new Date();
  const labels = [];
  const dateKeys = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    dateKeys.push(dateKey);
    labels.push(label);
  }

  // Count alerts by date
  const alertCounts = dateKeys.map(dateKey => {
    return alerts.filter(alert => {
      const alertDate = new Date(alert.timestamp || alert.triggered_at).toISOString().split('T')[0];
      return alertDate === dateKey;
    }).length;
  });

  return {
    labels,
    datasets: [{
      label: 'Daily Alerts',
      data: alertCounts,
      backgroundColor: 'rgba(255, 107, 107, 0.1)',
      borderColor: chartColors.danger,
      borderWidth: 2,
      fill: true,
      tension: 0.4,
      pointBackgroundColor: chartColors.danger,
      pointBorderColor: '#FFFFFF',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  };
};

// Helper function to process alert types
export const processAlertTypeData = (alerts) => {
  if (!alerts || alerts.length === 0) {
    return {
      labels: ['No Alerts'],
      datasets: [{
        data: [1],
        backgroundColor: [chartColors.success],
        borderColor: [chartColors.success],
        borderWidth: 1
      }]
    };
  }

  const typeCounts = alerts.reduce((acc, alert) => {
    const type = alert.alert_type || 'unknown';
    const displayType = type.replace(/_/g, ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    acc[displayType] = (acc[displayType] || 0) + 1;
    return acc;
  }, {});

  const typeColors = {
    'Fence Breach': chartColors.danger,
    'Health Alert': chartColors.warning,
    'Location Update': chartColors.info,
    'System Alert': chartColors.primary,
    'Unknown': chartColors.muted
  };

  return {
    labels: Object.keys(typeCounts),
    datasets: [{
      data: Object.values(typeCounts),
      backgroundColor: Object.keys(typeCounts).map(type => typeColors[type] || chartColors.muted),
      borderColor: Object.keys(typeCounts).map(type => typeColors[type] || chartColors.muted),
      borderWidth: 2
    }]
  };
};

// Helper function to process animal distribution by breed
export const processBreedData = (animals) => {
  if (!animals || animals.length === 0) {
    return {
      labels: ['No Data'],
      datasets: [{
        data: [1],
        backgroundColor: [chartColors.muted],
        borderColor: [chartColors.muted],
        borderWidth: 1
      }]
    };
  }

  const breedCounts = animals.reduce((acc, animal) => {
    const breed = animal.breed || 'Unknown';
    acc[breed] = (acc[breed] || 0) + 1;
    return acc;
  }, {});

  // Generate colors for different breeds
  const colors = [
    chartColors.primary,
    chartColors.secondary,
    chartColors.accent,
    chartColors.info,
    chartColors.warning,
    chartColors.success,
    chartColors.danger
  ];

  return {
    labels: Object.keys(breedCounts),
    datasets: [{
      data: Object.values(breedCounts),
      backgroundColor: Object.keys(breedCounts).map((_, index) => 
        colors[index % colors.length]
      ),
      borderColor: Object.keys(breedCounts).map((_, index) => 
        colors[index % colors.length]
      ),
      borderWidth: 2
    }]
  };
};

// Helper function to process monthly animal activity
export const processMonthlyActivityData = (animalLocations, months = 6) => {
  if (!animalLocations || animalLocations.length === 0) {
    return {
      labels: ['No Data'],
      datasets: [{
        label: 'Activity',
        data: [0],
        backgroundColor: chartColors.muted,
        borderColor: chartColors.muted,
        borderWidth: 2
      }]
    };
  }

  // Get last N months
  const today = new Date();
  const labels = [];
  const monthKeys = [];
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    
    monthKeys.push(monthKey);
    labels.push(label);
  }

  // Count location updates by month
  const activityCounts = monthKeys.map(monthKey => {
    return animalLocations.filter(location => {
      const locationDate = new Date(location.timestamp);
      const locationMonthKey = `${locationDate.getFullYear()}-${String(locationDate.getMonth() + 1).padStart(2, '0')}`;
      return locationMonthKey === monthKey;
    }).length;
  });

  return {
    labels,
    datasets: [{
      label: 'Location Updates',
      data: activityCounts,
      backgroundColor: 'rgba(60, 179, 113, 0.1)',
      borderColor: chartColors.primary,
      borderWidth: 2,
      fill: true,
      tension: 0.4,
      pointBackgroundColor: chartColors.primary,
      pointBorderColor: '#FFFFFF',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  };
};

// Helper function to process farm summary data
export const processFarmSummaryData = (dashboardData) => {
  if (!dashboardData || !dashboardData.summary) {
    return {
      labels: ['No Data'],
      datasets: [{
        data: [1],
        backgroundColor: [chartColors.muted],
        borderColor: [chartColors.muted],
        borderWidth: 1
      }]
    };
  }

  const { summary } = dashboardData;
  
  return {
    labels: ['Animals', 'Active Collars', 'Virtual Fences', 'Active Alerts'],
    datasets: [{
      label: 'Farm Overview',
      data: [
        summary.totalAnimals || 0,
        summary.activeCollars || 0,
        summary.virtualFences || 0,
        summary.activeAlerts || 0
      ],
      backgroundColor: [
        chartColors.primary,
        chartColors.success,
        chartColors.info,
        chartColors.danger
      ],
      borderColor: [
        chartColors.primary,
        chartColors.success,
        chartColors.info,
        chartColors.danger
      ],
      borderWidth: 2
    }]
  };
};

// Helper function to create empty chart data with message
export const createEmptyChartData = (message = 'No data available') => {
  return {
    labels: [message],
    datasets: [{
      data: [1],
      backgroundColor: [chartColors.light],
      borderColor: [chartColors.muted],
      borderWidth: 1
    }]
  };
};

const chartDataUtils = {
  processHealthData,
  processAlertTrendData,
  processAlertTypeData,
  processBreedData,
  processMonthlyActivityData,
  processFarmSummaryData,
  createEmptyChartData
};

export default chartDataUtils;