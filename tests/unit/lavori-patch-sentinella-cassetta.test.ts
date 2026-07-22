import { describe, expect, it } from 'vitest'
import { PATCHABLE_FIELDS } from '@/app/api/lavori/[id]/route'

/**
 * Sentinella (modello invariante D7, spec parete-cassette §10): numero_cassetta
 * non deve MAI rientrare in PATCHABLE_FIELDS. La cassetta si scrive SOLO tramite
 * le RPC atomiche (`cassetta_assegna_atomica`/`cassetta_libera_atomica`, via
 * POST /api/lavori/[id]/cassetta) — mai con un UPDATE diretto della colonna,
 * per non desincronizzare la denormalizzazione dalla riga viva di `cassette_lavori`.
 */
describe('sentinella cassetta (spec parete-cassette §10)', () => {
  it('numero_cassetta NON è mai patchabile direttamente: scrive solo la RPC', () => {
    expect(PATCHABLE_FIELDS).not.toContain('numero_cassetta')
  })
})
