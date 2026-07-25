import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { scegliSegnale, getSegnaleStriscia, fetchIngressiStriscia, leggiTecniciSenzaAnagrafica, leggiLiberazioneRecente, type IngressiStriscia } from '@/lib/dashboard/striscia'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { PileHome } from '@/lib/dashboard/pile-home'

// Task 16 (D3 §3.4) — timestamp fisso per i test del racconto «UÀ ha liberato»: il valore non
// è mai interpretato da `scegliSegnale` (la finestra delle 24h è un filtro SQL in
// `leggiLiberazioneRecente`, non una regola di `striscia.ts`) — qui serve solo a verificare che
// `eventoId` lo riporti verbatim, senza riformattarlo (Task 16, risoluzione 6).
const unOraFa = '2026-07-25T09:00:00+00:00'

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
  // D3 (Task 16, spec §3.4): questo test verificava «la fattura scartata vince su tutto»
  // impostando ENTRAMBI fatturaScartata e ritardoPiuGrave sotto la vecchia gerarchia a
  // eliminazione singola (il primo candidato acceso in ordine di array vinceva, gli altri
  // sparivano). Con l'aggregazione di livello 1 (riserva UX 5a) i due allarmi ora si SOMMANO
  // invece di eliminarsi — v. describe 'striscia D3' più sotto per il caso aggregato. Qui
  // isoliamo il caso a un solo allarme, che resta invariato (copy passthrough).
  it('titolare: la fattura scartata è un allarme di livello 1 (segnale 1)', () => {
    const s = scegliSegnale('titolare', { ...VUOTO,
      fatturaScartata: { id: 'f1', numero: '2026-0139' } })
    expect(s).toEqual({ attenzione: true, forte: 'Fattura n.2026-0139', testo: 'scartata',
      azione: { etichetta: 'Sistemala ›', href: '/fatture/f1' } })
  })

  // D3 (Task 16): stesso motivo del test sopra — «il ritardo vince sulla fattura scartata» era
  // un tie-break fra due allarmi accesi insieme, superato dall'aggregazione. Qui isoliamo il
  // caso a un solo allarme operativo: front_desk lo vede esattamente come titolare (P7, §3.2).
  it('front_desk: vede gli allarmi operativi di livello 1 (P7, §3.2)', () => {
    const s = scegliSegnale('front_desk', { ...VUOTO,
      pile: { ...VUOTO.pile, ritardoPiuGrave: { numero: '144', giorni: 1 } } })
    expect(s.forte).toBe('n.144')
    expect(s.testo).toBe('doveva uscire ieri')
    expect(s.azione).toEqual({ etichetta: 'Apri ›', href: '/lavori?pila=rossa' })
  })

  it('tecnico: mai segnali fiscali/pagamenti/materiali (P7)', () => {
    const s = scegliSegnale('tecnico', { ...VUOTO,
      fatturaScartata: { id: 'f1', numero: '2026-0139' }, materialeRosso: 'Zirconia', pagamentoScaduto: 'Studio Verdi' })
    expect(s.attenzione).toBe(false) // cade sul silenzio (D3, Task 16) — s1/s5/s7 non sono di livello 1 per il tecnico
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

  // D3 (Task 16): il vecchio segnale 9 «Tutto a posto: N consegne oggi…» è MORTO — nessun
  // candidato della nuova catena legge più `consegneOggiTotali`/`prossimaOra`. Quando non c'è
  // altro da dire, la striscia sparisce (`silenzio`) invece di riempirsi con un dato che non
  // serve più (il saluto respira, D3).
  it('nessun allarme/racconto: consegneOggiTotali/prossimaOra da sole NON producono più segnale — silenzio', () => {
    const s = scegliSegnale('titolare', { ...VUOTO, pile: { ...VUOTO.pile, consegneOggiTotali: 2, prossimaOra: '16:00' } })
    expect(s.silenzio).toBe(true)
    expect(scegliSegnale('titolare', VUOTO).silenzio).toBe(true)
  })
})

// --- Task 15: racconto backfill «UÀ ha creato N cassette» (una tantum) ---

