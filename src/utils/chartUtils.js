import ApexCharts from 'apexcharts';

const chartInstances = {};

function destroyExistingChart(canvasId) {
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
    delete chartInstances[canvasId];
  }
}

/**
 * Render Ultra-WOW ApexCharts Weight Spline Area Chart
 */
export function renderWeightChart(canvasId, dailyLogs = [], targetWeight = 65) {
  const container = document.getElementById(canvasId);
  if (!container) return;

  destroyExistingChart(canvasId);

  // Clear canvas tag if any, replace with div container if needed
  container.innerHTML = '';

  const labels = dailyLogs.map(l => l.date).reverse();
  const weights = dailyLogs.map(l => l.weight || null).reverse();
  const targetLines = labels.map(() => targetWeight);

  const options = {
    series: [
      {
        name: 'Cân Nặng Thực Tế',
        data: weights.length ? weights : [70]
      },
      {
        name: 'Mục Tiêu (kg)',
        data: targetLines.length ? targetLines : [targetWeight]
      }
    ],
    chart: {
      type: 'area',
      height: 270,
      fontFamily: 'Inter, sans-serif',
      toolbar: { show: false },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800
      },
      dropShadow: {
        enabled: true,
        color: '#7556D9',
        top: 6,
        left: 0,
        blur: 12,
        opacity: 0.2
      }
    },
    colors: ['#7556D9', '#FBBF24'],
    stroke: {
      curve: 'smooth',
      width: [4, 2.5],
      dashArray: [0, 6]
    },
    fill: {
      type: ['gradient', 'solid'],
      gradient: {
        shade: 'light',
        type: 'vertical',
        shadeIntensity: 0.5,
        gradientToColors: ['#6042C0'],
        inverseColors: false,
        opacityFrom: 0.5,
        opacityTo: 0.05,
        stops: [0, 90, 100]
      },
      opacity: [1, 0.1]
    },
    markers: {
      size: [6, 0],
      colors: ['#7556D9'],
      strokeColors: ['#FFFFFF'],
      strokeWidth: 3,
      hover: { size: 9 }
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: labels.length ? labels : ['Hôm nay'],
      labels: {
        style: { colors: 'var(--text-muted)', fontSize: '11px', fontWeight: 600 }
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        style: { colors: 'var(--text-muted)', fontSize: '11px', fontWeight: 600 },
        formatter: (val) => `${val} kg`
      }
    },
    grid: {
      borderColor: 'rgba(117, 86, 217, 0.08)',
      strokeDashArray: 4
    },
    tooltip: {
      theme: 'dark',
      x: { format: 'dd/MM' },
      style: { fontSize: '12px', fontFamily: 'Inter' }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      labels: { colors: 'var(--text-main)' }
    }
  };

  const chart = new ApexCharts(container, options);
  chart.render();
  chartInstances[canvasId] = chart;
}

/**
 * Render Ultra-WOW ApexCharts Calorie In/Out Column Chart
 */
export function renderCalorieChart(canvasId, dailyLogs = [], targetCalorie = 2000) {
  const container = document.getElementById(canvasId);
  if (!container) return;

  destroyExistingChart(canvasId);
  container.innerHTML = '';

  const labels = dailyLogs.map(l => l.date).reverse();
  const calIn = dailyLogs.map(l => l.meals.reduce((sum, m) => sum + (m.calories || 0), 0)).reverse();
  const calOut = dailyLogs.map(l => l.workouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0)).reverse();

  const options = {
    series: [
      { name: 'Calo Nạp (In)', data: calIn.length ? calIn : [0] },
      { name: 'Calo Đốt (Out)', data: calOut.length ? calOut : [0] }
    ],
    chart: {
      type: 'bar',
      height: 250,
      fontFamily: 'Inter, sans-serif',
      toolbar: { show: false },
      animations: { enabled: true, easing: 'easeinout', speed: 800 }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '48%',
        borderRadius: 8,
        borderRadiusApplication: 'end'
      }
    },
    colors: ['#7556D9', '#FBBF24'],
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    xaxis: {
      categories: labels.length ? labels : ['Hôm nay'],
      labels: { style: { colors: 'var(--text-muted)', fontSize: '11px', fontWeight: 600 } }
    },
    yaxis: {
      labels: {
        style: { colors: 'var(--text-muted)', fontSize: '11px', fontWeight: 600 },
        formatter: (val) => `${val} kcal`
      }
    },
    grid: { borderColor: 'rgba(117, 86, 217, 0.08)' },
    tooltip: { theme: 'dark' },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      labels: { colors: 'var(--text-main)' }
    }
  };

  const chart = new ApexCharts(container, options);
  chart.render();
  chartInstances[canvasId] = chart;
}

/**
 * Render Ultra-WOW ApexCharts Macro Donut Chart
 */
export function renderMacroChart(canvasId, currentMacros = { protein: 0, carb: 0, fat: 0 }, targetMacros = { protein: 120, carb: 160, fat: 50 }) {
  const container = document.getElementById(canvasId);
  if (!container) return;

  destroyExistingChart(canvasId);
  container.innerHTML = '';

  const proteinVal = currentMacros.protein || 0;
  const carbVal = currentMacros.carb || 0;
  const fatVal = currentMacros.fat || 0;

  const totalGrams = proteinVal + carbVal + fatVal;

  const options = {
    series: [proteinVal || 1, carbVal || 1, fatVal || 1],
    labels: ['Protein (Đạm)', 'Carb (Tinh bột)', 'Fat (Chất béo)'],
    chart: {
      type: 'donut',
      height: 200,
      fontFamily: 'Inter, sans-serif',
      animations: { enabled: true, speed: 700 }
    },
    colors: ['#7556D9', '#3172B8', '#A35A18'],
    stroke: { width: 3, colors: ['var(--bg-card)'] },
    plotOptions: {
      pie: {
        donut: {
          size: '76%',
          labels: {
            show: true,
            name: { show: true, fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 },
            value: {
              show: true,
              fontSize: '18px',
              fontFamily: 'Inter',
              fontWeight: 900,
              color: 'var(--text-main)',
              formatter: (val) => `${val}g`
            },
            total: {
              show: true,
              label: 'Tổng Macro',
              color: 'var(--text-muted)',
              fontSize: '11px',
              fontWeight: 700,
              formatter: () => `${totalGrams}g`
            }
          }
        }
      }
    },
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: { theme: 'dark' }
  };

  const chart = new ApexCharts(container, options);
  chart.render();
  chartInstances[canvasId] = chart;
}
