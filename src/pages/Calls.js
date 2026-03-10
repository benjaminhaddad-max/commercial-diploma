import { requireAuth } from '../auth.js';
import { renderSidebar, bindSidebarEvents } from '../components/Sidebar.js';
import { renderHeader, bindHeaderEvents } from '../components/Header.js';
import { formatDuration, formatNumber } from '../utils/numbers.js';

export default async function CallsPage(app) {
  const profile = await requireAuth();
  if (!profile) return;

  app.innerHTML = `
    <div class="dashboard-layout">
      ${renderSidebar(profile)}
      <div class="dashboard-main">
        ${renderHeader('Analytics Appels')}
        <div class="dashboard-content">
          <div class="grid grid-2" style="margin-bottom:24px;">
            <div class="card">
              <div class="card-header"><span class="card-title">Appels par agent</span></div>
              <div id="agentCallsChart" class="chart-container"></div>
            </div>
            <div class="card">
              <div class="card-header"><span class="card-title">Distribution des durées</span></div>
              <div id="durationChart" class="chart-container"></div>
            </div>
          </div>
          <div class="card">
            <div class="card-header">
              <span class="card-title">Journal des appels</span>
            </div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Direction</th>
                  <th>Durée</th>
                  <th>Statut</th>
                  <th>Heure</th>
                </tr>
              </thead>
              <tbody id="callsTableBody">
                ${generateDemoCalls()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  bindSidebarEvents();
  bindHeaderEvents();
  renderCallCharts();
}

function generateDemoCalls() {
  const agents = ['Marie L.', 'Thomas R.', 'Julie M.', 'Lucas D.', 'Sarah K.'];
  const statuses = ['Décroché', 'Ne répond pas', 'Messagerie'];
  const rows = [];

  for (let i = 0; i < 15; i++) {
    const agent = agents[Math.floor(Math.random() * agents.length)];
    const dir = Math.random() > 0.2 ? 'Sortant' : 'Entrant';
    const duration = Math.floor(Math.random() * 900) + 30;
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const hour = 9 + Math.floor(Math.random() * 8);
    const min = Math.floor(Math.random() * 60);
    const dirColor = dir === 'Sortant' ? 'var(--accent-blue)' : 'var(--accent-purple)';
    const statusColor = status === 'Décroché' ? 'var(--accent-green)' : status === 'Ne répond pas' ? 'var(--accent-red)' : 'var(--accent-yellow)';

    rows.push(`
      <tr>
        <td style="font-weight:500;color:var(--text-primary);">${agent}</td>
        <td><span style="color:${dirColor};font-size:0.75rem;font-weight:500;">${dir}</span></td>
        <td>${formatDuration(duration)}</td>
        <td><span style="color:${statusColor};font-size:0.8125rem;">${status}</span></td>
        <td style="color:var(--text-muted);">${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}</td>
      </tr>
    `);
  }
  return rows.join('');
}

function renderCallCharts() {
  if (typeof ApexCharts === 'undefined') return;

  const agentEl = document.getElementById('agentCallsChart');
  if (agentEl) {
    new ApexCharts(agentEl, {
      chart: { type: 'bar', height: 280, background: 'transparent', foreColor: '#9ca3b4', fontFamily: 'Inter', toolbar: { show: false } },
      theme: { mode: 'dark' },
      colors: ['#4f8cff', '#a78bfa'],
      series: [
        { name: 'Sortants', data: [48, 42, 39, 35, 30] },
        { name: 'Entrants', data: [5, 8, 6, 4, 7] },
      ],
      xaxis: { categories: ['Marie L.', 'Thomas R.', 'Julie M.', 'Lucas D.', 'Sarah K.'], axisBorder: { show: false }, axisTicks: { show: false } },
      plotOptions: { bar: { borderRadius: 6, columnWidth: '55%' } },
      grid: { borderColor: 'rgba(255,255,255,0.06)', strokeDashArray: 4 },
      dataLabels: { enabled: false },
      tooltip: { theme: 'dark' },
    }).render();
  }

  const durationEl = document.getElementById('durationChart');
  if (durationEl) {
    new ApexCharts(durationEl, {
      chart: { type: 'bar', height: 280, background: 'transparent', foreColor: '#9ca3b4', fontFamily: 'Inter', toolbar: { show: false }, stacked: true },
      theme: { mode: 'dark' },
      colors: ['#f87171', '#fbbf24', '#4f8cff', '#34d399'],
      series: [
        { name: '< 5 min', data: [12, 8, 15, 18, 14] },
        { name: '5-10 min', data: [10, 14, 8, 9, 10] },
        { name: '10-15 min', data: [18, 12, 10, 5, 4] },
        { name: '> 15 min', data: [8, 8, 6, 3, 2] },
      ],
      xaxis: { categories: ['Marie L.', 'Thomas R.', 'Julie M.', 'Lucas D.', 'Sarah K.'], axisBorder: { show: false }, axisTicks: { show: false } },
      plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
      grid: { borderColor: 'rgba(255,255,255,0.06)', strokeDashArray: 4 },
      dataLabels: { enabled: false },
      tooltip: { theme: 'dark' },
      legend: { position: 'top', fontSize: '12px', labels: { colors: '#9ca3b4' } },
    }).render();
  }
}
