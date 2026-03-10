import { requireAuth } from '../auth.js';
import { apiGet } from '../api.js';
import { renderSidebar, bindSidebarEvents } from '../components/Sidebar.js';
import { renderHeader, bindHeaderEvents } from '../components/Header.js';
import { renderStatCard, renderStatCardSkeleton } from '../components/StatCard.js';
import { formatNumber, formatDuration, formatPercent, scoreColor } from '../utils/numbers.js';

const PERIOD_MAP = { today: 'today', week: 'week', month: 'month', last30: '30d' };

export default async function OverviewPage(app) {
  const profile = await requireAuth();
  if (!profile) return;

  let currentPeriod = 'today';

  function renderSkeleton() {
    app.innerHTML = `
      <div class="dashboard-layout">
        ${renderSidebar(profile)}
        <div class="dashboard-main">
          ${renderHeader('Vue d\'ensemble')}
          <div class="dashboard-content">
            <div class="grid grid-6" style="margin-bottom:24px;">
              ${renderStatCardSkeleton()}${renderStatCardSkeleton()}${renderStatCardSkeleton()}
              ${renderStatCardSkeleton()}${renderStatCardSkeleton()}${renderStatCardSkeleton()}
            </div>
            <div style="text-align:center;padding:60px 0;color:var(--text-muted);">
              Chargement des donn\u00e9es...
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
  }

  function render(data) {
    const s = data.stats;
    const t = data.trends;
    const agents = data.agents || [];
    const outcomes = data.outcomes || {};

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
                value: formatNumber(s.outbound),
                change: t.outbound,
                color: 'var(--accent-blue)',
              })}
              ${renderStatCard({
                label: 'Taux de d\u00e9croch\u00e9',
                value: formatPercent(s.pickupRate, 0),
                change: t.decroch\u00e9,
                score: scoreColor(s.pickupRate, 40, 25),
              })}
              ${renderStatCard({
                label: 'Dur\u00e9e moyenne',
                value: formatDuration(s.avgDuration),
                change: t.duration,
                score: scoreColor(s.avgDuration / 60, 10, 5),
              })}
              ${renderStatCard({
                label: 'RDV pris',
                value: '—',
                color: 'var(--accent-purple)',
              })}
              ${renderStatCard({
                label: 'Dossiers finalis\u00e9s',
                value: '—',
                color: 'var(--accent-green)',
              })}
              ${renderStatCard({
                label: 'Score \u00e9quipe',
                value: s.score + '/100',
                change: null,
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

    renderCallsChart(data.dailySeries || []);
    renderFunnel(s);
    renderMiniLeaderboard(agents);
    renderOutcomesChart(outcomes);
  }

  function renderCallsChart(series) {
    if (typeof ApexCharts === 'undefined') return;
    const el = document.getElementById('callsChart');
    if (!el) return;

    const dates = series.map(d => d.date);
    const outbound = series.map(d => d.outbound);
    const inbound = series.map(d => d.inbound);

    new ApexCharts(el, {
      chart: { type: 'area', height: 280, background: 'transparent', foreColor: '#9ca3b4', fontFamily: 'Inter', toolbar: { show: false } },
      theme: { mode: 'dark' },
      colors: ['#4f8cff', '#a78bfa'],
      series: [
        { name: 'Sortants', data: outbound },
        { name: 'Entrants', data: inbound },
      ],
      xaxis: {
        categories: dates.map(d => {
          const dt = new Date(d);
          return dt.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
        }),
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { rotate: -45, style: { fontSize: '10px' } },
      },
      stroke: { curve: 'smooth', width: 2 },
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 95, 100] } },
      grid: { borderColor: 'rgba(255,255,255,0.06)', strokeDashArray: 4 },
      dataLabels: { enabled: false },
      tooltip: { theme: 'dark' },
    }).render();
  }

  function renderOutcomesChart(outcomes) {
    if (typeof ApexCharts === 'undefined') return;
    const el = document.getElementById('outcomesChart');
    if (!el) return;

    const labels = Object.keys(outcomes);
    const values = Object.values(outcomes);

    if (values.every(v => v === 0)) {
      el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">Pas de donn\u00e9es</div>';
      return;
    }

    new ApexCharts(el, {
      chart: { type: 'donut', height: 250, background: 'transparent', foreColor: '#9ca3b4', fontFamily: 'Inter' },
      theme: { mode: 'dark' },
      colors: ['#34d399', '#f87171', '#fbbf24'],
      series: values,
      labels: labels,
      plotOptions: { pie: { donut: { size: '72%', labels: { show: true, name: { fontSize: '13px', color: '#9ca3b4' }, value: { fontSize: '22px', fontWeight: 700, color: '#f0f0f5' }, total: { show: true, label: 'Total', fontSize: '13px', color: '#9ca3b4' } } } } },
      dataLabels: { enabled: false },
      stroke: { width: 0 },
      legend: { position: 'bottom', fontSize: '12px', labels: { colors: '#9ca3b4' } },
    }).render();
  }

  function renderFunnel(s) {
    const container = document.getElementById('funnelContainer');
    if (!container) return;

    const steps = [
      { label: 'Appels sortants', value: s.outbound || 0, color: 'var(--accent-blue)' },
      { label: 'D\u00e9croch\u00e9s', value: s.answered || 0, color: 'var(--chart-2)' },
      { label: 'RDV pris', value: 0, color: 'var(--accent-orange)' },
      { label: 'RDV effectu\u00e9s', value: 0, color: 'var(--chart-4)' },
      { label: 'Dossiers finalis\u00e9s', value: 0, color: 'var(--accent-green)' },
    ];

    const maxVal = steps[0].value || 1;

    container.innerHTML = steps.map((step, i) => {
      const width = Math.max(15, (step.value / maxVal) * 100);
      const rate = i > 0 && steps[i - 1].value > 0
        ? ((step.value / steps[i - 1].value) * 100).toFixed(0)
        : null;

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

  function renderMiniLeaderboard(agents) {
    const container = document.getElementById('miniLeaderboard');
    if (!container) return;

    const top5 = agents.slice(0, 5);

    if (top5.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);">Pas de donn\u00e9es</div>';
      return;
    }

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${top5.map((agent, i) => {
          const sc = agent.scoreColor === 'green' ? 'good' : agent.scoreColor === 'orange' ? 'medium' : 'bad';
          return `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:var(--radius-md);background:${i === 0 ? 'var(--bg-tertiary)' : 'transparent'};cursor:pointer;" onclick="location.hash='#/agent/${agent.agent_id}'">
              <span style="font-weight:700;color:var(--text-muted);width:20px;">#${i + 1}</span>
              <span style="flex:1;font-weight:500;font-size:0.875rem;">${agent.name}</span>
              <span style="font-size:0.75rem;color:var(--text-muted);">${agent.outbound || 0} appels</span>
              <span class="score-badge ${sc}">${agent.score}/100</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  async function loadData() {
    renderSkeleton();
    try {
      const apiPeriod = PERIOD_MAP[currentPeriod] || 'today';
      const data = await apiGet('aggregate-stats', { period: apiPeriod });
      render(data);
    } catch (err) {
      console.error('Overview load error:', err);
      // Show error state
      const content = document.querySelector('.dashboard-content');
      if (content) {
        content.innerHTML = `
          <div class="card" style="text-align:center;padding:40px;">
            <p style="color:var(--accent-red);margin-bottom:12px;">Erreur de chargement</p>
            <p style="color:var(--text-muted);font-size:0.875rem;">${err.message}</p>
            <button class="btn btn-primary" style="margin-top:16px;" onclick="location.reload()">R\u00e9essayer</button>
          </div>
        `;
      }
    }
  }

  // Initial load
  loadData();
}
