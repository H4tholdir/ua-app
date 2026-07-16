import type { TabId } from '@/components/features/lavori/form/LavoroFormShell'

// Ondata 3a Task 9 — tab ammessi nella route-ponte /lavori/[id]/modifica
// (src/app/(app)/lavori/[id]/modifica/page.tsx). Estratto qui (fix review
// finale, finding CRITICO) perché 'dati' mancava dall'allowlist pur essendo
// la route di TUTTI i bloccanti di produzione (classe_rischio,
// data_consegna, ... — vedi `route: 'dati'` in src/lib/consegna/precheck.ts)
// e di tutti e 4 gli host che spingono `?tab=dati` verso questa route-ponte.
// Un `?tab=dati` non riconosciuto cadeva silenziosamente su 'lavorazioni' —
// il modulo dedicato + il test seam sotto impediscono che l'allowlist
// diverga di nuovo dal set che precheck.ts realmente usa.
export const TABS_VALIDI = ['dati', 'lavorazioni', 'clinica', 'prove', 'immagini'] as const

/** Risolve `?tab=` in un TabId valido; fallback 'lavorazioni' se assente o non riconosciuto. */
export function risolviTab(tab: string | undefined): TabId {
  return (TABS_VALIDI as readonly string[]).includes(tab ?? '')
    ? (tab as TabId)
    : 'lavorazioni'
}
