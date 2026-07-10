// Costanti condivise del flusso consegna/annullo (Ondata 0 — fatturazione concordata).
// Modulo client-safe: lo importano anche componenti client (banner) e pagine.

export const STATI_CONSEGNABILI = ['pronto', 'in_ritardo'] as const // E4 — unica fonte
export type StatoConsegnabile = (typeof STATI_CONSEGNABILI)[number]

export const FINESTRA_ANNULLO_MS = 10 * 60 * 1000 // C4 — 10 minuti

export function isStatoConsegnabile(stato: string): boolean {
  return (STATI_CONSEGNABILI as readonly string[]).includes(stato)
}
