import { requireAuth } from '../auth.js';
import { apiGet } from '../api.js';
import { renderSidebar, bindSidebarEvents } from '../components/Sidebar.js';
import { renderHeader, bindHeaderEvents } from '../components/Header.js';
import { formatNumber, formatDuration } from '../utils/numbers.js';

const PERIOD_MAP = { today: 'today', week: 'week', month: 'month', last30: '30d' };

export default async function LeaderboardPage(app) {
  const profile = await requireAuth();
  if (!profile) return;

  let currentPeriod = 'today';

  function renderPage(agents) {
    app.innerHTML = `
      <div class="dashboard-layout">
        ${renderSidebar(profile)}
        <div class="dashboard-main">
          ${renderHeader('Classement \u00c9quipe')}
          <div class="dashboard-content">
            <!-- Podium -->
            <div class="card" style="margin-bottom:24px;">
              <div class="card-header"><span class="card-title">Podium — Score Composite</span></div>
              <div style="display:flex;justify-content:center;align-items:flex-end;gap:24px;padding:32px 0 16px;">
                ${agents.length >= 2 ? renderPodium(agents[1], 2, '120px') : ''}
                ${agents.length >= 1 ? renderPodium(agents[0], 1, '160px') : ''}
                ${agents.length >= 3 ? renderPodium(agents[2], 3, '100px') : ''}
              </div>
              ${agents.length === 0 ? '<div style="text-align:center;padding:40px;color:var(--text-muted);">Pas de donn\u00e9es sur cette p\u00e9riode</div>' : ''}
            </div>

            <!-- Full ranking -->
            <div class="card">
              <div class="card-header"><span class="card-title">Classement d\u00e9taill\u00e9</span></div>
              <table class="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Agent</th>
                    <th>Appels sortants</th>
                    <th>Dur\u00e9e moy.</th>
                    <th>Taux d\u00e9croch\u00e9</th>
                    <th>Appels > 10min</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  ${agents.length === 0 ? '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">Aucune donn\u00e9e</td></tr>' : ''}
                  ${agents.map((a, i) => {
                    const sc = a.scoreColor === 'green' ? 'good' : a.scoreColor === 'orange' ? 'medium' : 'bad';
                    return `
                      <tr style="cursor:pointer;" onclick="location.hash='#/agent/${a.agent_id}'">
                        <td style="font-weight:700;color:var(--text-muted);">${i + 1}</td>
                        <td style="font-weight:500;color:var(--text-primary);">${a.name}</td>
                        <td>${a.outbound || 0}</td>
                        <td>${formatDuration(a.avgDuration)}</td>
                        <td>${a.pickupRate || 0}%</td>
                        <td>${a.pctOver10min || 0}%</td>
                        <td><span class="score-badge ${sc}">${a.score}/100</span></td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
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

  async function loadData() {
    // Show loading
    app.innerHTML = `
      <div class="dashboard-layout">
        ${renderSidebar(profile)}
        <div class="dashboard-main">
          ${renderHeader('Classement \u00c9quipe')}
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
      const data = await apiGet('aggregate-stats', { period: apiPeriod });
      renderPage(data.agents || []);
    } catch (err) {
      console.error('Leaderboard load error:', err);
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

  loadData();
}

function renderPodium(agent, rank, height) {
  const colors = { 1: '#fbbf24', 2: '#9ca3b4', 3: '#cd7f32' };
  const sc = agent.scoreColor === 'green' ? 'good' : agent.scoreColor === 'orange' ? 'medium' : 'bad';

  return `
    <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
      <div style="width:56px;height:56px;border-radius:50%;background:var(--bg-tertiary);border:3px solid ${colors[rank]};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.25rem;color:${colors[rank]};">
        ${rank}
      </div>
      <span style="font-weight:600;font-size:0.9375rem;">${agent.name}</span>
      <span class="score-badge ${sc}">${agent.score}/100</span>
      <div style="width:80px;height:${height};background:linear-gradient(180deg, ${colors[rank]}33, ${colors[rank]}11);border-radius:var(--radius-md) var(--radius-md) 0 0;border-top:3px solid ${colors[rank]};"></div>
    </div>
  `;
}
