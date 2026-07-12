import { describe, it, expect } from 'vitest'
import { isV3MigratedRoute } from '@/lib/nav/route-migrate-v3'

// Ondata 1, review finale (item 4, avviso advisor ratificato 12/07): il
// predicato che decide «questa route è migrata a v3, l'avatar/BottomNavPill
// legacy si ritirano» viveva duplicato dentro BottomNavPill.tsx (P9). Estratto
// qui perché UserProfileSheet lo consuma con lo STESSO comportamento —
// confronto ESATTO su /dashboard e /tutto-il-resto, ESATTO (non prefix) su
// /lavori.
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

  it('false su /lavori/nuovo (NON-prefix: v2.3, non migrata)', () => {
    expect(isV3MigratedRoute('/lavori/nuovo')).toBe(false)
  })

  it('false su /lavori/abc123 (NON-prefix)', () => {
    expect(isV3MigratedRoute('/lavori/abc123')).toBe(false)
  })

  it('false su una route v2.3 qualunque', () => {
    expect(isV3MigratedRoute('/clienti')).toBe(false)
    expect(isV3MigratedRoute('/impostazioni')).toBe(false)
  })
})
