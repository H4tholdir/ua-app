// src/lib/dashboard/cache-stale.ts
export const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minuti — allineato al cron pg_cron

export function isCacheStale(aggiornato_at: string | null): boolean {
  if (!aggiornato_at) return true
  return Date.now() - new Date(aggiornato_at).getTime() > CACHE_TTL_MS
}
