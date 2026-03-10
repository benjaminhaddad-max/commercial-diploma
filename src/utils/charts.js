/**
 * ApexCharts configuration factory
 */

/** Base chart options for dark theme */
function baseOptions() {
  return {
    chart: {
      background: 'transparent',
      foreColor: '#9ca3b4',
      fontFamily: 'Inter, sans-serif',
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    theme: { mode: 'dark' },
    colors: ['#4f8cff', '#34d399', '#a78bfa', '#fb923c', '#f87171', '#fbbf24'],
    grid: {
      borderColor: 'rgba(255,255,255,0.06)',
      strokeDashArray: 4,
      padding: { left: 8, right: 8 },
    },
    stroke: { curve: 'smooth', width: 2 },
    tooltip: {
      theme: 'dark',
      style: { fontSize: '13px' },
    },
    xaxis: {
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: '11px' } },
    },
    yaxis: {
      labels: { style: { fontSize: '11px' } },
    },
    legend: {
      fontSize: '13px',
      labels: { colors: '#9ca3b4' },
    },
  };
}

/** Area chart config */
export function areaChart(options = {}) {
  return {
    ...baseOptions(),
    chart: {
      ...baseOptions().chart,
      type: 'area',
      height: options.height || 300,
      sparkline: options.sparkline ? { enabled: true } : undefined,
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.05,
        stops: [0, 95, 100],
      },
    },
    dataLabels: { enabled: false },
    ...options,
  };
}

/** Bar chart config */
export function barChart(options = {}) {
  return {
    ...baseOptions(),
    chart: {
      ...baseOptions().chart,
      type: 'bar',
      height: options.height || 300,
    },
    plotOptions: {
      bar: {
        borderRadius: 6,
        columnWidth: '60%',
        ...options.plotOptions?.bar,
      },
    },
    dataLabels: { enabled: false },
    ...options,
  };
}

/** Donut chart config */
export function donutChart(options = {}) {
  return {
    ...baseOptions(),
    chart: {
      ...baseOptions().chart,
      type: 'donut',
      height: options.height || 300,
    },
    plotOptions: {
      pie: {
        donut: {
          size: '72%',
          labels: {
            show: true,
            name: { fontSize: '13px', color: '#9ca3b4' },
            value: { fontSize: '24px', fontWeight: 700, color: '#f0f0f5' },
            total: {
              show: true,
              label: 'Total',
              fontSize: '13px',
              color: '#9ca3b4',
              formatter: (w) => w.globals.seriesTotals.reduce((a, b) => a + b, 0),
            },
          },
        },
      },
    },
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    ...options,
  };
}

/** Heatmap chart config */
export function heatmapChart(options = {}) {
  return {
    ...baseOptions(),
    chart: {
      ...baseOptions().chart,
      type: 'heatmap',
      height: options.height || 300,
    },
    plotOptions: {
      heatmap: {
        radius: 4,
        colorScale: {
          ranges: [
            { from: 0, to: 0, color: '#1a1d27', name: '0' },
            { from: 1, to: 5, color: '#1e3a5f', name: '1-5' },
            { from: 6, to: 15, color: '#2d5f9e', name: '6-15' },
            { from: 16, to: 30, color: '#4f8cff', name: '16-30' },
            { from: 31, to: 999, color: '#7dacff', name: '30+' },
          ],
        },
      },
    },
    dataLabels: { enabled: false },
    ...options,
  };
}

/** Line chart config */
export function lineChart(options = {}) {
  return {
    ...baseOptions(),
    chart: {
      ...baseOptions().chart,
      type: 'line',
      height: options.height || 300,
    },
    dataLabels: { enabled: false },
    ...options,
  };
}
