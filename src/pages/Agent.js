import { requireAuth } from '../auth.js';
import { renderSidebar, bindSidebarEvents } from '../components/Sidebar.js';
import { renderHeader, bindHeaderEvents } from '../components/Header.js';
import { renderStatCard } from '../components/StatCard.js';
import { formatNumber, formatDuration, formatPercent, scoreColor } from '../utils/numbers.js';

export default async function AgentPage(app, params) {
  const profile = await requireAuth();
  if (!profile) return;

  // Demo agent data
  const agent = {
    name: 'Marie L.',
    role: 'Télépro',
    score: 85,
    calls: 48,
    avgDuration: 720,
    tauxDecroché: 45,
    rdv: 8,
    tauxRdv: 35,
    dossiers: 3,
    callsOver10min: 62,
  };

  const teamAvg = {
    calls: 37,
    avgDuration: 450,
    tauxDecroché: 38,
    rdv: 5,
    tauxRdv: 22,
    score: 68,
    callsOver10min: 42,
  };

  app.innerHTML = `
    <div class="dashboard-layout">
      ${renderSidebar(profile)}
      <div class="dashboard-main">
        ${renderHeader(agent.name, { showFilters: true })}
        <div class="dashboard-content">
          <!-- Agent header -->
          <div class="card" style="margin-bottom:24px;">
            <div style="display:flex;align-items:center;gap:20px;">
              <div style="width:64px;height:64px;border-radius:50%;background:var(--accent-blue-dim);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.5rem;color:var(--accent-blue);">
                ${agent.name.split(' ').map(w => w[0]).join('')}
              </div>
              <div style="flex:1;">
                <h2 style="margin-bottom:4px;">${agent.name}</h2>
                <span style="font-size:0.8125rem;color:var(--accent-blue);">${agent.role}</span>
              </div>
              <span class="score-badge ${scoreColor(agent.score, 70, 50)}" style="font-size:1rem;padding:8px 16px;">
                Score: ${agent.score}/100
              </span>
            </div>
          </div>

          <!-- KPIs -->
          <div class="grid grid-4" style="margin-bottom:24px;">
            ${renderStatCard({ label: 'Appels sortants', value: formatNumber(agent.calls), change: ((agent.calls - teamAvg.calls) / teamAvg.calls * 100), score: scoreColor(agent.calls, 40, 25) })}
            ${renderStatCard({ label: 'Durée moyenne', value: formatDuration(agent.avgDuration), score: scoreColor(agent.avgDuration / 60, 10, 5) })}
            ${renderStatCard({ label: 'RDV pris', value: formatNumber(agent.rdv), color: 'var(--accent-purple)' })}
            ${renderStatCard({ label: 'Appels > 10 min', value: formatPercent(agent.callsOver10min, 0), score: scoreColor(agent.callsOver10min, 50, 30) })}
          </div>

          <!-- Charts -->
          <div class="grid grid-2" style="margin-bottom:24px;">
            <div class="card">
              <div class="card-header"><span class="card-title">Activité sur 30 jours</span></div>
              <div id="agentActivityChart" class="chart-container"></div>
            </div>
            <div class="card">
              <div class="card-header"><span class="card-title">Outcomes des appels</span></div>
              <div id="agentOutcomesChart" class="chart-container"></div>
            </div>
          </div>

          <!-- Comparison vs team -->
          <div class="card">
            <div class="card-header"><span class="card-title">Comparaison vs moyenne équipe</span></div>
            <div style="display:flex;flex-direction:column;gap:16px;padding:8px 0;">
              ${renderComparison('Appels/jour', agent.calls, teamAvg.calls)}
              ${renderComparison('Durée moy. (min)', Math.round(agent.avgDuration / 60), Math.round(teamAvg.avgDuration / 60))}
              ${renderComparison('Taux décroché', agent.tauxDecroché, teamAvg.tauxDecroché, '%')}
              ${renderComparison('Taux RDV', agent.tauxRdv, teamAvg.tauxRdv, '%')}
              ${renderComparison('Appels > 10min', agent.callsOver10min, teamAvg.callsOver10min, '%')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  bindSidebarEvents();
  bindHeaderEvents();
  renderAgentCharts();
}

function renderComparison(label, agentVal, teamVal, suffix = '') {
  const maxVal = Math.max(agentVal, teamVal) || 1;
  const diff = agentVal - teamVal;
  const diffColor = diff >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
  const diffSign = diff >= 0 ? '+' : '';

  return `
    <div style="display:flex;align-items:center;gap:16px;">
      <span style="width:140px;font-size:0.8125rem;color:var(--text-secondary);">${label}</span>
      <div style="flex:1;display:flex;flex-direction:column;gap:4px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="height:8px;border-radius:4px;background:var(--accent-blue);width:${(agentVal / maxVal) * 100}%;transition:width 0.4s ease;"></div>
          <span style="font-size:0.8125rem;font-weight:600;">${agentVal}${suffix}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="height:8px;border-radius:4px;background:var(--bg-elevated);width:${(teamVal / maxVal) * 100}%;transition:width 0.4s ease;"></div>
          <span style="font-size:0.75rem;color:var(--text-muted);">Moy: ${teamVal}${suffix}</span>
        </div>
      </div>
      <span style="font-size:0.8125rem;font-weight:600;color:${diffColor};min-width:60px;text-align:right;">${diffSign}${diff}${suffix}</span>
    </div>
  `;
}

function renderAgentCharts() {
  if (typeof ApexCharts === 'undefined') return;

  const activityEl = document.getElementById('agentActivityChart');
  if (activityEl) {
    const data = Array.from({ length: 30 }, () => Math.floor(Math.random() * 20) + 25);
    new ApexCharts(activityEl, {
      chart: { type: 'area', height: 260, background: 'transparent', foreColor: '#9ca3b4', fontFamily: 'Inter', toolbar: { show: false } },
      theme: { mode: 'dark' },
      colors: ['#4f8cff'],
      series: [{ name: 'Appels', data }],
      xaxis: { categories: data.map((_, i) => `J-${30 - i}`), axisBorder: { show: false }, axisTicks: { show: false }, labels: { show: false } },
      stroke: { curve: 'smooth', width: 2 },
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 95, 100] } },
      grid: { borderColor: 'rgba(255,255,255,0.06)', strokeDashArray: 4 },
      dataLabels: { enabled: false },
      tooltip: { theme: 'dark' },
    }).render();
  }

  const outcomesEl = document.getElementById('agentOutcomesChart');
  if (outcomesEl) {
    new ApexCharts(outcomesEl, {
      chart: { type: 'donut', height: 260, background: 'transparent', foreColor: '#9ca3b4', fontFamily: 'Inter' },
      theme: { mode: 'dark' },
      colors: ['#34d399', '#4f8cff', '#fbbf24', '#f87171'],
      series: [8, 22, 12, 6],
      labels: ['RDV pris', 'Rappeler', 'Pas intéressé', 'Ne répond pas'],
      plotOptions: { pie: { donut: { size: '72%', labels: { show: true, name: { fontSize: '12px', color: '#9ca3b4' }, value: { fontSize: '20px', fontWeight: 700, color: '#f0f0f5' }, total: { show: true, label: 'Total', fontSize: '12px', color: '#9ca3b4' } } } } },
      dataLabels: { enabled: false },
      stroke: { width: 0 },
      legend: { position: 'bottom', fontSize: '11px', labels: { colors: '#9ca3b4' } },
    }).render();
  }
}