describe('scegliSegnale — Task 15: racconto backfill parete_intro', () => {
  it('titolare, cassette presenti e intro non vista → segnale quieto col racconto verbatim', () => {
    const s = scegliSegnale('titolare', { ...VUOTO, parete: { n: 12, introVista: false } })
    expect(s).toEqual({
      attenzione: false,
      intro: true,
      forte: null,
      testo: 'UÀ ha creato 12 cassette dai tuoi lavori —',
      azione: { etichetta: 'colorale e mettile in ordine ›', href: '/cassette' },
    })
  })

  it('n=1 → singolare «1 cassetta», non «1 cassette» (review finale whole-branch)', () => {
    const s = scegliSegnale('titolare', { ...VUOTO, parete: { n: 1, introVista: false } })
    expect(s.testo).toBe('UÀ ha creato 1 cassetta dai tuoi lavori —')
  })

  it('intro GIÀ vista → nessun racconto, cade sul silenzio (D3, Task 16 — s9 è morto)', () => {
    const s = scegliSegnale('titolare', { ...VUOTO, parete: { n: 12, introVista: true } })
    expect(s.intro).toBeUndefined()
    expect(s.silenzio).toBe(true)
  })

  it('nessuna cassetta (n=0) → nessun racconto', () => {
    const s = scegliSegnale('titolare', { ...VUOTO, parete: { n: 0, introVista: false } })
    expect(s.intro).toBeUndefined()
  })

  it('gli allarmi operativi vincono sul racconto', () => {
    const s = scegliSegnale('titolare', { ...VUOTO,
      parete: { n: 12, introVista: false },
      pile: { ...VUOTO.pile, ritardoPiuGrave: { numero: '144', giorni: 1 } } })
    expect(s.forte).toBe('n.144')
  })

  it('il racconto vince sui sereni (s8: DdC di oggi)', () => {
    const s = scegliSegnale('titolare', { ...VUOTO, ddcOggi: 3, parete: { n: 12, introVista: false } })
    expect(s.intro).toBe(true)
  })

  it('è lab-wide: anche tecnico e front_desk lo vedono (quando nessun allarme è attivo)', () => {
    expect(scegliSegnale('tecnico', { ...VUOTO, parete: { n: 5, introVista: false } }).intro).toBe(true)
    expect(scegliSegnale('front_desk', { ...VUOTO, parete: { n: 5, introVista: false } }).intro).toBe(true)
  })

  it('ingresso parete assente (es. admin live preview) → nessun segnale nuovo (gerarchia invariata)', () => {
    const s = scegliSegnale('titolare', { ...VUOTO, ddcOggi: 3 })
    expect(s.intro).toBeUndefined()
    expect(s.testo).toBe('Oggi ho preparato 3 DdC ✓')
  })
})

// --- O1f: segnale «tecnico senza anagrafica» (Task 11) ---

