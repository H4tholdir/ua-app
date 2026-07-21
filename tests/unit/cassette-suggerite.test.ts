import { describe, it, expect } from 'vitest'
import { derivaCassetteSuggerite } from '@/lib/lavori/cassette-shared'

// Contratto R-4.2/R-C (21/07): la verità dell'uso recente è
// max(cassette_lavori.assegnato_at) — MAI cassette.updated_at. `occupate`
// contiene id di cassetta, non nomi.
describe('derivaCassetteSuggerite', () => {
  it('esclude le cassette occupate (per id) e propone le libere per uso recente', () => {
    const cassette = [
      { id: 'c1', nome: 'C1', ultimoUso: '2026-07-20T10:00:00Z' },
      { id: 'c2', nome: 'C2', ultimoUso: '2026-07-21T10:00:00Z' }, // occupata → esclusa
      { id: 'c3', nome: 'C3', ultimoUso: '2026-07-19T10:00:00Z' },
    ]
    const occupate = new Set(['c2'])
    expect(derivaCassetteSuggerite(cassette, occupate)).toEqual([
      { id: 'c1', nome: 'C1' },
      { id: 'c3', nome: 'C3' },
    ])
  })

  // R-C: le cassette vive libere mai usate sono eleggibili e vanno in coda —
  // non deve sparire implicitamente dal sort, va assertato esplicitamente.
  it('mette in coda le cassette libere mai usate (ultimoUso: null), dopo quelle usate di recente', () => {
    const cassette = [
      { id: 'c1', nome: 'C1', ultimoUso: null },
      { id: 'c2', nome: 'C2', ultimoUso: '2026-07-20T10:00:00Z' },
    ]
    expect(derivaCassetteSuggerite(cassette, new Set())).toEqual([
      { id: 'c2', nome: 'C2' },
      { id: 'c1', nome: 'C1' },
    ])
  })

  it('a parità di ultimoUso, ordina per nome (localeCompare it)', () => {
    const cassette = [
      { id: 'c2', nome: 'C2', ultimoUso: '2026-07-20T10:00:00Z' },
      { id: 'c1', nome: 'C1', ultimoUso: '2026-07-20T10:00:00Z' },
    ]
    expect(derivaCassetteSuggerite(cassette, new Set())).toEqual([
      { id: 'c1', nome: 'C1' },
      { id: 'c2', nome: 'C2' },
    ])
  })

  it('a parità di ultimoUso e nome, tie-break finale per id', () => {
    const cassette = [
      { id: 'z9', nome: 'C1', ultimoUso: '2026-07-20T10:00:00Z' },
      { id: 'a1', nome: 'C1', ultimoUso: '2026-07-20T10:00:00Z' },
    ]
    expect(derivaCassetteSuggerite(cassette, new Set())).toEqual([
      { id: 'a1', nome: 'C1' },
      { id: 'z9', nome: 'C1' },
    ])
  })

  it('taglia a 6 chips', () => {
    const cassette = Array.from({ length: 10 }, (_, i) => ({
      id: `c${i + 1}`,
      nome: `C${i + 1}`,
      ultimoUso: `2026-07-${10 + i}T10:00:00Z`,
    }))
    expect(derivaCassetteSuggerite(cassette, new Set())).toHaveLength(6)
  })
})
