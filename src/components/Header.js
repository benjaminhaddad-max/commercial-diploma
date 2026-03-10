import { icon } from '../utils/icons.js';

/**
 * Render header with title and date filters
 */
export function renderHeader(title, options = {}) {
  const { showFilters = true, showRefresh = true } = options;

  return `
    <header class="header">
      <h1 class="header-title">${title}</h1>
      <div class="header-actions">
        ${showFilters ? `
          <div class="filter-bar">
            <button class="filter-btn active" data-period="today">Aujourd'hui</button>
            <button class="filter-btn" data-period="week">Cette semaine</button>
            <button class="filter-btn" data-period="month">Ce mois</button>
            <button class="filter-btn" data-period="last30">30 jours</button>
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
