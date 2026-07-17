import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { scegliSegnale, getSegnaleStriscia, fetchIngressiStriscia, type IngressiStriscia } from '@/lib/dashboard/striscia'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { PileHome } from '@/lib/dashboard/pile-home'

const VUOTO: IngressiStriscia = {
  fatturaScartata: null, materialeRosso: null, pagamentoScaduto: null, ddcOggi: 0,
  pile: { ritardoPiuGrave: null, consegnaOggiNonPronta: null, provaRientroOggi: null,
          arrivoVecchio: null, fermo: null, consegneOggiTotali: 0, prossimaOra: null },
}

const { mockGetMateriali, mockGetPagamenti } = vi.hoisted(() => ({
  mockGetMateriali: vi.fn(),
  mockGetPagamenti: vi.fn(),
}))
vi.mock('@/lib/dashboard/queries', () => ({
  getMaterialiEsaurimento: mockGetMateriali,
  getPagamentiScadutiTop: mockGetPagamenti,
}))

describe('scegliSegnale — gerarchia §6, una riga alla volta', () => {
  it('titolare: la fattura scartata vince su tutto (segnale 1)', () => {
    const s = scegliSegnale('titolare', { ...VUOTO,
      fatturaScartata: { id: 'f1', numero: '2026-0139' },
      pile: { ...VUOTO.pile, ritardoPiuGrave: { numero: '144', giorni: 1 } } })
    expect(s).toEqual({ attenzione: true, forte: 'Fattura n.2026-0139', testo: 'scartata',
      azione: { etichetta: 'Sistemala ›', href: '/fatture/f1' } })
  })

  it('front_desk: parte dagli operativi — il ritardo vince sulla fattura scartata (P7, §3.2)', () => {
    const s = scegliSegnale('front_desk', { ...VUOTO,
      fatturaScartata: { id: 'f1', numero: '2026-0139' },
      pile: { ...VUOTO.pile, ritardoPiuGrave: { numero: '144', giorni: 1 } } })
    expect(s.forte).toBe('n.144')
    expect(s.testo).toBe('doveva uscire ieri')
    expect(s.azione).toEqual({ etichetta: 'Apri ›', href: '/lavori?pila=rossa' })
  })

  it('tecnico: mai segnali fiscali/pagamenti/materiali (P7)', () => {
    const s = scegliSegnale('tecnico', { ...VUOTO,
      fatturaScartata: { id: 'f1', numero: '2026-0139' }, materialeRosso: 'Zirconia', pagamentoScaduto: 'Studio Verdi' })
    expect(s.attenzione).toBe(false) // cade sul segnale 9
  })

  it('segnale 2b: consegna di oggi non pronta', () => {
    const s = scegliSegnale('titolare', { ...VUOTO,
      pile: { ...VUOTO.pile, consegnaOggiNonPronta: { numero: '147', ora: '16:00' }, consegneOggiTotali: 1, prossimaOra: '16:00' } })
    expect(s).toEqual({ attenzione: true, forte: 'n.147',
      testo: 'non è ancora pronto per le 16:00', azione: { etichetta: 'Apri ›', href: '/lavori?pila=ambra' } })
  })

  it('segnali 3→8 in cascata quando i precedenti sono risolti', () => {
    const base = { ...VUOTO }
    expect(scegliSegnale('titolare', { ...base, pile: { ...base.pile, provaRientroOggi: '145' } }).testo).toBe('torna oggi dalla prova')
    expect(scegliSegnale('titolare', { ...base, pile: { ...base.pile, arrivoVecchio: '151' } }).testo).toBe('aspetta conferma da ieri')
    expect(scegliSegnale('titolare', { ...base, materialeRosso: 'Zirconia' })).toEqual({
      attenzione: true, forte: 'Zirconia', testo: 'sta per finire', azione: { etichetta: 'Riordina ›', href: '/magazzino' } })
    expect(scegliSegnale('titolare', { ...base, pile: { ...base.pile, fermo: { id: 'l150', numero: '150', giorni: 6 } } })).toEqual({
      attenzione: true, forte: 'n.150', testo: 'è fermo da 6 giorni', azione: { etichetta: 'Apri ›', href: '/lavori/l150' } })
    expect(scegliSegnale('titolare', { ...base, pagamentoScaduto: 'Studio Verdi' })).toEqual({
      attenzione: true, forte: 'Studio Verdi', testo: 'ha un pagamento scaduto', azione: { etichetta: 'Guarda ›', href: '/scadenzario' } })
    expect(scegliSegnale('titolare', { ...base, ddcOggi: 2 })).toEqual({
      attenzione: false, forte: null, testo: 'Oggi ho preparato 2 DdC ✓', azione: null })
  })

  it('segnale 6 sotto soglia (<5 giorni) NON scatta', () => {
    const s = scegliSegnale('titolare', { ...VUOTO, pile: { ...VUOTO.pile, fermo: { id: 'x', numero: '150', giorni: 4 } } })
    expect(s.attenzione).toBe(false)
  })

  it('segnale 9 — sereno, coi numeri del giorno', () => {
    expect(scegliSegnale('titolare', { ...VUOTO, pile: { ...VUOTO.pile, consegneOggiTotali: 2, prossimaOra: '16:00' } }))
      .toEqual({ attenzione: false, forte: 'Tutto a posto:', testo: '2 consegne oggi, la prossima alle 16:00', azione: null })
    expect(scegliSegnale('titolare', VUOTO).testo).toBe('nessuna consegna oggi')
  })
})

