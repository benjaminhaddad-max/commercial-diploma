/**
 * Number formatting helpers
 */

/** Format seconds as "Xm Ys" or "Xh Ym" */
export function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Format seconds as "MM:SS" */
export function formatDurationClock(seconds) {
  if (!seconds || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Format a percentage */
export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return `${value.toFixed(decimals)}%`;
}

/** Format a number with separator */
export function formatNumber(n) {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('fr-FR').format(n);
}

/** Format currency */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Calculate percentage change */
export function percentChange(current, previous) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

/** Get trend direction */
export function trendDirection(change) {
  if (change === null || change === undefined) return 'neutral';
  if (change > 0) return 'up';
  if (change < 0) return 'down';
  return 'neutral';
}

/** Get trend arrow */
export function trendArrow(direction) {
  switch (direction) {
    case 'up': return '↑';
    case 'down': return '↓';
    default: return '→';
  }
}

/** Calculate score color based on thresholds */
export function scoreColor(value, goodThreshold, mediumThreshold) {
  if (value >= goodThreshold) return 'good';
  if (value >= mediumThreshold) return 'medium';
  return 'bad';
}