describe('scegliSegnale — O1f: tecnico senza anagrafica (Task 11)', () => {
  // D3 (Task 16, risoluzione 3): sotto la vecchia gerarchia a eliminazione singola, `sTecAccount`
  // era il PRIMO candidato tecnico e vinceva su tutto — questo test lo dimostrava artificialmente
  // impostando ANCHE `pile.ritardoPiuGrave` (scenario che nella realtà non si presenta mai: v.
  // commento su `sTecAccount` in striscia.ts — con `senzaAnagrafica` le pile sono vuote per
  // costruzione). Con l'aggregazione di livello 1, `sTecAccount` è sceso nella catena di
  // fallback (sotto il livello 1): se le pile fossero DAVVERO popolate insieme a
  // `senzaAnagrafica`, ora vincerebbe l'allarme operativo (s2), non più `sTecAccount` — la
  // precedenza è cambiata di proposito (v. FALLBACK_PER_RUOLO). Qui testiamo lo scenario reale:
  // pile vuote, come sono sempre quando `senzaAnagrafica` è true.
  it('(a) tecnico con senzaAnagrafica: true → «Il tuo account…» (pile vuote per costruzione)', () => {
    const s = scegliSegnale('tecnico', { ...VUOTO, senzaAnagrafica: true })
    expect(s).toEqual({ attenzione: true, forte: 'Il tuo account',
      testo: 'non è ancora configurato — avvisa il titolare', azione: null })
  })

  // Fix review Task 16a, finding importante #2 — GUARDIA DI PRECEDENZA (non uno scenario
  // raggiungibile in produzione): il test sopra è stato indebolito nella tranche A, perdendo
  // `pile.ritardoPiuGrave` accanto a `senzaAnagrafica: true` — proprio l'input che lo rendeva un
  // test di precedenza. Sotto la VECCHIA gerarchia a eliminazione singola, `sTecAccount` era il
  // primo candidato tecnico e vinceva SEMPRE, anche con un allarme operativo acceso. Con
  // l'aggregazione di livello 1, `sTecAccount` è sceso nella catena di fallback (valutata SOLO
  // se il livello 1 produce 0 allarmi, v. `FALLBACK_PER_RUOLO`/`scegliSegnale`): la precedenza si
  // è INVERTITA di proposito — ora, se un allarme di livello 1 è acceso, vince LUI, non più
  // `sTecAccount`. Questo test riafferma quella nuova precedenza esplicitamente. In produzione
  // questo stato (senzaAnagrafica true CON pile popolate) non si presenta mai — con
  // `senzaAnagrafica` le pile sono vuote per costruzione (v. commento su `sTecAccount` in
  // striscia.ts) — il test guarda la REGOLA di ordinamento in sé, non uno stato raggiungibile.
  it('(a) senzaAnagrafica: true CON un allarme di livello 1 (stato irraggiungibile in produzione) → ora vince l\'allarme, non più sTecAccount', () => {
    const s = scegliSegnale('tecnico', { ...VUOTO,
      senzaAnagrafica: true,
      pile: { ...VUOTO.pile, ritardoPiuGrave: { numero: '144', giorni: 1 } } })
    expect(s.forte).toBe('n.144')
    expect(s.testo).toBe('doveva uscire ieri')
    expect(s.azione).toEqual({ etichetta: 'Apri ›', href: '/lavori?pila=rossa' })
  })

  it('(a) tecnico senza senzaAnagrafica: gerarchia normale (nessun cambiamento)', () => {
    const s = scegliSegnale('tecnico', { ...VUOTO,
      pile: { ...VUOTO.pile, ritardoPiuGrave: { numero: '144', giorni: 1 } } })
    expect(s.forte).toBe('n.144')
  })

  it('(b) titolare con tecniciSenzaAnagrafica=[Marco] e s1-s7 spenti → segnale «Account di Marco»', () => {
    const s = scegliSegnale('titolare', { ...VUOTO, tecniciSenzaAnagrafica: ['Marco'] })
    expect(s).toEqual({ attenzione: true, forte: 'Account di Marco', testo: 'da completare',
      azione: { etichetta: 'Apri ›', href: '/tecnici' } })
  })

  it('(b) titolare con tecniciSenzaAnagrafica=[Marco] MA s1 (fattura scartata) attivo → vince s1', () => {
    const s = scegliSegnale('titolare', { ...VUOTO,
      tecniciSenzaAnagrafica: ['Marco'],
      fatturaScartata: { id: 'f1', numero: '2026-0139' } })
    expect(s.forte).toBe('Fattura n.2026-0139')
  })

  it('(c) titolare senza tecnici scoperti → s8 invariato, silenzio se anche s8 tace (D3, s9 morto)', () => {
    expect(scegliSegnale('titolare', { ...VUOTO, ddcOggi: 2 })).toEqual({
      attenzione: false, forte: null, testo: 'Oggi ho preparato 2 DdC ✓', azione: null })
    expect(scegliSegnale('titolare', VUOTO).silenzio).toBe(true)
  })

  it('(d) front_desk con tecniciSenzaAnagrafica valorizzato → NESSUN segnale nuovo (gerarchia invariata)', () => {
    const s = scegliSegnale('front_desk', { ...VUOTO, tecniciSenzaAnagrafica: ['Marco'] })
    expect(s.attenzione).toBe(false) // cade sul silenzio come prima cadeva su s9 — front_desk non vede sTitTecnici
    expect(s.silenzio).toBe(true) // D3 (Task 16): s9 è morto, il silenzio ne prende il posto
  })

  it('(d) admin_rete con tecniciSenzaAnagrafica: usa la stessa gerarchia del titolare', () => {
    const s = scegliSegnale('admin_rete', { ...VUOTO, tecniciSenzaAnagrafica: ['Marco'] })
    expect(s.forte).toBe('Account di Marco')
  })
})

// --- leggiTecniciSenzaAnagrafica — query titolare, scoped laboratorio_id ---

type UtentiTecniciResult = { data: unknown; error: unknown }

