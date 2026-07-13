import { describe, it, expect } from 'vitest'
import { isV3MigratedRoute } from '@/lib/nav/route-migrate-v3'

// Ondata 1, review finale (item 4, avviso advisor ratificato 12/07): il
// predicato che decide «questa route è migrata a v3, l'avatar/BottomNavPill
// legacy si ritirano» viveva duplicato dentro BottomNavPill.tsx (P9). Estratto
// qui perché UserProfileSheet lo consuma con lo STESSO comportamento —
// confronto ESATTO su /dashboard, /tutto-il-resto e /lavori/nuovo (Ondata 2,
// Task 8: il wizard sostituisce il form v2.3), ESATTO (non prefix) su /lavori.
//
// Polish Livello 1 (2026-07-14, ratifica Francesco): la scheda lavoro
// `/lavori/[id]` e la route-ponte `/lavori/[id]/modifica` sono ora v3 (Ondata
// 3a) → si ritirano avatar + BottomNavPill anche lì. Il flusso di consegna
// `/lavori/[id]/consegna` resta v2.3 e NON si migra.
describe('isV3MigratedRoute — predicato condiviso route migrate a v3', () => {
  it('true su /dashboard', () => {
    expect(isV3MigratedRoute('/dashboard')).toBe(true)
  })

  it('true su /tutto-il-resto', () => {
    expect(isV3MigratedRoute('/tutto-il-resto')).toBe(true)
  })

  it('true su /lavori (confronto ESATTO)', () => {
    expect(isV3MigratedRoute('/lavori')).toBe(true)
  })

  it('true su /lavori/nuovo (Ondata 2, Task 8: wizard v3)', () => {
    expect(isV3MigratedRoute('/lavori/nuovo')).toBe(true)
  })

  it('true su /lavori/[id] scheda-vista v3 (Ondata 3a, polish L1)', () => {
    expect(isV3MigratedRoute('/lavori/abc123')).toBe(true)
    expect(isV3MigratedRoute('/lavori/f3ce5264-3ba7-4730-becd-3da237ba2fb1')).toBe(true)
  })

  it('true su /lavori/[id]/modifica route-ponte v3 (Ondata 3a, polish L1)', () => {
    expect(isV3MigratedRoute('/lavori/abc123/modifica')).toBe(true)
  })

  it('false su /lavori/[id]/consegna (flusso consegna resta v2.3)', () => {
    expect(isV3MigratedRoute('/lavori/abc123/consegna')).toBe(false)
  })

  it('false su sotto-route ignote della scheda', () => {
    expect(isV3MigratedRoute('/lavori/abc123/altro')).toBe(false)
  })

  it('false su una route v2.3 qualunque', () => {
    expect(isV3MigratedRoute('/clienti')).toBe(false)
    expect(isV3MigratedRoute('/impostazioni')).toBe(false)
  })
})
