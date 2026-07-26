import { describe, expect, it } from 'vitest'
import { deriveParete, targheInCollisione, derivaAlias } from '@/lib/cassette/parco-shared'

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
         pazienti: { codice_paziente: 'MAR-42', nome_cognome: null } }],
    )
    expect(out.parete.map(c => c.nome)).toEqual(['C1', 'C2'])
    expect(out.parete[0].lavoro?.numero).toBe('144')
    expect(out.parete[1].lavoro).toBeNull()
    expect(out.daRiparare).toEqual([])
  })

  // FIX-K / K2 (G7, ratifica 25/07) — `note_interne` (raw, snake_case dal DB) deve arrivare sul
  // parete come `lavoro.noteInterne` (camelCase, come gli altri campi derivati): senza questo
  // mapping il pagliaio di `filtraCassette` (che legge `l.noteInterne`) resterebbe vuoto anche
  // se la query server selezionasse davvero la colonna — un test sull'haystack con fixture
  // proprie (v. filtra-cassette.test.ts) non lo scoprirebbe.
  it('propaga note_interne (raw) → lavoro.noteInterne (FIX-K/K2)', () => {
    const out = deriveParete(
      [cassetta('c1', 'C1', 0)],
      [{ cassetta_id: 'c1', lavoro_id: 'l1' }],
      [{ id: 'l1', numero_lavoro: '144', stato: 'in_lavorazione', deleted_at: null,
         descrizione: null, tipo_dispositivo: null, note_interne: 'prova colore A2',
         clienti: null, pazienti: null }],
    )
    expect(out.parete[0].lavoro?.noteInterne).toBe('prova colore A2')
  })

  it('note_interne assente/null → lavoro.noteInterne null (mai undefined nel pagliaio)', () => {
    const out = deriveParete(
      [cassetta('c1', 'C1', 0)],
      [{ cassetta_id: 'c1', lavoro_id: 'l1' }],
      [{ id: 'l1', numero_lavoro: '144', stato: 'in_lavorazione', deleted_at: null,
         descrizione: null, tipo_dispositivo: null, clienti: null, pazienti: null }],
    )
    expect(out.parete[0].lavoro?.noteInterne).toBeNull()
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

describe('alias paziente (spec redesign §2.3, riserva ARCH R4)', () => {
  const cassette = [{ id: 'c1', nome: 'C1', colore: 'rossa', posizione: 1, created_at: '2026-01-01' }]
  const vive = [{ cassetta_id: 'c1', lavoro_id: 'l1' }]
  const lavoroBase = {
    id: 'l1', numero_lavoro: '147', stato: 'in_lavorazione', deleted_at: null,
    descrizione: null, tipo_dispositivo: null,
    clienti: { studio_nome: 'Studio Esposito', nome: null, cognome: null },
  }

  it('alias presente: nome_cognome normalizzato (trim), diverso dal codice', () => {
    const { parete } = deriveParete(cassette, vive, [
      { ...lavoroBase, pazienti: { codice_paziente: 'PZ-0012', nome_cognome: 'ROSSI MARIO ' } },
    ])
    expect(parete[0].lavoro?.paziente).toBe('PZ-0012')
    expect(parete[0].lavoro?.pazienteAlias).toBe('ROSSI MARIO')
  })

  it('paziente-wizard senza alias: nome_cognome contiene il codice (con spazio finale del trigger) → alias null', () => {
    const { parete } = deriveParete(cassette, vive, [
      { ...lavoroBase, pazienti: { codice_paziente: 'PZ-0012', nome_cognome: 'PZ-0012 ' } },
    ])
    expect(parete[0].lavoro?.pazienteAlias).toBeNull()
  })

  it('confronto alias/codice case-insensitive (il trigger scrive UPPER)', () => {
    const { parete } = deriveParete(cassette, vive, [
      { ...lavoroBase, pazienti: { codice_paziente: 'pz-0012', nome_cognome: 'PZ-0012 ' } },
    ])
    expect(parete[0].lavoro?.pazienteAlias).toBeNull()
  })

  it('pazienti null → paziente "—", alias null', () => {
    const { parete } = deriveParete(cassette, vive, [{ ...lavoroBase, pazienti: null }])
    expect(parete[0].lavoro?.paziente).toBe('—')
    expect(parete[0].lavoro?.pazienteAlias).toBeNull()
  })
})

// Task 5 (§2.5, punto 13) — `derivaAlias` era privata al Task 1 (usata solo dentro
// `deriveParete`, sopra). La route `GET /api/cassette/lavori-liberi` la vuole per proiettare
// `pazienteAlias` sui lavori senza cassetta — STESSA logica, non una riscritta: da qui
// l'esportazione. Test minimo di import + comportamento (già coperto indirettamente sopra
// via `deriveParete`, ma questo prova che la funzione è raggiungibile ed è la STESSA usata lì).
// Review finale whole-branch — tolto `expect(typeof derivaAlias).toBe('function')`: se non lo
// fosse, a cadere sarebbe già l'import in testa a questo file (e prima ancora `tsc`). I tre
// casi sotto provano l'export molto meglio, usandolo.
describe('derivaAlias (esportata, Task 5 §2.5)', () => {
  it('alias presente, diverso dal codice → ritorna il nome normalizzato (trim)', () => {
    expect(derivaAlias({ codice_paziente: 'PZ-0012', nome_cognome: 'ROSSI MARIO ' })).toBe('ROSSI MARIO')
  })

  it('nome_cognome coincide col codice (case-insensitive) → null', () => {
    expect(derivaAlias({ codice_paziente: 'pz-0012', nome_cognome: 'PZ-0012 ' })).toBeNull()
  })

  it('pazienti null → null', () => {
    expect(derivaAlias(null)).toBeNull()
  })
})

describe('targheInCollisione (spec §2.3, riserva UX 4)', () => {
  const c = (id: string, pos: number) => ({ id, nome: id.toUpperCase(), colore: 'rossa', posizione: pos, created_at: '2026-01-01' })
  const l = (id: string, dentista: string, cod: string, alias: string | null) => ({
    id, numero_lavoro: id, stato: 'in_lavorazione', deleted_at: null, descrizione: null,
    tipo_dispositivo: null, clienti: { studio_nome: dentista, nome: null, cognome: null },
    pazienti: { codice_paziente: cod, nome_cognome: alias ?? `${cod} ` },
  })

  it('due cassette stesso dentista+paziente → entrambe in collisione', () => {
    const { parete } = deriveParete(
      [c('c1', 1), c('c2', 2)],
      [{ cassetta_id: 'c1', lavoro_id: 'l1' }, { cassetta_id: 'c2', lavoro_id: 'l2' }],
      [l('l1', 'Studio Esposito', 'PZ-1', 'ROSSI MARIO'), l('l2', 'Studio Esposito', 'PZ-1', 'ROSSI MARIO')],
    )
    expect(targheInCollisione(parete)).toEqual(new Set(['c1', 'c2']))
  })

  it('dentisti diversi → nessuna collisione; le libere non contano mai', () => {
    const { parete } = deriveParete(
      [c('c1', 1), c('c2', 2), c('c3', 3)],
      [{ cassetta_id: 'c1', lavoro_id: 'l1' }, { cassetta_id: 'c2', lavoro_id: 'l2' }],
      [l('l1', 'Studio Esposito', 'PZ-1', 'ROSSI MARIO'), l('l2', 'Studio Bruno', 'PZ-1', 'ROSSI MARIO')],
    )
    expect(targheInCollisione(parete).size).toBe(0)
  })
})
