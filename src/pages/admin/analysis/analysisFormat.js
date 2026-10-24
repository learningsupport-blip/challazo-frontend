import { useTheme } from '../../../theme/useTheme'
import { CHROME, SERIES } from '../access/chartPalette'

/**
 * Formatting and chart colours shared by the Analysis sections.
 *
 * Every number from the API can be null (no data yet), so each formatter shows
 * "—" rather than a misleading 0.
 */

const missing = (value) => value === null || value === undefined || Number.isNaN(Number(value))

/** Whole counts, grouped for India: 1,200 and 10,00,000. */
export function formatNumber(value) {
  return missing(value) ? '—' : Number(value).toLocaleString('en-IN')
}

/** "42.5%". */
export function formatPercent(value) {
  return missing(value) ? '—' : `${Math.round(Number(value) * 10) / 10}%`
}

/** "3.4 h"; under an hour reads in minutes so a fast review is not "0 h". */
export function formatHours(value) {
  if (missing(value)) return '—'
  const hours = Number(value)
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`
  return `${Math.round(hours * 10) / 10} h`
}

/** "8.2". */
export function formatRating(value) {
  return missing(value) ? '—' : (Math.round(Number(value) * 10) / 10).toFixed(1)
}

/** "82.5", out of 100. */
export function formatScore(value) {
  return missing(value) ? '—' : String(Math.round(Number(value) * 10) / 10)
}

/** Shortens a long axis label with an ellipsis; the tooltip keeps the full text. */
export function truncateLabel(value, max = 16) {
  const text = String(value ?? '')
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}

/** "12 Aug" from an IST `YYYY-MM-DD`; the year only when it is not this one. */
export function formatDay(value) {
  const [y, m, d] = String(value || '').split('-').map(Number)
  if (!y || !m || !d) return String(value || '')
  const date = new Date(Date.UTC(y, m - 1, d))
  const sameYear = y === new Date().getFullYear()
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
    timeZone: 'UTC',
  })
}

/**
 * The eight validated categorical slots and the axis/grid chrome for the
 * active theme. Slots are used in order and never cycled — a ninth series is
 * never given a generated colour.
 */
export function useChartColors() {
  const { isLight } = useTheme()
  const theme = isLight ? 'light' : 'dark'
  return { series: SERIES[theme], chrome: CHROME[theme] }
}

export const MAX_SERIES = 8
