// tests/unit/avvisi-archivio.test.ts
//
// Task 9 dell'ondata «l'avviso al dentista» — LA PRESENTAZIONE dell'archivio
// nella scheda del cliente (`src/lib/avvisi/archivio.ts`).
//
// 🔑 IL CANCELLO DI RUOLO (⚖️ D352) NON STA QUI: sta in `archivioPerSchedaCliente`
//    (`src/lib/avvisi/queries.ts`), provato in `avvisi-queries.test.ts`. Qui si
//    prova la TRADUZIONE delle righe grezze di `archivioCliente` in ciò che la
//    scheda mostra — quando · come · chi · vista/non vista — più la lettura di
//    supporto dei nomi, ammessa dal brief («col modello di casa»).
//
// 🛑 `clienti/[id]/page.tsx` È UN COMPONENTE SERVER ASINCRONO: nessuna prova
//    unitaria lo rende (stessa lezione del Task 6 su `lavori/[id]/page.tsx` e
//    del Task 8 su `portale/[token]/page.tsx`). Ogni riga con posta in gioco
//    normativa — ⚖️ D336 (mai un valore vecchio), D337 (niente allarme) — sta
//    in questo modulo, dove una prova la esercita davvero.

import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  nomiComunicatori,
  numeriLavoro,
  costruisciRigheArchivio,
  formattaQuando,
  etichettaVisto,
} from '@/lib/avvisi/archivio'
import type { AvvisoRiga } from '@/lib/avvisi/queries'

const LAB = '11111111-1111-1111-1111-111111111111'
const CLIENTE = '44444444-4444-4444-4444-444444444444'
const UTENTE_1 = '55555555-5555-5555-5555-555555555555'
const UTENTE_2 = '66666666-6666-6666-6666-666666666666'
const UTENTE_FANTASMA = '77777777-7777-7777-7777-777777777777'
const LAVORO_1 = '88888888-8888-8888-8888-888888888888'
const LAVORO_2 = '99999999-9999-9999-9999-999999999999'
const LAVORO_ORFANO = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

// ── Lo stesso idioma di spia di `avvisi-queries.test.ts`: il finto REGISTRA i
//    filtri invece di ignorarli — un finto che li ignora non può provare che
//    un utente di un altro laboratorio non entri nella mappa (lo daresti tu).
type Spia = {
  consultato: number
  tabella: string | null
  colonne: string | null
  filtri: Array<[string, unknown]>
}

function svcFinto(righe: Array<Record<string, unknown>>, guasto = false) {
  const spia: Spia = { consultato: 0, tabella: null, colonne: null, filtri: [] }

  const catena = {
    eq(colonna: string, valore: unknown) {
      spia.filtri.push([`eq:${colonna}`, valore])
      return catena
    },
    in(colonna: string, valore: unknown) {
      spia.filtri.push([`in:${colonna}`, valore])
      return catena
    },
    then(risolvi: (v: unknown) => unknown, rifiuta?: (e: unknown) => unknown) {
      const esito = guasto
        ? { data: null, error: { message: 'connessione caduta' } }
        : { data: righe, error: null }
      return Promise.resolve(esito).then(risolvi, rifiuta)
    },
  }

  const svc = {
    from(tabella: string) {
      spia.consultato++
      spia.tabella = tabella
      return {
        select(colonne: string) {
          spia.colonne = colonne
          return catena
        },
      }
    },
  }

  return { svc: svc as never, spia }
}

