// Task 8 — la scheda cliente mostra NUMERO e DATA dell'ultima emissione del DPA,
// e la riga sotto il tasto può finalmente promettere la conservazione.
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

const CLIENTE = {
  id: CLIENTE_ID,
  studio_nome: 'Studio Rossi',
  nome: 'Mario',
  cognome: 'Rossi',
  telefono: null,
  email: null,
  partita_iva: '01234567890',
  codice_fiscale: null,
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

/** L'istante che separa il fuso di Roma da quello della macchina: le 00:30 del
 *  giorno 11 a Roma sono ancora il giorno 10 a Greenwich. È il caso vero del
 *  difetto già pagato in questa stessa ondata (`DpaTemplate.tsx:95-108`). */
const EMESSO_AT_NOTTE = '2026-03-10T23:30:00Z'

let catenaDpa: MockChain | null = null

/** La catena resa da `from()`, scelta per TABELLA e mai per posizione. */
function preparaClient(risultatoDpa: { data: unknown; error: unknown }) {
  catenaDpa = null
  mockFrom.mockImplementation((tabella: string) => {
    if (tabella === 'clienti') return createChain({ data: CLIENTE, error: null })
    if (tabella === 'data_processing_agreements') {
      catenaDpa = createChain(risultatoDpa)
      return catenaDpa
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

/** Il testo che un lettore vedrebbe, concatenato. */
function testo(nodo: unknown): string {
  if (nodo == null || typeof nodo === 'boolean') return ''
  if (typeof nodo === 'string' || typeof nodo === 'number') return String(nodo)
  if (Array.isArray(nodo)) return nodo.map(testo).join('')
  if (typeof nodo === 'object' && 'props' in nodo) {
    return testo((nodo as ReactElement<{ children?: unknown }>).props?.children)
  }
  return ''
}

/** Il tasto «Scarica DPA PDF»: l'unica `<a>` che punta alla rotta del DPA. */
function tastoScarica(albero: ReactElement): ReactElement<{ href?: string; download?: string }> {
  const trovate = [...percorri(albero)].filter(
    (el) => el.type === 'a' && typeof (el.props as { href?: string }).href === 'string'
      && (el.props as { href: string }).href.includes('/dpa')
  )
  if (trovate.length !== 1) throw new Error(`Attesa UNA sola <a> verso il DPA, trovate ${trovate.length}`)
  return trovate[0] as ReactElement<{ href?: string; download?: string }>
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

  it('nessuna emissione (il caso VERO del primo collaudo: la tabella è vuota) → nessuna riga, e la pagina resta intera', async () => {
    preparaClient({ data: null, error: null })
    const t = testo(await rendiPagina())

    expect(t).not.toContain('Ultima emissione')
    expect(t).toContain('Scarica DPA PDF')
  })

  it("registro non leggibile → il guasto finisce nei LOG, non si spaccia per «mai emesso», e la scheda resta in piedi", async () => {
    const spia = vi.spyOn(console, 'error').mockImplementation(() => {})
    preparaClient({ data: null, error: { message: 'connection reset' } })

    const t = testo(await rendiPagina())

    expect(t).not.toContain('Ultima emissione')
    expect(t).toContain('Scarica DPA PDF')
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
  it("l'attributo `download` NON c'è più: il nome del file lo decide la ROTTA (Content-Disposition)", async () => {
    const a = tastoScarica(await rendiPagina())

    expect(a.props.href).toBe(`/api/clienti/${CLIENTE_ID}/dpa`)
    expect(a.props.download).toBeUndefined()
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
