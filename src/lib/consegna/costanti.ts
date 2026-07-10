// Costanti condivise del flusso consegna/annullo/emissione (spec 4a §3).
// Modulo client-safe: lo importano anche componenti client (banner) e pagine.

export const STATI_CONSEGNABILI = ['pronto', 'in_ritardo'] as const // E4 — unica fonte
export type StatoConsegnabile = (typeof STATI_CONSEGNABILI)[number]

export const FINESTRA_ANNULLO_MS = 10 * 60 * 1000 // C4 — 10 minuti
export const MAX_TENTATIVI_EMISSIONE = 8           // con backoff esponenziale ≈ 2h
export const OUTBOX_BATCH_MAX = 20
export const OUTBOX_TIME_BUDGET_MS = 45_000        // 75% di maxDuration=60
export const WATCHDOG_IN_LAVORAZIONE_MIN = 5       // > maxDuration, < finestra

export function isStatoConsegnabile(stato: string): boolean {
  return (STATI_CONSEGNABILI as readonly string[]).includes(stato)
}
