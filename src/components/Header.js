import { icon } from '../utils/icons.js';

/**
 * Render header with title and date filters
 */
export function renderHeader(title, options = {}) {
  const { showFilters = true, showRefresh = true, activePeriod = 'today' } = options;

  const periods = [
    { key: 'today', label: "Aujourd'hui" },
    { key: 'week', label: 'Cette semaine' },
    { key: 'month', label: 'Ce mois' },
    { key: 'last30', label: '30 jours' },
  ];

  return `
    <header class="header">
      <h1 class="header-title">${title}</h1>
      <div class="header-actions">
        ${showFilters ? `
          <div class="filter-bar">
            ${periods.map(p => `<button class="filter-btn${p.key === activePeriod ? ' active' : ''}" data-period="${p.key}">${p.label}</button>`).join('')}
          </div>
        ` : ''}
        ${showRefresh ? `
          <button class="btn btn-ghost btn-icon" id="refreshBtn" title="Rafraîchir">
            ${icon('refresh', 'nav-icon')}
          </button>
        ` : ''}
      </div>
    </header>
  `;
}

/** Bind filter events */
export function bindHeaderEvents(onPeriodChange, onRefresh) {
  // Period filter buttons
  document.querySelectorAll('.filter-btn[data-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (onPeriodChange) onPeriodChange(btn.dataset.period);
    });
  });

  // Refresh button
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn && onRefresh) {
    refreshBtn.addEventListener('click', () => {
      refreshBtn.classList.add('spinning');
      onRefresh().finally(() => {
        refreshBtn.classList.remove('spinning');
      });
    });
  }
}
