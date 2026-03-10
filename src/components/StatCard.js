import { trendDirection, trendArrow, formatPercent } from '../utils/numbers.js';

/**
 * Render a KPI stat card
 * @param {Object} options
 * @param {string} options.label - Metric name
 * @param {string} options.value - Formatted value
 * @param {number|null} options.change - Percentage change vs previous period
 * @param {string} options.color - Accent color (optional)
 * @param {string} options.score - 'good' | 'medium' | 'bad' (optional)
 */
export function renderStatCard({ label, value, change = null, color, score }) {
  const dir = trendDirection(change);
  const arrow = trendArrow(dir);
  const changeText = change !== null ? `${arrow} ${formatPercent(Math.abs(change))}` : '';

  const scoreClass = score ? ` score-${score}` : '';
  const borderStyle = score
    ? `border-left: 3px solid var(--score-${score})`
    : color
      ? `border-left: 3px solid ${color}`
      : '';

  return `
    <div class="stat-card${scoreClass}" style="${borderStyle}">
      <span class="stat-label">${label}</span>
      <span class="stat-value">${value}</span>
      ${changeText ? `<span class="stat-trend ${dir}">${changeText} vs période préc.</span>` : ''}
    </div>
  `;
}

/** Render a loading skeleton stat card */
export function renderStatCardSkeleton() {
  return `
    <div class="stat-card">
      <div class="skeleton" style="width:80px;height:12px;margin-bottom:8px;"></div>
      <div class="skeleton" style="width:60px;height:32px;margin-bottom:8px;"></div>
      <div class="skeleton" style="width:100px;height:12px;"></div>
    </div>
  `;
}