function makeSvcUtentiTecnici(opts: {
  utenti: () => Promise<UtentiTecniciResult>
  tecnici: () => Promise<UtentiTecniciResult>
}): SupabaseClient {
  const chainUtenti: Record<string, unknown> = {}
  for (const m of ['select', 'eq']) chainUtenti[m] = () => chainUtenti
  chainUtenti.is = () => opts.utenti()

  const chainTecnici: Record<string, unknown> = {}
  for (const m of ['select', 'eq']) chainTecnici[m] = () => chainTecnici
  chainTecnici.is = () => opts.tecnici()

  return {
    from: (table: string) => {
      if (table === 'utenti') return chainUtenti
      if (table === 'tecnici') return chainTecnici
      throw new Error(`tabella non attesa nel mock: ${table}`)
    },
  } as unknown as SupabaseClient
}

describe('leggiTecniciSenzaAnagrafica — utenti ruolo tecnico senza riga tecnici, scoped lab', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('restituisce i nomi degli utenti tecnico attivi senza riga tecnici corrispondente', async () => {
    const svc = makeSvcUtentiTecnici({
      utenti: () => Promise.resolve({
        data: [{ id: 'u1', nome: 'Marco' }, { id: 'u2', nome: 'Luca' }],
        error: null,
      }),
      tecnici: () => Promise.resolve({ data: [{ utente_id: 'u2' }], error: null }),
    })

    const nomi = await leggiTecniciSenzaAnagrafica(svc, 'lab1')

    expect(nomi).toEqual(['Marco']) // u2 (Luca) ha già la riga tecnici — esclusa
  })

  it('nessun utente scoperto → array vuoto', async () => {
    const svc = makeSvcUtentiTecnici({
      utenti: () => Promise.resolve({ data: [{ id: 'u1', nome: 'Marco' }], error: null }),
      tecnici: () => Promise.resolve({ data: [{ utente_id: 'u1' }], error: null }),
    })

    expect(await leggiTecniciSenzaAnagrafica(svc, 'lab1')).toEqual([])
  })

  it('errore su una delle due query degrada a array vuoto (spy console.error)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const svc = makeSvcUtentiTecnici({
      utenti: () => Promise.reject(new Error('boom utenti')),
      tecnici: () => Promise.resolve({ data: [], error: null }),
    })

    expect(await leggiTecniciSenzaAnagrafica(svc, 'lab1')).toEqual([])
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('lettura tecniciSenzaAnagrafica fallita — degrado a []:'),
      expect.any(Error)
    )
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
      fatture: () => Promise.resolve({ data: [{ id: 'f1', numero: '2026-0139' }], error: null }),
      ddc: () => Promise.resolve({ count: 0, error: null }),
    })
    mockGetMateriali.mockResolvedValueOnce([])
    mockGetPagamenti.mockResolvedValueOnce([])
    const pile = { striscia: VUOTO.pile } as unknown as PileHome

    const s = await getSegnaleStriscia(svc, 'lab1', 'titolare', pile)

    // D3 (Task 16): questo test verificava solo che `getSegnaleStriscia` componesse
    // fetch+compose correttamente — usava `consegneOggiTotali` (s9, morto) come dato di comodo
    // per avere UN segnale da confrontare. Con s9 morto, `consegneOggiTotali` da solo produce
    // silenzio (v. describe 'striscia D3' più sotto) — qui si usa invece `fatturaScartata`
    // (livello 1, resta vivo) per continuare a verificare che il wrapper componga davvero i dati
    // letti dalla query dentro `scegliSegnale`, non un valore fisso.
    expect(s).toEqual({ attenzione: true, forte: 'Fattura n.2026-0139', testo: 'scartata',
      azione: { etichetta: 'Sistemala ›', href: '/fatture/f1' } })
  })
})

// --- Task 16 (D3 §3.4): livello 1 aggregato, racconti, silenzio ---

