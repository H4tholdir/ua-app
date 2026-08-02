// Task 8 — la scheda cliente mostra NUMERO e DATA dell'ultima emissione del DPA,
// e la riga sotto il tasto può finalmente promettere la conservazione.
//
// 🔄 ESTESO il 02/08/2026 dal Task 4 di P17. Questo file NON era nell'elenco dei
//    file del Task 4, ed è lo stesso difetto di censimento (R-P2/R-P6) già
//    pagato al Task 1 con `tests/unit/dpa-route.test.ts`: è l'unica prova che
//    RENDE questa pagina, quindi ogni cosa che il Task 4 le cambia passa di qui.
//    ⚠️ E l'autorevisione del piano diceva «in questo repo non ci sono prove di
//    componenti server»: questo file È una prova di un componente server, e
//    girava già prima di P17.
//
// 🛑 PERCHÉ QUESTE PROVE ESISTONO, quando la FASE 9 guarda la pagina nel browser:
//    il collaudo nel browser gira su una macchina **a Roma**, dove la formattazione
//    SENZA fuso dichiarato dà lo stesso identico risultato di quella corretta.
//    Il difetto della data — il documento emesso alle 00:30 di Roma che si mostra
//    col giorno PRIMA, perché in produzione il server gira a Greenwich — è
//    INVISIBILE a occhio da qui. Queste prove sono l'unico strumento che lo vede.
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import type { ReactElement } from 'react'
import { createChain, type MockChain } from './helpers/supabase-chain-mock'
import { ScaricaDpaButton } from '@/components/features/clienti/ScaricaDpaButton'
import { BloccoAvviso } from '@/components/feedback/BloccoAvviso'

const { mockGetLabContext, mockNotFound, mockFrom } = vi.hoisted(() => ({
  mockGetLabContext: vi.fn(),
  mockNotFound: vi.fn(() => {
    throw new Error('NOT_FOUND')
  }),
  mockFrom: vi.fn(),
}))

vi.mock('next/navigation', () => ({ notFound: mockNotFound }))
vi.mock('@/lib/supabase/lab-context', () => ({ getLabContext: mockGetLabContext }))
vi.mock('@/lib/supabase/server-service', () => ({ getServiceClient: () => ({ from: mockFrom }) }))

import ClienteDettaglioPage from '@/app/(app)/clienti/[id]/page'

const LAB_ID = 'lab-0001'
const CLIENTE_ID = 'cli-0001'

const CONTESTO = {
  userId: 'u-1',
  email: 'titolare@lab.it',
  ruolo: 'titolare',
  laboratorioId: LAB_ID,
  nome: 'Anna',
  cognome: 'Bianchi',
  lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Uno' },
}

/** I due dati fiscali, nella forma VERA dello schema: entrambi possono essere
 *  nulli, ed è tutta la ragione per cui il predicato è `&&`. Dichiarati a parte
 *  perché senza l'annotazione TypeScript inferirebbe il TIPO DEL CAMPIONE
 *  (`partita_iva: string`, `codice_fiscale: null`) e i casi che li invertono
 *  non compilerebbero. */
type Fiscali = { partita_iva: string | null; codice_fiscale: string | null }

const CLIENTE = {
  id: CLIENTE_ID,
  studio_nome: 'Studio Rossi',
  nome: 'Mario',
  cognome: 'Rossi',
  telefono: null,
  email: null,
  partita_iva: '01234567890' as string | null,
  codice_fiscale: null as string | null,
  codice_sdi: null,
  pec: null,
  indirizzo: null,
  cap: null,
  citta: null,
  provincia: null,
  paese: 'IT',
  listino_numero: 1,
  sconto_percentuale: 0,
  modalita_pagamento: null,
  non_soggetto_fe: false,
  portale_token: 'tok-1',
  portale_fatturazione_attiva: false,
  portale_pin_hash: null,
  note: null,
}

/** Il laboratorio «a posto»: ha la Partita IVA. Il Codice Fiscale resta `null`
 *  DI PROPOSITO — è il caso che smaschera un `||` scritto al posto di un `&&`. */
const LAB_COMPLETO: Fiscali = { partita_iva: '99988877766', codice_fiscale: null }

