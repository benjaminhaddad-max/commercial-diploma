import { requireAuth } from '../auth.js';
import { renderSidebar, bindSidebarEvents } from '../components/Sidebar.js';
import { renderHeader, bindHeaderEvents } from '../components/Header.js';
import { renderStatCard } from '../components/StatCard.js';
import { formatNumber, formatPercent, formatCurrency } from '../utils/numbers.js';

export default async function PipelinePage(app) {
  const profile = await requireAuth();
  if (!profile) return;

  app.innerHTML = `
    <div class="dashboard-layout">
      ${renderSidebar(profile)}
      <div class="dashboard-main">
        ${renderHeader('Pipeline & Conversion')}
        <div class="dashboard-content">
          <!-- KPIs -->
          <div class="grid grid-4" style="margin-bottom:24px;">
            ${renderStatCard({ label: 'Taux de conversion global', value: '2.6%', change: 0.4, color: 'var(--accent-green)' })}
            ${renderStatCard({ label: 'Temps moyen lead → dossier', value: '12 jours', change: -8.5, color: 'var(--accent-blue)' })}
            ${renderStatCard({ label: 'Pipeline actif', value: '12 deals', color: 'var(--accent-orange)' })}
            ${renderStatCard({ label: 'Meilleur closer', value: 'Thomas R.', color: 'var(--accent-purple)' })}
          </div>

          <!-- Funnel + Charts -->
          <div class="grid grid-2" style="margin-bottom:24px;">
            <div class="card">
              <div class="card-header"><span class="card-title">Funnel complet</span></div>
              <div id="pipelineFunnel" class="funnel-container"></div>
            </div>
            <div class="card">
              <div class="card-header"><span class="card-title">Leads par statut</span></div>
              <div id="statusChart" class="chart-container"></div>
            </div>
          </div>

          <!-- Deals table -->
          <div class="card">
            <div class="card-header"><span class="card-title">Deals actifs</span></div>
            <table class="data-table">
              <thead>
                <tr><th>Lead</th><th>Statut</th><th>Closer</th><th>Date</th><th>Montant</th></tr>
              </thead>
              <tbody>
                ${generateDemoDeals()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  bindSidebarEvents();
  bindHeaderEvents();
  renderPipelineCharts();
  renderPipelineFunnel();
}

function generateDemoDeals() {
  const deals = [
    { name: 'Emma D.', status: 'RDV effectué', closer: 'Thomas R.', date: '09/03', amount: 3200 },
    { name: 'Hugo L.', status: 'Dossier en cours', closer: 'Thomas R.', date: '08/03', amount: 2800 },
    { name: 'Léa M.', status: 'RDV pris', closer: 'Julie M.', date: '10/03', amount: null },
    { name: 'Nathan B.', status: 'Qualifié', closer: '—', date: '10/03', amount: null },
    { name: 'Chloé P.', status: 'RDV effectué', closer: 'Thomas R.', date: '07/03', amount: 3500 },
  ];

  const statusColors = {
    'Qualifié': 'var(--accent-blue)',
    'RDV pris': 'var(--accent-purple)',
    'RDV effectué': 'var(--accent-orange)',
    'Dossier en cours': 'var(--accent-yellow)',
    'Dossier finalisé': 'var(--accent-green)',
  };

  return deals.map(d => `
    <tr>
      <td style="font-weight:500;color:var(--text-primary);">${d.name}</td>
      <td><span style="color:${statusColors[d.status] || 'var(--text-secondary)'};font-size:0.8125rem;font-weight:500;">${d.status}</span></td>
      <td>${d.closer}</td>
      <td style="color:var(--text-muted);">${d.date}</td>
      <td style="font-weight:600;">${d.amount ? formatCurrency(d.amount) : '—'}</td>
    </tr>
  `).join('');
}

function renderPipelineFunnel() {
  const container = document.getElementById('pipelineFunnel');
  if (!container) return;

  const steps = [
    { label: 'Leads contactés', value: 520, color: 'var(--accent-blue)' },
    { label: 'Qualifiés', value: 245, color: 'var(--chart-3)' },
    { label: 'RDV pris', value: 89, color: 'var(--accent-purple)' },
    { label: 'RDV effectués', value: 64, color: 'var(--accent-orange)' },
    { label: 'Dossiers en cours', value: 28, color: 'var(--accent-yellow)' },
    { label: 'Dossiers finalisés', value: 14, color: 'var(--accent-green)' },
  ];

  const maxVal = steps[0].value;
  container.innerHTML = steps.map((step, i) => {
    const width = Math.max(15, (step.value / maxVal) * 100);
    const rate = i > 0 ? ((step.value / steps[i - 1].value) * 100).toFixed(0) : null;
    return `
      <div class="funnel-step">
        <span class="funnel-label">${step.label}</span>
        <div class="funnel-bar" style="width:${width}%;background:${step.color}">${step.value}</div>
        ${rate !== null ? `<span class="funnel-rate">${rate}%</span>` : ''}
      </div>
    `;
  }).join('');
}

function renderPipelineCharts() {
  if (typeof ApexCharts === 'undefined') return;

  const statusEl = document.getElementById('statusChart');
  if (statusEl) {
    new ApexCharts(statusEl, {
      chart: { type: 'bar', height: 300, background: 'transparent', foreColor: '#9ca3b4', fontFamily: 'Inter', toolbar: { show: false } },
      theme: { mode: 'dark' },
      colors: ['#4f8cff'],
      series: [{ name: 'Leads', data: [85, 245, 89, 64, 28, 14] }],
      xaxis: { categories: ['Nouveau', 'Qualifié', 'RDV pris', 'RDV effectué', 'En cours', 'Finalisé'], axisBorder: { show: false }, axisTicks: { show: false } },
      plotOptions: { bar: { borderRadius: 6, columnWidth: '50%', distributed: true } },
      colors: ['#4f8cff', '#a78bfa', '#fb923c', '#fbbf24', '#34d399', '#34d399'],
      grid: { borderColor: 'rgba(255,255,255,0.06)', strokeDashArray: 4 },
      dataLabels: { enabled: false },
      tooltip: { theme: 'dark' },
      legend: { show: false },
    }).render();
  }
}