describe('scegliSegnale — Task 16 (D3 §3.4): aggregazione livello 1, racconto liberazione, silenzio', () => {
  it('aggregazione (riserva UX 5a): 2+ allarmi di livello 1 aggregano in «N scadenze oggi» (N = conteggio dei candidati REALMENTE accesi)', () => {
    // 2 allarmi operativi distinti per il titolare: s2 (ritardo) + s3 (prova rientro oggi).
    const i: IngressiStriscia = { ...VUOTO,
      pile: { ...VUOTO.pile, ritardoPiuGrave: { numero: '144', giorni: 1 }, provaRientroOggi: '150' } }
    const s = scegliSegnale('titolare', i)
    expect(s.forte).toBe('2 scadenze oggi') // derivato dai 2 candidati accesi (s2 + s3), non un numero copiato
    expect(s.testo).toBe('da guardare')
    expect(s.azione).toEqual({ etichetta: 'Vedi ›', href: '/lavori' })
    expect(s.attenzione).toBe(true)
  })

  it('3 allarmi di livello 1 → «3 scadenze oggi» (la regola vale per QUALSIASI N ≥ 2, non solo 2)', () => {
    const i: IngressiStriscia = { ...VUOTO,
      pile: { ...VUOTO.pile, ritardoPiuGrave: { numero: '144', giorni: 1 }, provaRientroOggi: '150', arrivoVecchio: '151' } }
    expect(scegliSegnale('titolare', i).forte).toBe('3 scadenze oggi')
  })

  // Il conteggio deve sommare SOLO i candidati ammessi per il ruolo (P7) — non «tutti i campi
  // valorizzati». Il tecnico non ha s1 (fiscali) nel proprio LIVELLO1_PER_RUOLO: se questo test
  // mancasse, un futuro refactor che collassasse LIVELLO1_PER_RUOLO in un array unico per tutti
  // i ruoli passerebbe inosservato (il test «tecnico: mai segnali fiscali» sopra non lo cattura,
  // perché lì non c'è nessun allarme di pila e si cade comunque sul silenzio).
  it('il conteggio somma SOLO i candidati ammessi per ruolo (P7): tecnico con fattura scartata + ritardo → 1 allarme, non 2', () => {
    const s = scegliSegnale('tecnico', { ...VUOTO,
      fatturaScartata: { id: 'f1', numero: '2026-0139' },
      pile: { ...VUOTO.pile, ritardoPiuGrave: { numero: '144', giorni: 1 } } })
    expect(s.forte).toBe('n.144') // s1 non è di livello 1 per il tecnico → nessun aggregato
  })

  it('trial ≤3gg ESCALA a livello 1 (riserva UX 5b): entra nell\'aggregato invece di affamare o essere affamato da un allarme operativo', () => {
    const i: IngressiStriscia = { ...VUOTO,
      pile: { ...VUOTO.pile, ritardoPiuGrave: { numero: '144', giorni: 1 } },
      trial: { giorniRimasti: 2 } }
    const s = scegliSegnale('titolare', i)
    // 2 candidati accesi: s2 (ritardo) + il trial escalato — il conteggio li somma entrambi.
    expect(s.forte).toBe('2 scadenze oggi')
    expect(s.azione).toEqual({ etichetta: 'Vedi ›', href: '/lavori' })
  })

  it('racconto (riserva UX 5c): liberazione <24h → segnale quieto, tappabile, con eventoId stabile', () => {
    const s = scegliSegnale('titolare', { ...VUOTO, liberazioneRecente: { cassettaId: 'c1', nome: 'C12', quando: unOraFa } })
    expect(s.attenzione).toBe(false)
    expect(s.testo).toBe('UÀ ha liberato C12')
    expect(s.azione).toEqual({ etichetta: 'Guarda ›', href: '/dashboard?stanza=parete' })
    expect(s.eventoId).toBe(`lib-c1-${unOraFa}`) // `quando` riportato verbatim, mai riformattato (risoluzione 6)
  })

  it('è lab-wide: anche tecnico e front_desk vedono il racconto liberazione quando nessun allarme è attivo', () => {
    expect(scegliSegnale('tecnico', { ...VUOTO, liberazioneRecente: { cassettaId: 'c1', nome: 'C12', quando: unOraFa } }).testo).toContain('UÀ ha liberato C12')
    expect(scegliSegnale('front_desk', { ...VUOTO, liberazioneRecente: { cassettaId: 'c1', nome: 'C12', quando: unOraFa } }).testo).toContain('UÀ ha liberato C12')
  })

  it('gli allarmi operativi di livello 1 vincono sul racconto liberazione', () => {
    const s = scegliSegnale('titolare', { ...VUOTO,
      liberazioneRecente: { cassettaId: 'c1', nome: 'C12', quando: unOraFa },
      pile: { ...VUOTO.pile, ritardoPiuGrave: { numero: '144', giorni: 1 } } })
    expect(s.forte).toBe('n.144')
  })

  it('silenzio (D3): nessun ingresso → silenzio:true, testo vuoto, MAI il vecchio s9 «Tutto a posto»', () => {
    const s = scegliSegnale('titolare', VUOTO)
    expect(s.silenzio).toBe(true)
    expect(s.forte).toBeNull()
    expect(s.testo).toBe('')
    expect(s.azione).toBeNull()
  })

  it('silenzio vale per ogni ruolo, non solo titolare', () => {
    expect(scegliSegnale('tecnico', VUOTO).silenzio).toBe(true)
    expect(scegliSegnale('front_desk', VUOTO).silenzio).toBe(true)
    expect(scegliSegnale('admin_rete', VUOTO).silenzio).toBe(true)
  })
})