// --- fetchIngressiStriscia (Task 6: split 4 query in Promise.all) ---

type Deferred<T> = { promise: Promise<T>; resolve: (v: T) => void }
function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => { resolve = r })
  return { promise, resolve }
}

type FattureResult = { data: unknown; error: unknown }
type DdcResult = { count: number | null; error: unknown }

function makeSvc(opts: {
  fatture: () => Promise<FattureResult>
  ddc: () => Promise<DdcResult>
}): SupabaseClient {
  const chainFatture: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'in', 'order']) chainFatture[m] = () => chainFatture
  chainFatture.limit = () => opts.fatture()

  const chainDdc: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'neq']) chainDdc[m] = () => chainDdc
  chainDdc.gte = () => opts.ddc()

  return {
    from: (table: string) => {
      if (table === 'fatture') return chainFatture
      if (table === 'dichiarazioni_conformita') return chainDdc
      throw new Error(`tabella non attesa nel mock: ${table}`)
    },
  } as unknown as SupabaseClient
}

describe('fetchIngressiStriscia — 4 query in Promise.all, degrado per-ramo', () => {
  beforeEach(() => {
    mockGetMateriali.mockReset()
    mockGetPagamenti.mockReset()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('titolare: le 4 query partono in parallelo (Promise.all) e i risultati vengono composti', async () => {
    const fatture = deferred<FattureResult>()
    const ddc = deferred<DdcResult>()
    const materiali = deferred<Array<{ id: string; nome: string; scorta_attuale: number; scorta_minima: number; um_acquisto: string }>>()
    const pagamenti = deferred<Array<{ cliente_id: string; cliente_display: string; residuo: number; telefono: string | null; giorni_ritardo: number }>>()

    let fattureCalled = false
    let ddcCalled = false
    const svc = makeSvc({
      fatture: () => { fattureCalled = true; return fatture.promise },
      ddc: () => { ddcCalled = true; return ddc.promise },
    })
    mockGetMateriali.mockReturnValueOnce(materiali.promise)
    mockGetPagamenti.mockReturnValueOnce(pagamenti.promise)

    const risultato = fetchIngressiStriscia(svc, 'lab1', 'titolare')

    // Prima di risolvere QUALSIASI promise, tutte e 4 devono essere già
    // partite — prova che sono dentro Promise.all e non in await sequenziale
    // (se fossero sequenziali, le successive non partirebbero finché la
    // prima non si risolve).
    expect(fattureCalled).toBe(true)
    expect(ddcCalled).toBe(true)
    expect(mockGetMateriali).toHaveBeenCalledTimes(1)
    expect(mockGetPagamenti).toHaveBeenCalledTimes(1)

    fatture.resolve({ data: [{ id: 'f1', numero: '2026-0139' }], error: null })
    materiali.resolve([{ id: 'm1', nome: 'Zirconia', scorta_attuale: 1, scorta_minima: 5, um_acquisto: 'kg' }])
    pagamenti.resolve([{ cliente_id: 'c1', cliente_display: 'Studio Verdi', residuo: 100, telefono: null, giorni_ritardo: 10 }])
    ddc.resolve({ count: 3, error: null })

    const ingressi = await risultato
    expect(ingressi).toEqual({
      fatturaScartata: { id: 'f1', numero: '2026-0139' },
      materialeRosso: 'Zirconia',
      pagamentoScaduto: 'Studio Verdi',
      ddcOggi: 3,
    })
  })

  it('un fallimento degrada SOLO quel campo a null/0 — gli altri arrivano comunque (spy console.error)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const svc = makeSvc({
      fatture: () => Promise.reject(new Error('boom fatture')),
      ddc: () => Promise.resolve({ count: 2, error: null }),
    })
    mockGetMateriali.mockResolvedValueOnce([{ id: 'm1', nome: 'Zirconia', scorta_attuale: 1, scorta_minima: 5, um_acquisto: 'kg' }])
    mockGetPagamenti.mockResolvedValueOnce([{ cliente_id: 'c1', cliente_display: 'Studio Verdi', residuo: 50, telefono: null, giorni_ritardo: 5 }])

    const ingressi = await fetchIngressiStriscia(svc, 'lab1', 'titolare')

    expect(ingressi.fatturaScartata).toBeNull() // degradato — SOLO questo campo
    expect(ingressi.materialeRosso).toBe('Zirconia') // arrivato regolarmente
    expect(ingressi.pagamentoScaduto).toBe('Studio Verdi') // arrivato regolarmente
    expect(ingressi.ddcOggi).toBe(2) // arrivato regolarmente
    expect(spy).toHaveBeenCalledTimes(1) // SOLO quel segnale logga — nessun degrado a cascata
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('lettura fatturaScartata fallita — degrado a null:'),
      expect.any(Error)
    )
  })

  it('tecnico: le query fiscali/pagamenti NON vengono eseguite (solo ddcOggi gira)', async () => {
    let fattureCalled = false
    const svc = makeSvc({
      fatture: () => { fattureCalled = true; return Promise.resolve({ data: [], error: null }) },
      ddc: () => Promise.resolve({ count: 0, error: null }),
    })

    const ingressi = await fetchIngressiStriscia(svc, 'lab1', 'tecnico')

    expect(fattureCalled).toBe(false)
    expect(mockGetMateriali).not.toHaveBeenCalled()
    expect(mockGetPagamenti).not.toHaveBeenCalled()
    expect(ingressi).toEqual({ fatturaScartata: null, materialeRosso: null, pagamentoScaduto: null, ddcOggi: 0 })
  })

  it('getSegnaleStriscia resta wrapper compatibile: fetch + compose (altri consumer, es. admin live preview)', async () => {
    const svc = makeSvc({
      fatture: () => Promise.resolve({ data: [], error: null }),
      ddc: () => Promise.resolve({ count: 0, error: null }),
    })
    mockGetMateriali.mockResolvedValueOnce([])
    mockGetPagamenti.mockResolvedValueOnce([])
    const pile = { striscia: { ...VUOTO.pile, consegneOggiTotali: 1, prossimaOra: '16:00' } } as unknown as PileHome

    const s = await getSegnaleStriscia(svc, 'lab1', 'titolare', pile)

    expect(s).toEqual({ attenzione: false, forte: 'Tutto a posto:', testo: '1 consegne oggi, la prossima alle 16:00', azione: null })
  })
})
