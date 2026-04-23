/**
 * Human-friendly time formatter used by the ruler cursor, navigation
 * control, and bar labels. Mirrors the reference waterfall component's
 * output so labels read consistently.
 *
 *   0.0005 .. 1s   → `ms`
 *   1s .. 60s       → `s.sss`
 *   1m .. 1h       → `m mm.sss`
 *   1h .. 1d       → `h hh mm`
 *   1d .. 30d      → `d d hh mm`
 *   30d .. 365d    → `mo d d hh`
 *   365d+          → `y mo d`
 */
export function formatDuration(seconds: number): string {
  const sign = seconds < 0 ? '-' : '';
  const abs = Math.abs(seconds);

  if (abs < 1) {
    if (abs < 0.0005) return '0s';
    return `${sign}${Math.round(abs * 1000)}ms`;
  }
  if (abs < 60) return `${sign}${abs.toFixed(3)}s`;

  const MIN = 60;
  const HOUR = 3600;
  const DAY = 86400;
  const MONTH = 2592000;
  const YEAR = 31536000;

  if (abs < HOUR) {
    const m = Math.floor(abs / MIN);
    const s = abs % MIN;
    return `${sign}${m}m ${s.toFixed(2).padStart(5, '0')}s`;
  }
  if (abs < DAY) {
    const h = Math.floor(abs / HOUR);
    const m = Math.floor((abs % HOUR) / MIN);
    const s = Math.floor(abs % MIN);
    return `${sign}${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  }
  if (abs < MONTH) {
    const d = Math.floor(abs / DAY);
    const h = Math.floor((abs % DAY) / HOUR);
    const m = Math.floor((abs % HOUR) / MIN);
    return `${sign}${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
  }
  if (abs < YEAR) {
    const mo = Math.floor(abs / MONTH);
    const d = Math.floor((abs % MONTH) / DAY);
    const h = Math.floor((abs % DAY) / HOUR);
    return `${sign}${mo}mo ${String(d).padStart(3, '0')}d ${String(h).padStart(2, '0')}h`;
  }
  const y = Math.floor(abs / YEAR);
  const mo = Math.floor((abs % YEAR) / MONTH);
  const d = Math.floor((abs % MONTH) / DAY);
  return `${sign}${y}y ${String(mo).padStart(2, '0')}mo ${String(d).padStart(3, '0')}d`;
}