// --- Fix review Task 16a, finding importante #1: s2 bundlava DUE allarmi distinti (ritardo più
// grave E consegna di oggi non pronta) in un'unica funzione con precedenza interna — se entrambi
// i campi delle pile erano valorizzati insieme (routine: un lavoro in ritardo grave + un altro
// lavoro con consegna di oggi non ancora pronta), il secondo restava invisibile ANCHE sotto la
// nuova aggregazione, perché `candidatiLivello1` contava le FUNZIONI candidate, non gli allarmi
// effettivamente accesi — la riserva UX 5a («mai un allarme nascosto dietro un altro») valeva
// solo a metà. `s2` è stato diviso in `s2` (ritardo) + `s2b` (consegna oggi non pronta),
// candidati indipendenti con copy/href INVARIATI verbatim.
describe('scegliSegnale — fix review Task 16a #1: ritardo e consegna-oggi-non-pronta sono allarmi indipendenti', () => {
  it('entrambi accesi insieme → 2 allarmi nell\'aggregato, nessuno nascosto (PRIMA del fix: solo 1, il ritardo)', () => {
    const i: IngressiStriscia = { ...VUOTO,
      pile: { ...VUOTO.pile,
        ritardoPiuGrave: { numero: '144', giorni: 1 },
        consegnaOggiNonPronta: { numero: '147', ora: '16:00' } } }
    const s = scegliSegnale('titolare', i)
    expect(s.forte).toBe('2 scadenze oggi')
    expect(s.testo).toBe('da guardare')
    expect(s.azione).toEqual({ etichetta: 'Vedi ›', href: '/lavori' })
  })

  it('solo il ritardo acceso → passthrough invariato, copy/href identici a prima del fix', () => {
    const s = scegliSegnale('titolare', { ...VUOTO,
      pile: { ...VUOTO.pile, ritardoPiuGrave: { numero: '144', giorni: 1 } } })
    expect(s).toEqual({ attenzione: true, forte: 'n.144', testo: 'doveva uscire ieri',
      azione: { etichetta: 'Apri ›', href: '/lavori?pila=rossa' } })
  })

  it('solo la consegna-oggi-non-pronta accesa → passthrough invariato, copy/href identici a prima del fix', () => {
    const s = scegliSegnale('titolare', { ...VUOTO,
      pile: { ...VUOTO.pile, consegnaOggiNonPronta: { numero: '147', ora: '16:00' } } })
    expect(s).toEqual({ attenzione: true, forte: 'n.147', testo: 'non è ancora pronto per le 16:00',
      azione: { etichetta: 'Apri ›', href: '/lavori?pila=ambra' } })
  })
})

// --- leggiLiberazioneRecente (Task 16, D3 §3.4) — ultima liberazione per consegna, scoped lab ---

type CassetteLavoriResult = { data: unknown; error: unknown }

function makeSvcLiberazione(fn: () => Promise<CassetteLavoriResult>) {
  const chiamate: Array<{ metodo: string; args: unknown[] }> = []
  const chain: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'gt', 'order']) {
    chain[m] = (...args: unknown[]) => { chiamate.push({ metodo: m, args }); return chain }
  }
  // Fix review Task 16a, finding minore: `limit` non registrava i propri argomenti (a differenza
  // di select/eq/gt/order) — impossibile verificare `.limit(1)` dal test. Registrato come gli
  // altri, PRIMA di invocare `fn()` (che chiude la catena e restituisce il risultato mockato).
  chain.limit = (...args: unknown[]) => { chiamate.push({ metodo: 'limit', args }); return fn() }
  const svc = {
    from: (table: string) => {
      if (table === 'cassette_lavori') return chain
      throw new Error(`tabella non attesa nel mock: ${table}`)
    },
  } as unknown as SupabaseClient
  return { svc, chiamate }
}

