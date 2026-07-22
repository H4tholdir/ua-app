// Normalizzazione del colore delle cassette (spec parete-cassette, correzioni 21/07 Task 4,
// R-5) — pura, client-safe (nessun import 'server-only': non tocca I/O), condivisa fra
// `src/app/api/cassette/route.ts` e `src/app/api/cassette/[id]/route.ts` (review Minor #6:
// prima viveva dentro route.ts, unico export non-handler di una route in tutto il repo —
// accoppiava i due entrypoint invece di condividere una dipendenza comune in `src/lib/`).
const COLORI = new Set(['bianca', 'azzurra', 'rossa', 'blu', 'verde', 'grigia'])
const HEX_RE = /^#[0-9a-fA-F]{6}$/

/** Normalizza (R-5): l'hex va MAIUSCOLO perché il CHECK di tabella vuole A-F. Un colore non
 *  normalizzato che arriva alla RPC fa RAISE, cioè un 400/P0001 — non un esito (verificato sul
 *  DB live, task-4a-report.md Appendice 2).
 *
 *  `null`/assente → default `'bianca'`: corretto per una CREAZIONE (colore non specificato,
 *  vedi `POST /api/cassette`). Chi chiama da un contesto di AGGIORNAMENTO esplicito (es.
 *  `PATCH {colore}`) e vuole trattare un campo PRESENTE-ma-`null` come input malformato invece
 *  che come default silenzioso deve escludere `null` PRIMA di arrivare qui (review Minor #3 —
 *  vedi il guard dedicato in `[id]/route.ts`). */
export function normalizzaColore(input: unknown): string | null {
  if (input == null) return 'bianca'
  if (typeof input !== 'string') return null
  if (COLORI.has(input)) return input
  if (HEX_RE.test(input)) return input.toUpperCase()
  return null
}
