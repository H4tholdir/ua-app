/**
 * Dashboard KPI cache staleness check.
 * Cache is considered stale if it's older than 15 minutes or null.
 */

const STALE_THRESHOLD_MS = 15 * 60 * 1000 // 15 minutes

/**
 * Returns true if the cache timestamp is stale (>15 min old) or absent.
 */
export function isCacheStale(aggiornatoAt: string | null): boolean {
  if (!aggiornatoAt) return true
  const age = Date.now() - new Date(aggiornatoAt).getTime()
  return age > STALE_THRESHOLD_MS
}
