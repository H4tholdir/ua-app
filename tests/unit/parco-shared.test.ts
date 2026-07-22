import { describe, expect, it } from 'vitest'
import { deriveParete } from '@/lib/cassette/parco-shared'

const cassetta = (id: string, nome: string, pos: number, createdAt = '2026-07-21T00:00:00Z') =>
  ({ id, nome, colore: 'bianca', posizione: pos, created_at: createdAt })

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

  // Minor #5 (review Task 3): la migration dichiara esplicitamente che due
  // creazioni concorrenti possono nascere con la STESSA posizione (max+1
  // senza lock, tie-break "ORDER BY posizione, created_at, id" — il riordino
  // risana). Il test sopra verifica solo `posizione` (valori distinti): qui
  // si asserta esplicitamente il tie-break, che è la parte dell'ordinamento
  // che più merita una guardia.
  it('a parità di posizione, ordina per created_at poi per id (tie-break)', () => {
    const perCreatedAt = deriveParete(
      [cassetta('b', 'B', 0, '2026-07-21T10:00:00Z'), cassetta('a', 'A', 0, '2026-07-21T09:00:00Z')],
      [], [],
    )
    expect(perCreatedAt.parete.map(c => c.id)).toEqual(['a', 'b'])

    const perId = deriveParete(
      [cassetta('z9', 'Z', 0, '2026-07-21T09:00:00Z'), cassetta('a1', 'A', 0, '2026-07-21T09:00:00Z')],
      [], [],
    )
    expect(perId.parete.map(c => c.id)).toEqual(['a1', 'z9'])
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

  // Minor #4 (review Task 3): rinominato per accuratezza — questo copre il
  // ramo `!l` (lavoro assente dal risultato della query, es. cancellato dal
  // DB), NON il ramo `deleted_at`, che ha il suo test dedicato sotto.
  it('riga viva su lavoro assente dal risultato della query: motivo "annullo_lavoro"', () => {
    const out = deriveParete(
      [cassetta('c1', 'C1', 0)],
      [{ cassetta_id: 'c1', lavoro_id: 'l-fantasma' }],
      [],
    )
    expect(out.parete[0].lavoro).toBeNull()
    expect(out.daRiparare).toEqual([{ lavoroId: 'l-fantasma', motivo: 'annullo_lavoro' }])
  })

  // Minor #4 (review Task 3): il ramo `deleted_at` è raggiungibile in
  // produzione — la query di `parco.ts` NON filtra `deleted_at` sui lavori
  // (serve proprio a rilevarlo) — e non era esercitato. Un lavoro presente,
  // attivo per stato, ma soft-deleted, deve comunque liberare la cassetta con
  // motivo "annullo_lavoro" (mai "consegna": non è mai stato consegnato).
  it('riga viva su lavoro presente ma soft-deleted (stato attivo): motivo "annullo_lavoro"', () => {
    const out = deriveParete(
      [cassetta('c1', 'C1', 0)],
      [{ cassetta_id: 'c1', lavoro_id: 'l1' }],
      [{ id: 'l1', numero_lavoro: '144', stato: 'in_lavorazione', deleted_at: '2026-07-21T08:00:00Z',
         descrizione: null, tipo_dispositivo: null, clienti: null, pazienti: null }],
    )
    expect(out.parete[0].lavoro).toBeNull()
    expect(out.daRiparare).toEqual([{ lavoroId: 'l1', motivo: 'annullo_lavoro' }])
  })
})
