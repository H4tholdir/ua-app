import { describe, it, expect } from 'vitest'

import { risolviTab, TABS_VALIDI } from '@/lib/lavori/risolvi-tab'

// Seam test — fix review finale (finding CRITICO): TUTTI i bloccanti di
// produzione (classe_rischio, data_consegna, ... — src/lib/consegna/precheck.ts
// `route: 'dati'`) e tutti e 4 gli host che risolvono un bloccante spingono
// `/lavori/{id}/modifica?tab=dati` verso la route-ponte. Prima di questo fix
// 'dati' non era in TABS_VALIDI e cadeva silenziosamente su 'lavorazioni'.
// Questo test pinna il round trip così l'allowlist non può più divergere.
describe('risolviTab — route-ponte /lavori/[id]/modifica', () => {
  it('?tab=dati risolve a "dati", NON al fallback "lavorazioni"', () => {
    expect(risolviTab('dati')).toBe('dati')
  })

  it.each(['dati', 'lavorazioni', 'clinica', 'prove', 'immagini'] as const)(
    '?tab=%s resta invariato (round trip)',
    (tab) => {
      expect(risolviTab(tab)).toBe(tab)
    }
  )

  it('tab assente → fallback "lavorazioni"', () => {
    expect(risolviTab(undefined)).toBe('lavorazioni')
  })

  it('tab sconosciuto → fallback "lavorazioni"', () => {
    expect(risolviTab('non-esiste')).toBe('lavorazioni')
  })

  it('TABS_VALIDI include "dati"', () => {
    expect(TABS_VALIDI).toContain('dati')
  })
})