/** L'istante che separa il fuso di Roma da quello della macchina: le 00:30 del
 *  giorno 11 a Roma sono ancora il giorno 10 a Greenwich. È il caso vero del
 *  difetto già pagato in questa stessa ondata (`DpaTemplate.tsx:95-108`). */
const EMESSO_AT_NOTTE = '2026-03-10T23:30:00Z'

type Risultato = { data: unknown; error: unknown }

let catenaDpa: MockChain | null = null
let catenaLab: MockChain | null = null
/** L'ordine in cui le tabelle sono state chieste: serve alla prova A2. */
let tabelleChieste: string[] = []

/** La catena resa da `from()`, scelta per TABELLA e mai per posizione. */
function preparaClient(
  risultatoDpa: Risultato,
  opzioni: {
    lab?: Risultato
    cliente?: Partial<typeof CLIENTE>
    /** Ritarda la risoluzione della lettura del registro, per la prova A2. */
    ritardaDpa?: boolean
  } = {},
) {
  catenaDpa = null
  catenaLab = null
  tabelleChieste = []
  const risultatoLab: Risultato = opzioni.lab ?? { data: LAB_COMPLETO, error: null }
  mockFrom.mockImplementation((tabella: string) => {
    tabelleChieste.push(tabella)
    if (tabella === 'clienti') return createChain({ data: { ...CLIENTE, ...opzioni.cliente }, error: null })
    if (tabella === 'data_processing_agreements') {
      catenaDpa = createChain(risultatoDpa)
      if (opzioni.ritardaDpa) {
        const vero = catenaDpa.maybeSingle as (...a: unknown[]) => Promise<Risultato>
        catenaDpa.maybeSingle = async (...a: unknown[]) => {
          await new Promise((r) => setTimeout(r, 0))
          return vero(...a)
        }
      }
      return catenaDpa
    }
    if (tabella === 'laboratori') {
      catenaLab = createChain(risultatoLab)
      return catenaLab
    }
    throw new Error(`Mock scheda cliente: tabella inattesa «${tabella}»`)
  })
}

function rendiPagina() {
  return ClienteDettaglioPage({ params: Promise.resolve({ id: CLIENTE_ID }) }) as Promise<ReactElement>
}

/** Tutti gli elementi dell'albero reso, in profondità.
 *  🔑 `SectionCard` non viene MAI eseguito (nessun renderer gira qui): i suoi
 *  figli vivono in `props.children`, e da lì il cammino li raggiunge lo stesso. */
function* percorri(nodo: unknown): Generator<ReactElement> {
  if (Array.isArray(nodo)) {
    for (const figlio of nodo) yield* percorri(figlio)
    return
  }
  if (nodo && typeof nodo === 'object' && 'props' in nodo) {
    const el = nodo as ReactElement<{ children?: unknown }>
    yield el
    yield* percorri(el.props?.children)
  }
}

/** Il testo che un lettore vedrebbe, concatenato.
 *  ⚠️ Vede SOLO i nodi nativi: un componente (`ScaricaDpaButton`, `BloccoAvviso`)
 *  qui non viene eseguito, quindi il suo testo NON entra in questa stringa. Per
 *  quelli si guardano le props, con gli aiuti qui sotto. */
function testo(nodo: unknown): string {
  if (nodo == null || typeof nodo === 'boolean') return ''
  if (typeof nodo === 'string' || typeof nodo === 'number') return String(nodo)
  if (Array.isArray(nodo)) return nodo.map(testo).join('')
  if (typeof nodo === 'object' && 'props' in nodo) {
    return testo((nodo as ReactElement<{ children?: unknown }>).props?.children)
  }
  return ''
}

type PropsTasto = { clienteId: string; mancanza: 'laboratorio' | 'cliente' | null }

/** Il tasto vivo, se la pagina l'ha montato. `null` quando il ruolo non emette. */
function tasto(albero: ReactElement): PropsTasto | null {
  const trovati = [...percorri(albero)].filter((el) => el.type === ScaricaDpaButton)
  if (trovati.length > 1) throw new Error(`Atteso UN solo ScaricaDpaButton, trovati ${trovati.length}`)
  return trovati.length === 1 ? (trovati[0].props as PropsTasto) : null
}