describe('leggiLiberazioneRecente — ultima liberazione per consegna nelle ultime 24h, scoped lab', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('restituisce cassettaId/nome/quando dalla riga più recente (join cassette.nome)', async () => {
    const { svc } = makeSvcLiberazione(() => Promise.resolve({
      data: [{ cassetta_id: 'c1', liberato_at: unOraFa, cassette: { nome: 'C12' } }],
      error: null,
    }))

    expect(await leggiLiberazioneRecente(svc, 'lab1')).toEqual({ cassettaId: 'c1', nome: 'C12', quando: unOraFa })
  })

  it('nessuna liberazione recente → null', async () => {
    const { svc } = makeSvcLiberazione(() => Promise.resolve({ data: [], error: null }))
    expect(await leggiLiberazioneRecente(svc, 'lab1')).toBeNull()
  })

  it('filtra SEMPRE per laboratorio_id — getServiceClient() bypassa la RLS, il filtro non è opzionale (risoluzione 5)', async () => {
    const { svc, chiamate } = makeSvcLiberazione(() => Promise.resolve({ data: [], error: null }))
    await leggiLiberazioneRecente(svc, 'lab-42')
    const eqLab = chiamate.find((c) => c.metodo === 'eq' && c.args[0] === 'laboratorio_id')
    expect(eqLab?.args).toEqual(['laboratorio_id', 'lab-42'])
  })

  // Fix review Task 16a, finding minore: tre assert mancanti sulla query — un filtro
  // `liberato_per` perso farebbe scattare il racconto «UÀ ha liberato…» anche per liberazioni
  // NON di consegna (es. liberazioni manuali/altro motivo), senza che nessun test se ne accorga.
  it('filtra per liberato_per=consegna — un filtro assente farebbe scattare il racconto su liberazioni non di consegna', async () => {
    const { svc, chiamate } = makeSvcLiberazione(() => Promise.resolve({ data: [], error: null }))
    await leggiLiberazioneRecente(svc, 'lab1')
    const eqConsegna = chiamate.find((c) => c.metodo === 'eq' && c.args[0] === 'liberato_per')
    expect(eqConsegna?.args).toEqual(['liberato_per', 'consegna'])
  })

  it('filtra sulle ultime 24h con gt su liberato_at', async () => {
    const { svc, chiamate } = makeSvcLiberazione(() => Promise.resolve({ data: [], error: null }))
    const prima = Date.now()
    await leggiLiberazioneRecente(svc, 'lab1')
    const dopo = Date.now()
    const gtCall = chiamate.find((c) => c.metodo === 'gt')
    expect(gtCall?.args[0]).toBe('liberato_at')
    // Il bound esatto dipende da Date.now() al momento della chiamata — si verifica che cada
    // nella finestra [prima, dopo] meno 24h, non un valore letterale (che sarebbe flaky).
    const bound = new Date(gtCall?.args[1] as string).getTime()
    expect(bound).toBeGreaterThanOrEqual(prima - 24 * 60 * 60 * 1000)
    expect(bound).toBeLessThanOrEqual(dopo - 24 * 60 * 60 * 1000)
  })

  it('ordina per liberato_at discendente e limita a 1 riga — la più recente', async () => {
    const { svc, chiamate } = makeSvcLiberazione(() => Promise.resolve({ data: [], error: null }))
    await leggiLiberazioneRecente(svc, 'lab1')
    const orderCall = chiamate.find((c) => c.metodo === 'order')
    expect(orderCall?.args).toEqual(['liberato_at', { ascending: false }])
    const limitCall = chiamate.find((c) => c.metodo === 'limit')
    expect(limitCall?.args).toEqual([1])
  })

  it('errore → degrado a null, come leggiFatturaScartata (spy console.error)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { svc } = makeSvcLiberazione(() => Promise.reject(new Error('boom liberazione')))

    expect(await leggiLiberazioneRecente(svc, 'lab1')).toBeNull()
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('lettura liberazioneRecente fallita — degrado a null:'),
      expect.any(Error)
    )
  })
})
