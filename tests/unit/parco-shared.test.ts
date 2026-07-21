import { describe, expect, it } from 'vitest'
import { deriveParete } from '@/lib/cassette/parco-shared'

const cassetta = (id: string, nome: string, pos: number) =>
  ({ id, nome, colore: 'bianca', posizione: pos, created_at: '2026-07-21T00:00:00Z' })

describe('deriveParete', () => {
  it('unisce cassette e occupazioni vive, ordina per posizione', () => {
    const out = deriveParete(
      [cassetta('c2', 'C2', 1), cassetta('c1', 'C1', 0)],
      [{ cassetta_id: 'c1', lavoro_id: 'l1' }],
      [{ id: 'l1', numero_lavoro: '144', stato: 'in_lavorazione', deleted_at: null,
         descrizione: 'Corona zirconia', tipo_dispositivo: 'protesi_fissa',
         clienti: { studio_nome: 'Bianchi', nome: null, cognome: null },
         pazienti: { codice_paziente: 'MAR-42' } }],
    )
    expect(out.parete.map(c => c.nome)).toEqual(['C1', 'C2'])
    expect(out.parete[0].lavoro?.numero).toBe('144')
    expect(out.parete[1].lavoro).toBeNull()
    expect(out.daRiparare).toEqual([])
  })

  it('segnala da riparare la riga viva con lavoro consegnato, motivo "consegna", e la rende libera', () => {
    const out = deriveParete(
      [cassetta('c1', 'C1', 0)],
      [{ cassetta_id: 'c1', lavoro_id: 'l1' }],
      [{ id: 'l1', numero_lavoro: '144', stato: 'consegnato', deleted_at: null,
         descrizione: null, tipo_dispositivo: null, clienti: null, pazienti: null }],
    )
    expect(out.parete[0].lavoro).toBeNull()
    expect(out.daRiparare).toEqual([{ lavoroId: 'l1', motivo: 'consegna' }])
  })

  // Guardia di regressione R-4.2 / R-B: un lavoro ANNULLATO non deve MAI
  // chiudere con motivo 'consegna' — cassetta_riassegna_post_annullo seleziona
  // le righe WHERE liberato_per='consegna', quindi 'consegna' su un annullato
  // lo renderebbe eleggibile alla riassegnazione post-annullo (il difetto che
  // la correzione 2 ha risolto dentro la RPC).
  it('segnala da riparare la riga viva con lavoro annullato, motivo "annullo_lavoro" (mai "consegna")', () => {
    const out = deriveParete(
      [cassetta('c1', 'C1', 0)],
      [{ cassetta_id: 'c1', lavoro_id: 'l1' }],
      [{ id: 'l1', numero_lavoro: '144', stato: 'annullato', deleted_at: null,
         descrizione: null, tipo_dispositivo: null, clienti: null, pazienti: null }],
    )
    expect(out.parete[0].lavoro).toBeNull()
    expect(out.daRiparare).toEqual([{ lavoroId: 'l1', motivo: 'annullo_lavoro' }])
  })

  it('riga viva su lavoro assente dalla query (soft-deleted altrove): motivo "annullo_lavoro"', () => {
    const out = deriveParete(
      [cassetta('c1', 'C1', 0)],
      [{ cassetta_id: 'c1', lavoro_id: 'l-fantasma' }],
      [],
    )
    expect(out.parete[0].lavoro).toBeNull()
    expect(out.daRiparare).toEqual([{ lavoroId: 'l-fantasma', motivo: 'annullo_lavoro' }])
  })
})