/** I blocchi d'avviso montati DALLA PAGINA (quelli del tasto non si vedono qui). */
function avvisi(albero: ReactElement): { tipo: string; titolo: string; testo: string; azione?: unknown }[] {
  return [...percorri(albero)]
    .filter((el) => el.type === BloccoAvviso)
    .map((el) => el.props as { tipo: string; titolo: string; testo: string; azione?: unknown })
}

/** Le `<a>` nude che puntano alla rotta del DPA: devono essere ZERO. */
function ancoreDpa(albero: ReactElement): ReactElement[] {
  return [...percorri(albero)].filter(
    (el) => el.type === 'a' && typeof (el.props as { href?: string }).href === 'string'
      && (el.props as { href: string }).href.includes('/dpa')
  )
}

let TZ_ORIGINALE: string | undefined

beforeAll(() => {
  // 🛑 SENZA QUESTO LA PROVA SULLA DATA È INUTILE: su una macchina già a Roma
  //    il codice sbagliato e quello giusto danno la STESSA risposta, e
  //    l'asserzione resterebbe verde per la ragione sbagliata — la stessa
  //    trappola di `UA_LAB_GUARD_MODE` trovata al Task 7.
  TZ_ORIGINALE = process.env.TZ
  process.env.TZ = 'UTC'
})

afterAll(() => {
  if (TZ_ORIGINALE === undefined) delete process.env.TZ
  else process.env.TZ = TZ_ORIGINALE
})

beforeEach(() => {
  vi.clearAllMocks()
  mockGetLabContext.mockResolvedValue(CONTESTO)
  preparaClient({ data: null, error: null })
})

describe('scheda cliente — ultima emissione del DPA', () => {
  it('emissione presente → mostra NUMERO e data, e la data è quella di ROMA (non quella della macchina)', async () => {
    // 🛑 Guardia fail-closed sull'ambiente: se l'assegnazione di `process.env.TZ`
    //    non ha morso, questa prova non può distinguere Roma da Greenwich e
    //    sarebbe verde comunque. Meglio rossa che bugiarda.
    expect(new Date(EMESSO_AT_NOTTE).toLocaleDateString('en-CA')).toBe('2026-03-10')

    preparaClient({ data: { numero_dpa: 'DPA-2026-0007', emesso_at: EMESSO_AT_NOTTE }, error: null })
    const t = testo(await rendiPagina())

    expect(t).toContain('Ultima emissione:')
    expect(t).toContain('DPA-2026-0007')
    expect(t).toContain('11 marzo 2026')
    expect(t).not.toContain('10 marzo 2026')
  })

  it('nessuna emissione (il caso VERO del primo collaudo: la tabella è vuota) → lo DICE, e la pagina resta intera', async () => {
    preparaClient({ data: null, error: null })
    const albero = await rendiPagina()
    const t = testo(albero)

    expect(t).not.toContain('Ultima emissione')
    // 🔄 Prima qui non compariva NIENTE, ed era indistinguibile da un guasto di
    //    lettura. Adesso il caso ⑦b ha la sua riga.
    expect(t).toContain('Non ancora emesso per questo studio.')
    expect(tasto(albero)).not.toBeNull()
  })

  it("registro non leggibile → il guasto finisce nei LOG **e a schermo**, non si spaccia per «mai emesso»", async () => {
    const spia = vi.spyOn(console, 'error').mockImplementation(() => {})
    preparaClient({ data: null, error: { message: 'connection reset' } })

    const albero = await rendiPagina()
    const t = testo(albero)

    expect(t).not.toContain('Ultima emissione')
    // 🛑 IL PUNTO DI P17: «ho letto e non c'è» e «non sono riuscito a leggere»
    //    sono fatti OPPOSTI, e confonderli fa riemettere un contratto che esiste.
    expect(t).not.toContain('Non ancora emesso per questo studio.')
    expect(avvisi(albero).map((a) => a.titolo)).toContain('Non riesco a leggere il registro')
    expect(tasto(albero)).not.toBeNull()
    expect(spia).toHaveBeenCalled()
    expect(spia.mock.calls.flat().join(' ')).toContain('connection reset')
    spia.mockRestore()
  })

  it('riga senza `emesso_at` → nessuna riga a metà, e mai «Invalid Date» addosso al lettore', async () => {
    preparaClient({ data: { numero_dpa: 'DPA-2026-0007', emesso_at: null }, error: null })
    const t = testo(await rendiPagina())

    expect(t).not.toContain('Ultima emissione')
    expect(t).not.toContain('Invalid Date')
  })

  it('la lettura porta il filtro `laboratorio_id` ESPLICITO (il client di servizio aggira la RLS) e prende la più recente', async () => {
    preparaClient({ data: { numero_dpa: 'DPA-2026-0007', emesso_at: EMESSO_AT_NOTTE }, error: null })
    await rendiPagina()

    const chiamate = catenaDpa!.calls
    const eq = chiamate.filter((c) => c.method === 'eq').map((c) => c.args)
    expect(eq).toContainEqual(['laboratorio_id', LAB_ID])
    expect(eq).toContainEqual(['dentista_id', CLIENTE_ID])
    expect(chiamate.filter((c) => c.method === 'is').map((c) => c.args)).toContainEqual(['deleted_at', null])
    expect(chiamate.filter((c) => c.method === 'not').map((c) => c.args)).toContainEqual(['numero_dpa', 'is', null])
    expect(chiamate.filter((c) => c.method === 'order').map((c) => c.args)).toContainEqual([
      'emesso_at', { ascending: false },
    ])
    expect(chiamate.filter((c) => c.method === 'limit').map((c) => c.args)).toContainEqual([1])
  })
})

