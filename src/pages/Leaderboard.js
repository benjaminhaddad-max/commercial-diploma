import { requireAuth } from '../auth.js';
import { renderSidebar, bindSidebarEvents } from '../components/Sidebar.js';
import { renderHeader, bindHeaderEvents } from '../components/Header.js';
import { formatNumber, formatDuration } from '../utils/numbers.js';

export default async function LeaderboardPage(app) {
  const profile = await requireAuth();
  if (!profile) return;

  const agents = [
    { name: 'Marie L.', role: 'Télépro', score: 85, calls: 48, avgDuration: 720, rdv: 8, dossiers: 3 },
    { name: 'Thomas R.', role: 'Closer', score: 78, calls: 42, avgDuration: 540, rdv: 6, dossiers: 4 },
    { name: 'Julie M.', role: 'Télépro', score: 71, calls: 39, avgDuration: 480, rdv: 5, dossiers: 2 },
    { name: 'Lucas D.', role: 'Télépro', score: 65, calls: 35, avgDuration: 360, rdv: 4, dossiers: 1 },
    { name: 'Sarah K.', role: 'Closer', score: 58, calls: 30, avgDuration: 300, rdv: 3, dossiers: 1 },
    { name: 'Ahmed B.', role: 'Télépro', score: 52, calls: 28, avgDuration: 240, rdv: 2, dossiers: 0 },
  ];

  app.innerHTML = `
    <div class="dashboard-layout">
      ${renderSidebar(profile)}
      <div class="dashboard-main">
        ${renderHeader('Classement Équipe')}
        <div class="dashboard-content">
          <!-- Podium -->
          <div class="card" style="margin-bottom:24px;">
            <div class="card-header"><span class="card-title">Podium — Score Composite</span></div>
            <div style="display:flex;justify-content:center;align-items:flex-end;gap:24px;padding:32px 0 16px;">
              ${renderPodium(agents[1], 2, '120px')}
              ${renderPodium(agents[0], 1, '160px')}
              ${renderPodium(agents[2], 3, '100px')}
            </div>
          </div>

          <!-- Full ranking -->
          <div class="card">
            <div class="card-header"><span class="card-title">Classement détaillé</span></div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Agent</th>
                  <th>Rôle</th>
                  <th>Appels</th>
                  <th>Durée moy.</th>
                  <th>RDV</th>
                  <th>Dossiers</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                ${agents.map((a, i) => {
                  const sc = a.score >= 70 ? 'good' : a.score >= 50 ? 'medium' : 'bad';
                  return `
                    <tr style="cursor:pointer;" onclick="location.hash='#/agent/${i + 1}'">
                      <td style="font-weight:700;color:var(--text-muted);">${i + 1}</td>
                      <td style="font-weight:500;color:var(--text-primary);">${a.name}</td>
                      <td><span style="font-size:0.75rem;color:${a.role === 'Télépro' ? 'var(--accent-blue)' : 'var(--accent-purple)'};">${a.role}</span></td>
                      <td>${a.calls}</td>
                      <td>${formatDuration(a.avgDuration)}</td>
                      <td style="color:var(--accent-purple);font-weight:600;">${a.rdv}</td>
                      <td style="color:var(--accent-green);font-weight:600;">${a.dossiers}</td>
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
  bindHeaderEvents();
}

function renderPodium(agent, rank, height) {
  const colors = { 1: '#fbbf24', 2: '#9ca3b4', 3: '#cd7f32' };
  const sc = agent.score >= 70 ? 'good' : agent.score >= 50 ? 'medium' : 'bad';

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
