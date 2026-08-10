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
import { nomiComunicatori, costruisciRigheArchivio, formattaQuando } from '@/lib/avvisi/archivio'
import type { AvvisoRiga } from '@/lib/avvisi/queries'

const LAB = '11111111-1111-1111-1111-111111111111'
const CLIENTE = '44444444-4444-4444-4444-444444444444'
const UTENTE_1 = '55555555-5555-5555-5555-555555555555'
const UTENTE_2 = '66666666-6666-6666-6666-666666666666'
const UTENTE_FANTASMA = '77777777-7777-7777-7777-777777777777'

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
})
