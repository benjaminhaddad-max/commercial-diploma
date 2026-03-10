import { currentPath, navigate } from '../router.js';
import { signOut } from '../auth.js';
import { icon } from '../utils/icons.js';
import { hasRole } from '../auth.js';

/**
 * Render sidebar navigation
 */
export function renderSidebar(profile) {
  const role = profile?.role || 'telepro';
  const path = currentPath();

  const navItems = [
    { path: '/', label: 'Vue d\'ensemble', icon: 'home', roles: ['manager', 'telepro', 'closer', 'super_admin'] },
    { path: '/calls', label: 'Appels', icon: 'phone', roles: ['manager', 'telepro', 'super_admin'] },
    { path: '/pipeline', label: 'Pipeline', icon: 'pipeline', roles: ['manager', 'closer', 'super_admin'] },
    { path: '/leaderboard', label: 'Classement', icon: 'trophy', roles: ['manager', 'telepro', 'closer', 'super_admin'] },
  ];

  const settingsItem = hasRole(profile, 'manager', 'super_admin')
    ? `<a href="#/settings" class="nav-item ${path === '/settings' ? 'active' : ''}">${icon('settings')} <span>Configuration</span></a>`
    : '';

  const initials = (profile?.full_name || profile?.email || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const roleName = {
    manager: 'Manager',
    telepro: 'Télépro',
    closer: 'Closer',
    super_admin: 'Admin',
  }[role] || role;

  return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-logo">
        <div class="logo-icon">D</div>
        <div>
          <div class="logo-text">Diploma Santé</div>
          <div class="logo-sub">Dashboard Commercial</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="sidebar-section">Navigation</div>
        ${navItems
          .filter(item => item.roles.includes(role))
          .map(item => `
            <a href="#${item.path}" class="nav-item ${path === item.path ? 'active' : ''}">
              ${icon(item.icon)}
              <span>${item.label}</span>
            </a>
          `).join('')}

        ${settingsItem ? `
          <div class="sidebar-section" style="margin-top:auto;">Administration</div>
          ${settingsItem}
        ` : ''}
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="user-avatar">${initials}</div>
          <div style="flex:1;min-width:0;">
            <div class="user-name">${profile?.full_name || profile?.email || 'Utilisateur'}</div>
            <div class="user-role">${roleName}</div>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" style="width:100%;margin-top:8px;" id="logoutBtn">
          ${icon('logout', 'nav-icon')} Déconnexion
        </button>
      </div>
    </aside>
  `;
}

/** Bind sidebar events */
export function bindSidebarEvents() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => signOut());
  }
}
