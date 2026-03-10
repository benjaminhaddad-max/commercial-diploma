/**
 * Date utility helpers
 */

/** Get today at midnight */
export function today() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Get start of current week (Monday) */
export function startOfWeek() {
  const d = today();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

/** Get start of current month */
export function startOfMonth() {
  const d = today();
  d.setDate(1);
  return d;
}

/** Get date range for a period */
export function getDateRange(period) {
  const now = new Date();
  switch (period) {
    case 'today':
      return { from: today(), to: now };
    case 'week':
      return { from: startOfWeek(), to: now };
    case 'month':
      return { from: startOfMonth(), to: now };
    case 'last7':
      const d7 = today();
      d7.setDate(d7.getDate() - 7);
      return { from: d7, to: now };
    case 'last30':
      const d30 = today();
      d30.setDate(d30.getDate() - 30);
      return { from: d30, to: now };
    default:
      return { from: today(), to: now };
  }
}

/** Format date as YYYY-MM-DD */
export function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/** Format date as DD/MM/YYYY */
export function formatDateFR(date) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/** Format date as "Lun 10 Mar" */
export function formatDateShort(date) {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
}

/** Format time as HH:MM */
export function formatTime(date) {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** Convert to unix timestamp (seconds) */
export function toUnix(date) {
  return Math.floor(date.getTime() / 1000);
}