describe('scheda cliente — il tasto e la riga sotto il tasto', () => {
  it("il collegamento nudo verso la rotta NON c'è più: al suo posto c'è il tasto vivo", async () => {
    const albero = await rendiPagina()

    // 🛑 Una `<a href>` nuda era una NAVIGAZIONE: un errore della rotta finiva a
    //    schermo come `{"error":"…"}`. Se qualcuno la rimettesse, questa si accende.
    expect(ancoreDpa(albero)).toHaveLength(0)
    expect(tasto(albero)).toEqual({ clienteId: CLIENTE_ID, mancanza: null })
  })

  it('la riga sotto il tasto promette la conservazione — e adesso è vera, perché il registro esiste', async () => {
    const t = testo(await rendiPagina())

    expect(t).toContain('Ogni versione emessa resta conservata da UÀ')
  })

  it('la riga NON rimette la conservazione «per 10 anni»: quel termine è della DdC, non del DPA (D125)', async () => {
    const t = testo(await rendiPagina())

    expect(t).not.toContain('10 anni')
    expect(t).not.toContain('dieci anni')
  })
})

// ── La prevenzione: il predicato è `&&`, e ne basta UNO dei due ──────────────
// 🔑 Queste prove esistono per un solo motivo: un `||` al posto di un `&&`
//    spegnerebbe il tasto su dentisti che emetterebbero benissimo, e a occhio
//    non si vede — il caso «solo Partita IVA» resta verde con tutti e due.
//    Il valore che DEVE essere rifiutato è quindi «ha solo UNO dei due» (R-P1).
describe('scheda cliente — la prevenzione dello scarico che fallirebbe', () => {
  it.each<[string, Fiscali]>([
    ['solo la Partita IVA', { partita_iva: '01234567890', codice_fiscale: null }],
    ['solo il Codice Fiscale', { partita_iva: null, codice_fiscale: 'RSSMRA80A01H501U' }],
    ['tutti e due', { partita_iva: '01234567890', codice_fiscale: 'RSSMRA80A01H501U' }],
  ])('cliente con %s → il tasto è ATTIVO (con `||` sarebbe spento)', async (_nome, fiscali) => {
    preparaClient({ data: null, error: null }, { cliente: fiscali })

    expect(tasto(await rendiPagina())).toEqual({ clienteId: CLIENTE_ID, mancanza: null })
  })

  it('cliente senza NESSUNO dei due → il tasto nasce inerte, e dice di chi manca il dato', async () => {
    preparaClient({ data: null, error: null }, { cliente: { partita_iva: null, codice_fiscale: null } })

    expect(tasto(await rendiPagina())?.mancanza).toBe('cliente')
  })

  it.each<[string, Fiscali]>([
    ['solo la Partita IVA', { partita_iva: '99988877766', codice_fiscale: null }],
    ['solo il Codice Fiscale', { partita_iva: null, codice_fiscale: '99988877766' }],
  ])('laboratorio con %s → il tasto è ATTIVO (con `||` sarebbe spento)', async (_nome, fiscali) => {
    preparaClient({ data: null, error: null }, { lab: { data: fiscali, error: null } })

    expect(tasto(await rendiPagina())?.mancanza).toBeNull()
  })

  it('laboratorio senza NESSUNO dei due → «laboratorio», e VINCE sul cliente (là si rimedia per tutti)', async () => {
    preparaClient(
      { data: null, error: null },
      {
        lab: { data: { partita_iva: null, codice_fiscale: null }, error: null },
        cliente: { partita_iva: null, codice_fiscale: null },
      },
    )

    expect(tasto(await rendiPagina())?.mancanza).toBe('laboratorio')
  })

  // 🛑 Lo stesso difetto che P17 ripara sul registro, un piano più giù: «non
  //    sono riuscito a leggere» NON è «il dato non c'è». Accusare il titolare di
  //    non avere la Partita IVA e mandarlo in /impostazioni, dove la troverebbe
  //    scritta, è peggio del lasciarlo premere: la rotta rifà il controllo lei.
  it('lettura del laboratorio FALLITA → il tasto resta attivo (la rotta decide) e il guasto va nei log', async () => {
    const spia = vi.spyOn(console, 'error').mockImplementation(() => {})
    preparaClient({ data: null, error: null }, { lab: { data: null, error: { message: 'timeout laboratori' } } })

    expect(tasto(await rendiPagina())?.mancanza).toBeNull()
    expect(spia.mock.calls.flat().join(' ')).toContain('timeout laboratori')
    spia.mockRestore()
  })

  it('la lettura del laboratorio è filtrata sull\'id del contesto', async () => {
    await rendiPagina()

    expect(catenaLab!.calls.filter((c) => c.method === 'eq').map((c) => c.args)).toContainEqual(['id', LAB_ID])
    expect(catenaLab!.calls.filter((c) => c.method === 'select').map((c) => c.args)).toContainEqual([
      'partita_iva, codice_fiscale',
    ])
  })

  // A2 — la lettura in più NON si mette in fila. È una pagina che si apre a
  // ogni scheda dentista: due andate e ritorni in sequenza si sommano.
  it('le due letture partono INSIEME, non una dopo l\'altra (A2)', async () => {
    preparaClient({ data: null, error: null }, { ritardaDpa: true })

    await rendiPagina()

    // 🔑 La prova: il registro risolve solo dopo un giro di macro-task. Se le due
    //    letture fossero in fila, `laboratori` sarebbe stata chiesta DOPO —
    //    invece è già nell'elenco prima che il registro risponda.
    const iRegistro = tabelleChieste.indexOf('data_processing_agreements')
    const iLab = tabelleChieste.indexOf('laboratori')
    expect(iRegistro).toBeGreaterThanOrEqual(0)
    expect(iLab).toBe(iRegistro + 1)
  })
})

