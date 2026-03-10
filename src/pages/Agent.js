import { requireAuth } from '../auth.js';
import { apiGet } from '../api.js';
import { renderSidebar, bindSidebarEvents } from '../components/Sidebar.js';
import { renderHeader, bindHeaderEvents } from '../components/Header.js';
import { renderStatCard } from '../components/StatCard.js';
import { formatNumber, formatDuration, formatPercent, scoreColor } from '../utils/numbers.js';

const PERIOD_MAP = { today: 'today', week: 'week', month: 'month', last30: '30d' };

export default async function AgentPage(app, params) {
  const profile = await requireAuth();
  if (!profile) return;

  const agentId = params?.id;
  let currentPeriod = 'today';

  if (!agentId) {
    app.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-muted);">Agent non trouv\u00e9</div>';
    return;
  }

  function renderPage(agent, teamAvg) {
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
                  ${agent.name.split(' ').map(w => w[0]).join('').substring(0, 2)}
                </div>
                <div style="flex:1;">
                  <h2 style="margin-bottom:4px;">${agent.name}</h2>
                  <span style="font-size:0.8125rem;color:var(--accent-blue);">Agent Aircall</span>
                </div>
                <span class="score-badge ${agent.scoreColor === 'green' ? 'good' : agent.scoreColor === 'orange' ? 'medium' : 'bad'}" style="font-size:1rem;padding:8px 16px;">
                  Score: ${agent.score}/100
                </span>
              </div>
            </div>

            <!-- KPIs -->
            <div class="grid grid-4" style="margin-bottom:24px;">
              ${renderStatCard({
                label: 'Appels sortants',
                value: formatNumber(agent.outbound),
                change: teamAvg.outbound > 0 ? ((agent.outbound - teamAvg.outbound) / teamAvg.outbound * 100) : null,
                score: scoreColor(agent.callsPerDay || 0, 40, 25),
              })}
              ${renderStatCard({
                label: 'Dur\u00e9e moyenne',
                value: formatDuration(agent.avgDuration),
                score: scoreColor((agent.avgDuration || 0) / 60, 10, 5),
              })}
              ${renderStatCard({
                label: 'Taux de d\u00e9croch\u00e9',
                value: formatPercent(agent.pickupRate, 0),
                score: scoreColor(agent.pickupRate || 0, 40, 25),
              })}
              ${renderStatCard({
                label: 'Appels > 10 min',
                value: formatPercent(agent.pctOver10min, 0),
                score: scoreColor(agent.pctOver10min || 0, 50, 30),
              })}
            </div>

            <!-- Charts -->
            <div class="grid grid-2" style="margin-bottom:24px;">
              <div class="card">
                <div class="card-header"><span class="card-title">R\u00e9partition des appels</span></div>
                <div id="agentOutcomesChart" class="chart-container"></div>
              </div>
              <div class="card">
                <div class="card-header"><span class="card-title">D\u00e9tails</span></div>
                <div style="padding:16px;display:flex;flex-direction:column;gap:12px;">
                  <div style="display:flex;justify-content:space-between;">
                    <span style="color:var(--text-secondary);">Total appels</span>
                    <span style="font-weight:600;">${agent.total || 0}</span>
                  </div>
                  <div style="display:flex;justify-content:space-between;">
                    <span style="color:var(--text-secondary);">Sortants</span>
                    <span style="font-weight:600;color:var(--accent-blue);">${agent.outbound || 0}</span>
                  </div>
                  <div style="display:flex;justify-content:space-between;">
                    <span style="color:var(--text-secondary);">Entrants</span>
                    <span style="font-weight:600;color:var(--accent-purple);">${agent.inbound || 0}</span>
                  </div>
                  <div style="display:flex;justify-content:space-between;">
                    <span style="color:var(--text-secondary);">D\u00e9croch\u00e9s</span>
                    <span style="font-weight:600;color:var(--accent-green);">${agent.answered || 0}</span>
                  </div>
                  <div style="display:flex;justify-content:space-between;">
                    <span style="color:var(--text-secondary);">Manqu\u00e9s</span>
                    <span style="font-weight:600;color:var(--accent-red);">${agent.missed || 0}</span>
                  </div>
                  <div style="display:flex;justify-content:space-between;">
                    <span style="color:var(--text-secondary);">Appels > 10 min</span>
                    <span style="font-weight:600;">${agent.callsOver10min || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Comparison vs team -->
            <div class="card">
              <div class="card-header"><span class="card-title">Comparaison vs moyenne \u00e9quipe</span></div>
              <div style="display:flex;flex-direction:column;gap:16px;padding:8px 0;">
                ${renderComparison('Appels sortants', agent.outbound || 0, teamAvg.outbound || 0)}
                ${renderComparison('Dur\u00e9e moy. (min)', Math.round((agent.avgDuration || 0) / 60), Math.round((teamAvg.avgDuration || 0) / 60))}
                ${renderComparison('Taux d\u00e9croch\u00e9', agent.pickupRate || 0, teamAvg.pickupRate || 0, '%')}
                ${renderComparison('Appels > 10min', agent.pctOver10min || 0, teamAvg.pctOver10min || 0, '%')}
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

    renderAgentCharts(agent);
  }

  function renderAgentCharts(agent) {
    if (typeof ApexCharts === 'undefined') return;

    const outcomesEl = document.getElementById('agentOutcomesChart');
    if (outcomesEl) {
      const answered = agent.answered || 0;
      const missed = agent.missed || 0;

      if (answered === 0 && missed === 0) {
        outcomesEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">Pas de donn\u00e9es</div>';
        return;
      }

      new ApexCharts(outcomesEl, {
        chart: { type: 'donut', height: 260, background: 'transparent', foreColor: '#9ca3b4', fontFamily: 'Inter' },
        theme: { mode: 'dark' },
        colors: ['#34d399', '#f87171'],
        series: [answered, missed],
        labels: ['D\u00e9croch\u00e9s', 'Manqu\u00e9s'],
        plotOptions: { pie: { donut: { size: '72%', labels: { show: true, name: { fontSize: '12px', color: '#9ca3b4' }, value: { fontSize: '20px', fontWeight: 700, color: '#f0f0f5' }, total: { show: true, label: 'Total', fontSize: '12px', color: '#9ca3b4' } } } } },
        dataLabels: { enabled: false },
        stroke: { width: 0 },
        legend: { position: 'bottom', fontSize: '11px', labels: { colors: '#9ca3b4' } },
      }).render();
    }
  }

  async function loadData() {
    // Show loading
    app.innerHTML = `
      <div class="dashboard-layout">
        ${renderSidebar(profile)}
        <div class="dashboard-main">
          ${renderHeader('Agent')}
          <div class="dashboard-content">
            <div style="text-align:center;padding:60px 0;color:var(--text-muted);">Chargement...</div>
          </div>
        </div>
      </div>
    `;
    bindSidebarEvents();
    bindHeaderEvents(
      (period) => { currentPeriod = period; loadData(); },
      () => loadData()
    );

    try {
      const apiPeriod = PERIOD_MAP[currentPeriod] || 'today';
      // Fetch stats for this specific agent
      const data = await apiGet('aggregate-stats', { period: apiPeriod, agent: agentId });
      const agentStats = data.agents && data.agents.length > 0 ? data.agents[0] : data.stats;

      // Also get team average for comparison
      const teamData = await apiGet('aggregate-stats', { period: apiPeriod });
      const teamAvg = teamData.stats || {};

      renderPage(agentStats, teamAvg);
    } catch (err) {
      console.error('Agent load error:', err);
      const content = document.querySelector('.dashboard-content');
      if (content) {
        content.innerHTML = `
          <div class="card" style="text-align:center;padding:40px;">
            <p style="color:var(--accent-red);margin-bottom:12px;">Erreur de chargement</p>
            <p style="color:var(--text-muted);font-size:0.875rem;">${err.message}</p>
            <button class="btn btn-primary" style="margin-top:16px;" onclick="location.hash='#/leaderboard'">Retour au classement</button>
          </div>
        `;
      }
    }
  }

  loadData();
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
      <span style="font-size:0.8125rem;font-weight:600;color:${diffColor};min-width:60px;text-align:right;">${diffSign}${Math.round(diff)}${suffix}</span>
    </div>
  `;
}
