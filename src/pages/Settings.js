import { requireAuth, hasRole } from '../auth.js';
import { renderSidebar, bindSidebarEvents } from '../components/Sidebar.js';
import { renderHeader } from '../components/Header.js';
import { navigate } from '../router.js';

export default async function SettingsPage(app) {
  const profile = await requireAuth();
  if (!profile) return;

  // Only managers and super_admin can access settings
  if (!hasRole(profile, 'manager', 'super_admin')) {
    navigate('/');
    return;
  }

  const demoTeam = [
    { name: 'Marie L.', role: 'telepro', email: 'marie@diploma.fr', aircallId: '12345', hubspotId: '67890', active: true },
    { name: 'Thomas R.', role: 'closer', email: 'thomas@diploma.fr', aircallId: '12346', hubspotId: '67891', active: true },
    { name: 'Julie M.', role: 'telepro', email: 'julie@diploma.fr', aircallId: '12347', hubspotId: '67892', active: true },
    { name: 'Lucas D.', role: 'telepro', email: 'lucas@diploma.fr', aircallId: '12348', hubspotId: '67893', active: true },
    { name: 'Sarah K.', role: 'closer', email: 'sarah@diploma.fr', aircallId: '12349', hubspotId: '67894', active: true },
  ];

  app.innerHTML = `
    <div class="dashboard-layout">
      ${renderSidebar(profile)}
      <div class="dashboard-main">
        ${renderHeader('Configuration', { showFilters: false, showRefresh: false })}
        <div class="dashboard-content">
          <!-- Team config -->
          <div class="card" style="margin-bottom:24px;">
            <div class="card-header">
              <span class="card-title">Membres de l'équipe</span>
              <button class="btn btn-primary btn-sm" id="addMemberBtn">+ Ajouter</button>
            </div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Rôle</th>
                  <th>Email</th>
                  <th>Aircall ID</th>
                  <th>HubSpot ID</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                ${demoTeam.map(m => `
                  <tr>
                    <td style="font-weight:500;color:var(--text-primary);">${m.name}</td>
                    <td><span style="color:${m.role === 'telepro' ? 'var(--accent-blue)' : 'var(--accent-purple)'};font-size:0.75rem;font-weight:500;text-transform:uppercase;">${m.role}</span></td>
                    <td style="color:var(--text-muted);">${m.email}</td>
                    <td><code style="font-size:0.75rem;background:var(--bg-tertiary);padding:2px 6px;border-radius:4px;">${m.aircallId}</code></td>
                    <td><code style="font-size:0.75rem;background:var(--bg-tertiary);padding:2px 6px;border-radius:4px;">${m.hubspotId}</code></td>
                    <td><span class="score-badge ${m.active ? 'good' : 'bad'}">${m.active ? 'Actif' : 'Inactif'}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Score thresholds -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">Seuils des KPIs (score composite)</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:8px 0;">
              ${renderThreshold('Durée moy. appel', '10 min', '5 min')}
              ${renderThreshold('Taux de décroché', '40%', '25%')}
              ${renderThreshold('Taux RDV / décrochés', '30%', '15%')}
              ${renderThreshold('Appels sortants / jour', '40', '25')}
              ${renderThreshold('Appels > 10 min', '50%', '30%')}
              ${renderThreshold('Taux dossiers finalisés', '25%', '10%')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  bindSidebarEvents();
}

function renderThreshold(label, good, medium) {
  return `
    <div style="padding:12px;background:var(--bg-tertiary);border-radius:var(--radius-md);">
      <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:8px;">${label}</div>
      <div style="display:flex;gap:8px;">
        <span class="score-badge good">${good}</span>
        <span class="score-badge medium">${medium}</span>
      </div>
    </div>
  `;
}