function riga(over: Partial<AvvisoRiga> = {}): AvvisoRiga {
  return {
    id: 'avv-1',
    lavoro_id: 'lav-1',
    cliente_id: CLIENTE,
    dichiarazione_id: 'ddc-1',
    stato: 'da_comunicare',
    campi_corretti: ['descrizione'],
    testo_inviato: null,
    comunicato_at: null,
    comunicato_da: null,
    visto_dal_dentista_at: null,
    created_at: '2026-08-09T10:00:00.000Z',
    ...over,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('formattaQuando — l’istante nelle parole del banco, SEMPRE Europe/Rome', () => {
  it('formatta data e ora esplicitamente nel fuso di Roma (non quello del processo)', () => {
    // 12:00 UTC d'agosto = 14:00 a Roma (CEST, UTC+2): se il fuso non fosse
    // esplicito, un processo che gira a UTC (Vercel) mostrerebbe le 12:00.
    expect(formattaQuando('2026-08-09T12:00:00.000Z')).toBe('9 agosto 2026, 14:00')
  })

  it('un istante vicino alla mezzanotte di Roma non torna al giorno sbagliato', () => {
    // 23:30 UTC del 9 agosto = 01:30 del 10 agosto a Roma.
    expect(formattaQuando('2026-08-09T23:30:00.000Z')).toBe('10 agosto 2026, 01:30')
  })

  it('`null` → `null`, non una stringa inventata', () => {
    expect(formattaQuando(null)).toBeNull()
  })

  it('una stringa che non è una data → `null`, non «Invalid Date» a schermo', () => {
    expect(formattaQuando('non-una-data')).toBeNull()
  })
})

describe('nomiComunicatori — la lettura di supporto per «chi» (ammessa dal brief, col modello di casa)', () => {
  it('chiede `id, nome, cognome` su `utenti`, filtrando per gli id E per il laboratorio', async () => {
    const { svc, spia } = svcFinto([{ id: UTENTE_1, nome: 'Mario', cognome: 'Rossi' }])
    await nomiComunicatori(svc, [UTENTE_1], LAB)

    expect(spia.tabella).toBe('utenti')
    expect(spia.colonne).toContain('id')
    expect(spia.colonne).toContain('nome')
    expect(spia.colonne).toContain('cognome')
    expect(spia.filtri).toEqual([
      ['in:id', [UTENTE_1]],
      ['eq:laboratorio_id', LAB],
    ])
  })

  it('id duplicati si chiedono una volta sola', async () => {
    const { svc, spia } = svcFinto([{ id: UTENTE_1, nome: 'Mario', cognome: 'Rossi' }])
    await nomiComunicatori(svc, [UTENTE_1, UTENTE_1, UTENTE_2, UTENTE_1], LAB)

    const [, idsChiesti] = spia.filtri.find(([c]) => c === 'in:id') as [string, string[]]
    expect(idsChiesti).toHaveLength(2)
    expect(new Set(idsChiesti)).toEqual(new Set([UTENTE_1, UTENTE_2]))
  })

  it('nessun id → nessuna lettura, e una mappa vuota (non un errore)', async () => {
    const { svc, spia } = svcFinto([])
    const mappa = await nomiComunicatori(svc, [], LAB)

    expect(spia.consultato, 'un elenco di id vuoto non deve interrogare il banco').toBe(0)
    expect(mappa.size).toBe(0)
  })

  it('🛑 NON filtra `deleted_at`: `comunicato_da` è FK NO ACTION apposta perché l’autore sopravviva (migration 20260809123206:48-54)', async () => {
    // Se questa lettura filtrasse `deleted_at IS NULL`, il nome di chi ha
    // lasciato il laboratorio sparirebbe dall'archivio — che è la prova ex
    // Art. 5(2) GDPR — proprio nel caso in cui la FK è stata scritta com'è
    // (NO ACTION, non SET NULL) perché quel nome restasse leggibile.
    const { svc, spia } = svcFinto([{ id: UTENTE_1, nome: 'Mario', cognome: 'Rossi' }])
    await nomiComunicatori(svc, [UTENTE_1], LAB)
    expect(spia.filtri.some(([c]) => c === 'eq:deleted_at' || c === 'is:deleted_at')).toBe(false)
  })

  it('costruisce la mappa id → "Nome Cognome"', async () => {
    const { svc } = svcFinto([
      { id: UTENTE_1, nome: 'Mario', cognome: 'Rossi' },
      { id: UTENTE_2, nome: 'Anna', cognome: 'Verdi' },
    ])
    const mappa = await nomiComunicatori(svc, [UTENTE_1, UTENTE_2], LAB)

    expect(mappa.get(UTENTE_1)).toBe('Mario Rossi')
    expect(mappa.get(UTENTE_2)).toBe('Anna Verdi')
  })

  it('se il banco non risponde: mappa vuota, e il guasto scritto nei log (il silenzio non è muto)', async () => {
    const spiaLog = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { svc } = svcFinto([], true)

    const mappa = await nomiComunicatori(svc, [UTENTE_1], LAB)
    expect(mappa.size).toBe(0)
    expect(spiaLog).toHaveBeenCalled()
  })
})

// ⚖️ D356 (tornata 154, chiude M-T9-2) — la lettura di supporto per il NUMERO
// del lavoro, «sul modello di `nomiComunicatori`» (brief §1): stessa forma —
// batch per id, dedup, filtro laboratorio, log + ripiego mai un crash. Legge
// `lavori`, non `avvisi_dentista` (il vincolo «nessuna query nuova sulla
// tabella avvisi» resta intatto).
describe('numeriLavoro — la lettura di supporto per il NUMERO del lavoro (⚖️ D356, ammessa dal brief)', () => {
  it('chiede `id, numero_lavoro` su `lavori`, filtrando per gli id E per il laboratorio', async () => {
    const { svc, spia } = svcFinto([{ id: LAVORO_1, numero_lavoro: 'STOR/2021/016' }])
    await numeriLavoro(svc, [LAVORO_1], LAB)

    expect(spia.tabella).toBe('lavori')
    expect(spia.colonne).toContain('id')
    expect(spia.colonne).toContain('numero_lavoro')
    expect(spia.filtri).toEqual([
      ['in:id', [LAVORO_1]],
      ['eq:laboratorio_id', LAB],
    ])
  })

  it('id duplicati si chiedono una volta sola', async () => {
    const { svc, spia } = svcFinto([{ id: LAVORO_1, numero_lavoro: 'STOR/2021/016' }])
    await numeriLavoro(svc, [LAVORO_1, LAVORO_1, LAVORO_2, LAVORO_1], LAB)

    const [, idsChiesti] = spia.filtri.find(([c]) => c === 'in:id') as [string, string[]]
    expect(idsChiesti).toHaveLength(2)
    expect(new Set(idsChiesti)).toEqual(new Set([LAVORO_1, LAVORO_2]))
  })

  it('nessun id → nessuna lettura, e una mappa vuota (non un errore)', async () => {
    const { svc, spia } = svcFinto([])
    const mappa = await numeriLavoro(svc, [], LAB)

    expect(spia.consultato, 'un elenco di id vuoto non deve interrogare il banco').toBe(0)
    expect(mappa.size).toBe(0)
  })

  it('costruisce la mappa lavoro_id → numero_lavoro', async () => {
    const { svc } = svcFinto([
      { id: LAVORO_1, numero_lavoro: 'STOR/2021/016' },
      { id: LAVORO_2, numero_lavoro: '2026/0042' },
    ])
    const mappa = await numeriLavoro(svc, [LAVORO_1, LAVORO_2], LAB)

    expect(mappa.get(LAVORO_1)).toBe('STOR/2021/016')
    expect(mappa.get(LAVORO_2)).toBe('2026/0042')
  })

  it('se il banco non risponde: mappa vuota, e il guasto scritto nei log (mai un crash)', async () => {
    const spiaLog = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { svc } = svcFinto([], true)

    const mappa = await numeriLavoro(svc, [LAVORO_1], LAB)
    expect(mappa.size).toBe(0)
    expect(spiaLog).toHaveBeenCalled()
  })
})

describe('costruisciRigheArchivio — quando · come · chi · vista/non vista (⚖️ D336 · D337)', () => {
  it('⑤ due comunicazioni CHIUSE (una dall’app con testo, una a voce): quando · come · chi · vista/non vista', () => {
    const righe: AvvisoRiga[] = [
      riga({
        id: 'avv-app',
        stato: 'comunicato_dall_app',
        testo_inviato: 'La dichiarazione è stata rifatta.',
        comunicato_at: '2026-08-09T12:00:00.000Z',
        comunicato_da: UTENTE_1,
        visto_dal_dentista_at: '2026-08-09T13:00:00.000Z',
        campi_corretti: ['descrizione'],
      }),
      riga({
        id: 'avv-voce',
        stato: 'comunicato_a_voce',
        testo_inviato: null,
        comunicato_at: '2026-08-02T09:00:00.000Z',
        comunicato_da: UTENTE_2,
        visto_dal_dentista_at: null,
        campi_corretti: ['denti_coinvolti'],
      }),
    ]
    const nomi = new Map([
      [UTENTE_1, 'Mario Rossi'],
      [UTENTE_2, 'Anna Verdi'],
    ])

    const [dallApp, aVoce] = costruisciRigheArchivio(righe, nomi)

    expect(dallApp.chiuso).toBe(true)
    expect(dallApp.comeLabel).toBe('Dall’app, su WhatsApp')
    expect(dallApp.quando).toBe('9 agosto 2026, 14:00')
    expect(dallApp.chi).toBe('Mario Rossi')
    expect(dallApp.vistoLabel).toBe('9 agosto 2026, 15:00')
    expect(dallApp.campiDescritti).toEqual(['la descrizione'])

    expect(aVoce.chiuso).toBe(true)
    expect(aVoce.comeLabel).toBe('A voce')
    expect(aVoce.quando).toBe('2 agosto 2026, 11:00')
    expect(aVoce.chi).toBe('Anna Verdi')
    expect(aVoce.vistoLabel).toBeNull() // non ancora vista dal dentista
    expect(aVoce.campiDescritti).toEqual(['i denti indicati'])
  })

  it('⑥ una riga ANCORA `da_comunicare` si mostra per quello che è, senza segnale d’allarme', () => {
    const [esito] = costruisciRigheArchivio([riga({ stato: 'da_comunicare' })], new Map())

    expect(esito.chiuso).toBe(false)
    expect(esito.quando).toBeNull() // comunicato_at è NULL finché resta aperta (CHECK)
    expect(esito.chi).toBeNull() // comunicato_da è NULL finché resta aperta (CHECK)
    // 🛑 D337 — LA FORMA NEUTRA: nessuna parola d'urgenza («urgente», punti
    //    esclamativi, «ATTENZIONE»...) nell'etichetta. È la pagina a decidere
    //    lo STILE (nessun rosso, nessun badge); questa funzione garantisce che
    //    il DATO in sé non porti già un giudizio.
    expect(esito.comeLabel).toBe('Da comunicare')
    expect(esito.comeLabel).not.toMatch(/urgent|attenzione|!|⚠/i)
  })

  it('⑦ archivio vuoto → nessuna riga, e non è un errore', () => {
    expect(costruisciRigheArchivio([], new Map())).toEqual([])
  })

  it('⑧ ⚖️ D336 — i campi si descrivono coi NOMI (`descriviCampiCorretti`), MAI con la chiave tecnica grezza', () => {
    const [esito] = costruisciRigheArchivio(
      [riga({ campi_corretti: ['descrizione', 'denti_coinvolti'] })],
      new Map()
    )
    // 🛑 Non 'descrizione'/'denti_coinvolti' (le chiavi tecniche): le
    //    descrizioni in italiano, come le rende `descriviCampiCorretti` — che
    //    per firma non riceve mai un valore, quindi non può mostrarlo.
    expect(esito.campiDescritti).toEqual(['la descrizione', 'i denti indicati'])
    expect(esito.campiDescritti).not.toContain('descrizione')
    expect(esito.campiDescritti).not.toContain('denti_coinvolti')
  })

  it('«chi» sconosciuto (id non risolto dalla mappa) → un ripiego dichiarato, mai un buco silenzioso', () => {
    const [esito] = costruisciRigheArchivio(
      [
        riga({
          stato: 'comunicato_a_voce',
          comunicato_at: '2026-08-09T12:00:00.000Z',
          comunicato_da: UTENTE_FANTASMA,
        }),
      ],
      new Map() // UTENTE_FANTASMA non c'è
    )
    expect(esito.chi).not.toBeNull()
    expect(esito.chi).not.toBe('')
    expect(typeof esito.chi).toBe('string')
  })

  it('uno stato fuori dal vocabolario (difensivo — non dovrebbe esistere, CHECK vivo) non fa sparire la riga, e lo dice nei log', () => {
    const spiaLog = vi.spyOn(console, 'error').mockImplementation(() => {})
    const [esito] = costruisciRigheArchivio([riga({ stato: 'stato-inventato' })], new Map())

    expect(esito).toBeDefined()
    expect(esito.chiuso).toBe(false)
    expect(spiaLog).toHaveBeenCalled()
  })

  // ⚖️ D356 (chiude M-T9-2) — il terzo parametro, `numeri`, opzionale (le
  // chiamate di sopra restano valide senza toccarle): la mappa lavoro_id →
  // numero_lavoro costruita da `numeriLavoro`.
  it('⚖️ D356 — con la mappa dei numeri, ogni riga porta il NUMERO del proprio lavoro', () => {
    const righe: AvvisoRiga[] = [
      riga({ id: 'avv-1', lavoro_id: LAVORO_1 }),
      riga({ id: 'avv-2', lavoro_id: LAVORO_2 }),
    ]
    const numeri = new Map([
      [LAVORO_1, 'STOR/2021/016'],
      [LAVORO_2, '2026/0042'],
    ])

    const [prima, seconda] = costruisciRigheArchivio(righe, new Map(), numeri)

    expect(prima.numeroLavoro).toBe('STOR/2021/016')
    expect(seconda.numeroLavoro).toBe('2026/0042')
  })

  it('⚖️ D356 — lavoro non risolto dalla mappa (id orfano/lettura fallita): la riga porta `numeroLavoro: null`, mai un crash', () => {
    const [esito] = costruisciRigheArchivio(
      [riga({ lavoro_id: LAVORO_ORFANO })],
      new Map(),
      new Map() // LAVORO_ORFANO non c'è
    )
    expect(() => esito.numeroLavoro).not.toThrow()
    expect(esito.numeroLavoro).toBeNull()
  })

  it('⚖️ D356 — senza terzo argomento (chiamate esistenti, non toccate): `numeroLavoro` è `null`, non `undefined`', () => {
    const [esito] = costruisciRigheArchivio([riga()], new Map())
    expect(esito.numeroLavoro).toBeNull()
  })
})

// ⚖️ D357 (tornata 154, chiude M-T9-3) — la parola per la riga «vista/non
// vista», nelle TRE forme che può assumere. Estratta in una funzione pura
// perché `clienti/[id]/page.tsx` è un componente SERVER asincrono e nessuna
// prova unitaria lo rende (nota in testa a questo file, già vera per
// `costruisciRigheArchivio`): la logica con posta in gioco normativa vive
// dove una prova la esercita davvero, non nel JSX del render.
describe('etichettaVisto — la riga «vista/non vista», nelle sue TRE forme (⚖️ D357 · D337 regge)', () => {
  it('riga ANCORA APERTA (chiuso: false) → «Non ancora comunicata»', () => {
    expect(etichettaVisto({ chiuso: false, vistoLabel: null })).toBe('Non ancora comunicata')
  })

  it('riga CHIUSA ma non vista (chiuso: true, vistoLabel: null) → «Non ancora vista dal dentista»', () => {
    expect(etichettaVisto({ chiuso: true, vistoLabel: null })).toBe('Non ancora vista dal dentista')
  })

  it('riga VISTA → la data di visione, come oggi', () => {
    expect(etichettaVisto({ chiuso: true, vistoLabel: '9 agosto 2026, 14:00' })).toBe(
      'Vista dal dentista il 9 agosto 2026, 14:00'
    )
  })

  // 🔴 LA COMBINAZIONE NON È TEORICA: il portale marca `visto_dal_dentista_at`
  //    su TUTTI gli id del gruppo di un lavoro (`portale/[token]/page.tsx:495-496`),
  //    e quel gruppo unisce avvisi aperti E chiusi dello stesso lavoro
  //    (⚖️ D354, `raggruppaPerLavoro`; `archivioCliente` non filtra per
  //    `stato`, `queries.ts:346-358`) — quindi una riga ancora `da_comunicare`
  //    PUÒ arrivare con `vistoLabel` valorizzato. `chiuso` vince SEMPRE:
  //    dire «vista» di una correzione mai comunicata sarebbe peggio del
  //    difetto che D357 chiude.
  it('🔴 riga ANCORA APERTA MA con `vistoLabel` valorizzato (raggiungibile via il portale, D354) → resta «Non ancora comunicata»', () => {
    expect(etichettaVisto({ chiuso: false, vistoLabel: '9 agosto 2026, 14:00' })).toBe(
      'Non ancora comunicata'
    )
  })

  // 🛑 D337 — nessuna delle tre parole porta un segnale d'allarme: qui si
  //    prova il DATO, non lo stile (quello resta nel JSX, senza cambi).
  it('⚖️ D337 regge — nessuna forma porta una parola d’urgenza', () => {
    const forme = [
      etichettaVisto({ chiuso: false, vistoLabel: null }),
      etichettaVisto({ chiuso: true, vistoLabel: null }),
      etichettaVisto({ chiuso: true, vistoLabel: '9 agosto 2026, 14:00' }),
      etichettaVisto({ chiuso: false, vistoLabel: '9 agosto 2026, 14:00' }),
    ]
    for (const f of forme) expect(f).not.toMatch(/urgent|attenzione|!|⚠/i)
  })
})
