import { describe, it, expect } from 'vitest'
import { derivaCassetteSuggerite } from '@/lib/lavori/cassette-shared'

describe('derivaCassetteSuggerite', () => {
  it('propone le cassette usate di recente e ora libere, senza duplicati', () => {
    const rows = [
      { numero_cassetta: 'C7', stato: 'consegnato' }, // libera → chip
      { numero_cassetta: 'C12', stato: 'in_lavorazione' }, // occupata → esclusa
      { numero_cassetta: 'C15', stato: 'consegnato' },
      { numero_cassetta: 'C7', stato: 'consegnato' }, // duplicato
      { numero_cassetta: null, stato: 'consegnato' },
    ]
    expect(derivaCassetteSuggerite(rows)).toEqual(['C7', 'C15'])
  })
  it('taglia a 6 chips', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      numero_cassetta: `C${i + 1}`,
      stato: 'consegnato',
    }))
    expect(derivaCassetteSuggerite(rows)).toHaveLength(6)
  })
})
