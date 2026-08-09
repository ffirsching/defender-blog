const dataElement = document.getElementById('year-boxplot-data');
if (!dataElement) {
  throw new Error('Year boxplot data element not found');
}

const Chart = window.Chart;
const ChartBoxPlot = window.ChartBoxPlot;
if (!Chart) {
  throw new Error('Chart.js global not found. Ensure Chart.js is loaded before year-boxplot.js.');
}
if (!ChartBoxPlot) {
  throw new Error('ChartBoxPlot global not found. Ensure the plugin is loaded before year-boxplot.js.');
}

const { BoxPlotController, BoxAndWhiskers } = ChartBoxPlot;
Chart.register(BoxPlotController, BoxAndWhiskers);

const payload = JSON.parse(dataElement.textContent || '{}');
const labels = payload.labels || [];
const dataPoints = payload.dataPoints || [];
const insufficient = payload.insufficient || [];
const highestBoxValue = payload.highestBoxValue || 0;

const ctx = document.getElementById('yearBoxplot');
if (ctx instanceof HTMLCanvasElement) {
  const priceFormat = new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const onYearSelected = (year) => {
    const event = new CustomEvent('yearSelected', { detail: { buildYear: Number(year) } });
    window.dispatchEvent(event);
  };

  const chart = new Chart(ctx, {
    type: 'boxplot',
    data: {
      labels,
      datasets: [
        {
          label: 'Price Distribution',
          backgroundColor: 'rgba(59, 130, 246, 0.22)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
          itemRadius: 0,
          whiskerColor: 'rgba(107, 114, 128, 0.9)',
          medianColor: 'rgba(30, 58, 138, 1)',
          medianWidth: 3,
          outlierColor: 'rgba(220, 38, 38, 1)',
          outlierRadius: 4,
          data: dataPoints,
        },
        {
          label: 'Insufficient data',
          type: 'scatter',
          backgroundColor: 'rgba(107, 114, 128, 0.9)',
          borderColor: 'rgba(107, 114, 128, 0.9)',
          pointRadius: 4,
          data: insufficient,
          showLine: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: {
            display: true,
            text: 'Build Year',
            color: '#111',
          },
        },
        y: {
          title: {
            display: true,
            text: 'Price (CHF)',
            color: '#111',
          },
          beginAtZero: false,
          ticks: {
            callback: (value) => priceFormat.format(Number(value)),
          },
          suggestedMax: Math.ceil(highestBoxValue * 1.1),
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            title: (tooltipItems) => {
              const label = tooltipItems[0]?.label;
              return `Build Year: ${label}`;
            },
            label: (tooltipItem) => {
              if (tooltipItem.dataset.type === 'scatter') {
                return `Insufficient data (${tooltipItem.raw.count} listings)`;
              }
              const raw = tooltipItem.raw;
              const lines = [
                `Minimum: ${priceFormat.format(raw.min)}`,
                `25th Percentile: ${priceFormat.format(raw.q1)}`,
                `Median: ${priceFormat.format(raw.median)}`,
                `75th Percentile: ${priceFormat.format(raw.q3)}`,
                `Maximum: ${priceFormat.format(raw.max)}`,
                `Listings: ${raw.count}`,
              ];
              if (raw.averageMileage) {
                lines.push(`Average mileage: ${raw.averageMileage.toLocaleString('de-CH')} km`);
              }
              return lines;
            },
          },
        },
      },
      onClick: (event, elements) => {
        if (!elements.length) return;
        const element = elements[0];
        const label = chart.data.labels[element.index];
        onYearSelected(label);
      },
    },
  });
}