// ── Il ruolo: cortesia visiva, NON un controllo di sicurezza ─────────────────
describe('scheda cliente — chi vede il tasto (D158/D160)', () => {
  it.each(['titolare', 'admin_rete', 'admin_sistema'])('%s vede il tasto', async (ruolo) => {
    mockGetLabContext.mockResolvedValue({ ...CONTESTO, ruolo })

    expect(tasto(await rendiPagina())).not.toBeNull()
  })

  it.each(['tecnico', 'front_desk'])('%s NON vede il tasto', async (ruolo) => {
    mockGetLabContext.mockResolvedValue({ ...CONTESTO, ruolo })

    expect(tasto(await rendiPagina())).toBeNull()
  })

  it('a chi non emette resta TUTTO il resto: la riga dell\'ultima emissione c\'è lo stesso (D160)', async () => {
    mockGetLabContext.mockResolvedValue({ ...CONTESTO, ruolo: 'front_desk' })
    preparaClient({ data: { numero_dpa: 'DPA-2026-0007', emesso_at: EMESSO_AT_NOTTE }, error: null })

    const albero = await rendiPagina()

    expect(tasto(albero)).toBeNull()
    // Chi sta al banco deve poter rispondere allo studio al telefono.
    expect(testo(albero)).toContain('DPA-2026-0007')
    expect(testo(albero)).toContain('Ogni versione emessa resta conservata da UÀ')
  })
})
