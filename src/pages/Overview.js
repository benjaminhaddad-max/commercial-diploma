import { requireAuth } from '../auth.js';
import { renderSidebar, bindSidebarEvents } from '../components/Sidebar.js';
import { renderHeader, bindHeaderEvents } from '../components/Header.js';
import { renderStatCard, renderStatCardSkeleton } from '../components/StatCard.js';
import { formatNumber, formatDuration, formatPercent, scoreColor } from '../utils/numbers.js';

// Demo data for initial development (replaced by real API calls later)
function getDemoStats() {
  return {
    calls: { total: 187, outbound: 152, inbound: 35, missed: 18, avgDuration: 482 },
    meetings: { total: 28, bookedToday: 6 },
    deals: { finalized: 4, inProgress: 12 },
    score: 72,
    trends: {
      calls: 8.3,
      decroché: -2.1,
      duration: 12.5,
      meetings: 15.0,
      deals: -5.0,
      score: 3.2,
    },
  };
}

export default async function OverviewPage(app) {
  const profile = await requireAuth();
  if (!profile) return;

  let currentPeriod = 'today';

  function render(stats) {
    const s = stats || getDemoStats();
    const tauxDecroché = s.calls.total > 0
      ? ((s.calls.total - s.calls.missed) / s.calls.total * 100)
      : 0;

    app.innerHTML = `
      <div class="dashboard-layout">
        ${renderSidebar(profile)}
        <div class="dashboard-main">
          ${renderHeader('Vue d\'ensemble')}
          <div class="dashboard-content">
            <!-- KPI Row -->
            <div class="grid grid-6" style="margin-bottom:24px;">
              ${renderStatCard({
                label: 'Appels sortants',
                value: formatNumber(s.calls.outbound),
                change: s.trends.calls,
                color: 'var(--accent-blue)',
              })}
              ${renderStatCard({
                label: 'Taux de décroché',
                value: formatPercent(tauxDecroché, 0),
                change: s.trends.decroché,
                score: scoreColor(tauxDecroché, 40, 25),
              })}
              ${renderStatCard({
                label: 'Durée moyenne',
                value: formatDuration(s.calls.avgDuration),
                change: s.trends.duration,
                score: scoreColor(s.calls.avgDuration / 60, 10, 5),
              })}
              ${renderStatCard({
                label: 'RDV pris',
                value: formatNumber(s.meetings.total),
                change: s.trends.meetings,
                color: 'var(--accent-purple)',
              })}
              ${renderStatCard({
                label: 'Dossiers finalisés',
                value: formatNumber(s.deals.finalized),
                change: s.trends.deals,
                color: 'var(--accent-green)',
              })}
              ${renderStatCard({
                label: 'Score équipe',
                value: s.score + '/100',
                change: s.trends.score,
                score: scoreColor(s.score, 70, 50),
              })}
            </div>

            <!-- Charts Row -->
            <div class="grid grid-2" style="margin-bottom:24px;">
              <div class="card">
                <div class="card-header">
                  <span class="card-title">Volume d'appels</span>
                </div>
                <div id="callsChart" class="chart-container"></div>
              </div>
              <div class="card">
                <div class="card-header">
                  <span class="card-title">Funnel de conversion</span>
                </div>
                <div id="funnelContainer" class="funnel-container"></div>
              </div>
            </div>

            <!-- Bottom Row -->
            <div class="grid grid-2">
              <div class="card">
                <div class="card-header">
                  <span class="card-title">Top 5 — Score composite</span>
                </div>
                <div id="miniLeaderboard"></div>
              </div>
              <div class="card">
                <div class="card-header">
                  <span class="card-title">Outcomes des appels</span>
                </div>
                <div id="outcomesChart" class="chart-container small"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    bindSidebarEvents();
    bindHeaderEvents(
      (period) => { currentPeriod = period; loadData(); },
      () => loadData()
    );

    renderCharts(s);
    renderFunnel(s);
    renderMiniLeaderboard();
  }

  function renderCharts(s) {
    // Calls area chart
    if (typeof ApexCharts !== 'undefined') {
      const callsEl = document.getElementById('callsChart');
      if (callsEl) {
        const chart = new ApexCharts(callsEl, {
          chart: { type: 'area', height: 280, background: 'transparent', foreColor: '#9ca3b4', fontFamily: 'Inter', toolbar: { show: false } },
          theme: { mode: 'dark' },
          colors: ['#4f8cff', '#a78bfa'],
          series: [
            { name: 'Sortants', data: [28, 35, 42, 31, 38, 45, 33] },
            { name: 'Entrants', data: [5, 8, 6, 4, 7, 9, 5] },
          ],
          xaxis: { categories: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'], axisBorder: { show: false }, axisTicks: { show: false } },
          stroke: { curve: 'smooth', width: 2 },
          fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 95, 100] } },
          grid: { borderColor: 'rgba(255,255,255,0.06)', strokeDashArray: 4 },
          dataLabels: { enabled: false },
          tooltip: { theme: 'dark' },
        });
        chart.render();
      }

      // Outcomes donut
      const outcomesEl = document.getElementById('outcomesChart');
      if (outcomesEl) {
        const donut = new ApexCharts(outcomesEl, {
          chart: { type: 'donut', height: 250, background: 'transparent', foreColor: '#9ca3b4', fontFamily: 'Inter' },
          theme: { mode: 'dark' },
          colors: ['#34d399', '#4f8cff', '#fbbf24', '#f87171'],
          series: [28, 95, 42, 18],
          labels: ['RDV pris', 'Rappeler', 'Pas intéressé', 'Ne répond pas'],
          plotOptions: { pie: { donut: { size: '72%', labels: { show: true, name: { fontSize: '13px', color: '#9ca3b4' }, value: { fontSize: '22px', fontWeight: 700, color: '#f0f0f5' }, total: { show: true, label: 'Total', fontSize: '13px', color: '#9ca3b4' } } } } },
          dataLabels: { enabled: false },
          stroke: { width: 0 },
          legend: { position: 'bottom', fontSize: '12px', labels: { colors: '#9ca3b4' } },
        });
        donut.render();
      }
    }
  }

  function renderFunnel() {
    const container = document.getElementById('funnelContainer');
    if (!container) return;

    const steps = [
      { label: 'Appels sortants', value: 152, color: 'var(--accent-blue)' },
      { label: 'Décrochés', value: 134, color: 'var(--chart-2)' },
      { label: 'Qualifiés', value: 89, color: 'var(--accent-purple)' },
      { label: 'RDV pris', value: 28, color: 'var(--accent-orange)' },
      { label: 'RDV effectués', value: 21, color: 'var(--chart-4)' },
      { label: 'Dossiers finalisés', value: 4, color: 'var(--accent-green)' },
    ];

    const maxVal = steps[0].value;

    container.innerHTML = steps.map((step, i) => {
      const width = Math.max(15, (step.value / maxVal) * 100);
      const rate = i > 0 ? ((step.value / steps[i - 1].value) * 100).toFixed(0) : null;

      return `
        <div class="funnel-step">
          <span class="funnel-label">${step.label}</span>
          <div class="funnel-bar" style="width:${width}%;background:${step.color}">
            ${step.value}
          </div>
          ${rate !== null ? `<span class="funnel-rate">${rate}%</span>` : ''}
        </div>
      `;
    }).join('');
  }

  function renderMiniLeaderboard() {
    const container = document.getElementById('miniLeaderboard');
    if (!container) return;

    const agents = [
      { name: 'Marie L.', score: 85, calls: 48, rdv: 8 },
      { name: 'Thomas R.', score: 78, calls: 42, rdv: 6 },
      { name: 'Julie M.', score: 71, calls: 39, rdv: 5 },
      { name: 'Lucas D.', score: 65, calls: 35, rdv: 4 },
      { name: 'Sarah K.', score: 58, calls: 30, rdv: 3 },
    ];

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${agents.map((agent, i) => {
          const sc = agent.score >= 70 ? 'good' : agent.score >= 50 ? 'medium' : 'bad';
          return `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:var(--radius-md);background:${i === 0 ? 'var(--bg-tertiary)' : 'transparent'};">
              <span style="font-weight:700;color:var(--text-muted);width:20px;">#${i + 1}</span>
              <span style="flex:1;font-weight:500;font-size:0.875rem;">${agent.name}</span>
              <span style="font-size:0.75rem;color:var(--text-muted);">${agent.calls} appels</span>
              <span style="font-size:0.75rem;color:var(--accent-purple);">${agent.rdv} RDV</span>
              <span class="score-badge ${sc}">${agent.score}/100</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  async function loadData() {
    // For now use demo data. Will replace with API calls.
    const stats = getDemoStats();
    render(stats);
  }

  // Initial render
  render(getDemoStats());
}
