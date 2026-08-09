import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/lavori/[id]/avviso — segna un avviso al dentista come comunicato,
// dall'app o a voce (Task 4 dell'ondata «l'avviso al dentista»).
//
// ⚖️ D335 — i due modi valgono uguale, e si registra CHI e QUANDO.
// ⚖️ D339 — si scrive il testo MANDATO, e nessuna bozza.
//
// 🛑 PERCHÉ QUESTO FILE NON FINGE `lab-guard` NÉ `csrf`, al contrario di
//    `api-prescrizione-divergenza.test.ts`: sono due delle guardie che il piano
//    dichiara «non negoziabili». Una guardia finta è una guardia non provata —
//    qui girano quelle vere, e si mandano gli ingressi che devono fermarle
//    (origine estranea, laboratorio sospeso, contesto senza laboratorio).
//    Fingere si limita a ciò che parla con la rete: banca dati e identità.
//
// ═══ ENUMERAZIONE DELLE FORME D'INPUT (R-P4) ═══════════════════════════════
// Corpo: `{ avviso_id, come: 'dall_app' | 'a_voce', testo? }`
//
//  ① origine estranea                                  → 403, DB non toccato
//  ② nessuna sessione                                  → 401, DB non toccato
//  ③ contesto senza laboratorio (`admin_sistema`)      → 403, DB non toccato
//  ④ laboratorio sospeso (guardia vera, `enforce`)     → 403, DB non toccato
//  ⑤ `id` di percorso non UUID                         → 404, DB non toccato
//  ⑥ corpo non-JSON · `null` · array · scalare         → 400, DB non toccato
//  ⑦ chiave ignota nel corpo                           → 422, DB non toccato
//     (`visto_dal_dentista_at` · `comunicato_da` · `stato` · `testo_inviato`)
//  ⑧ `avviso_id` assente · non stringa · non UUID      → 422, DB non toccato
//  ⑨ `come` assente · non stringa · fuori vocabolario  → 422, DB non toccato
//  ⑩ `come: '__proto__'`                               → 422, DB non toccato
//  ⑪ `dall_app` senza `testo`                          → 422, DB non toccato
//  ⑫ `dall_app` con `testo` vuoto · di soli spazi      → 422, DB non toccato
//  ⑬ `dall_app` con `testo` non stringa · oltre 1000   → 422, DB non toccato
//  ⑭ `a_voce` CON `testo`                              → 422, DB non toccato
//  ⑮ `a_voce` con `testo: null`                        → 200 (null = assente)
//  ⑯ `avviso_id` di un altro laboratorio               → 404
//  ⑰ `avviso_id` di un altro LAVORO dello stesso lab   → 404
//  ⑱ avviso già chiuso                                 → 409
//  ⑲ avviso con stato fuori vocabolario                → 409 fail-closed
//  ⑳ errore del database sull'aggiornamento            → 500
//  ㉑ successo `dall_app`                               → 200 + le 4 colonne
//  ㉒ successo `a_voce`                                 → 200, `testo_inviato`
//     NON mandato (chiave omessa, non `null`)
//
// 🛑 NON coperte, e con la ragione:
//  · gettone di concorrenza (`atteso_updated_at`): NON esiste per questo gesto.
//    L'aggiornamento è CONDIZIONATO nella `WHERE` allo stato ancora aperto, e
//    due richieste concorrenti non possono vincere entrambe — la seconda trova
//    zero righe e legge 409. Mandare un gettone cade in ⑦.
//  · che il testo sia DAVVERO partito su WhatsApp: l'app non lo può sapere
//    (⚖️ D331 — l'app propone, l'odontotecnico manda). Nessuna prova può
//    affermarlo, e la rotta non finge di saperlo.
//  · la scadenza del gettone del portale (`clienti.portale_token_scade_at`):
//    riferita, non risolta qui — v. il resoconto del Task 4 §⑧.
//  · il perimetro per RUOLO: la rotta applica quello della rotta modello
//    (nessun cancello di ruolo), e la domanda è aperta per Francesco. La prova
//    ㉓ FISSA il comportamento di oggi perché una decisione futura debba
//    cambiare una prova, invece di passare inosservata.
// ═══════════════════════════════════════════════════════════════════════════

const { mockFrom, mockGetFreshLabContext } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetFreshLabContext: vi.fn(),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))
vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: mockGetFreshLabContext,
}))

import { POST } from '@/app/api/lavori/[id]/avviso/route'
import { STATI_AVVISO, STATI_CHIUSI } from '@/lib/avvisi/stati'

// ── il finto client, che REGISTRA cosa gli è stato chiesto ───────────────────
type Chiamata = { metodo: string; args: unknown[] }
type Risultato = { data: unknown; error: unknown }
type Catena = { chiamate: Chiamata[]; [k: string]: unknown }

function catena(risultato: Risultato): Catena {
  const chiamate: Chiamata[] = []
  const c: Catena = { chiamate }
  for (const m of ['select', 'eq', 'in', 'update', 'is', 'order', 'limit'] as const) {
    c[m] = (...args: unknown[]) => {
      chiamate.push({ metodo: m, args })
      return c
    }
  }
  for (const m of ['single', 'maybeSingle'] as const) {
    c[m] = async (...args: unknown[]) => {
      chiamate.push({ metodo: m, args })
      return risultato
    }
  }
  // La catena è attendibile: `await svc.from(…).update(…).eq(…).select(…)`
  // si risolve senza `single()`, com'è per un aggiornamento a più righe.
  c.then = (resolve: (v: unknown) => void) => resolve(risultato)
  return c
}

const LAB_ID = '11111111-1111-1111-1111-111111111111'
const USER_ID = '99999999-9999-9999-9999-999999999999'
const LAVORO_ID = '33333333-3333-3333-3333-333333333333'
const AVVISO_ID = '44444444-4444-4444-4444-444444444444'
const CLIENTE_ID = '55555555-5555-5555-5555-555555555555'

const CONTESTO = {
  userId: USER_ID,
  email: 'anna@lab.it',
  ruolo: 'titolare',
  laboratorioId: LAB_ID,
  nome: 'Anna',
  cognome: 'Bianchi',
  lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab di prova' },
}

const TESTO = '📄 La dichiarazione del lavoro #STOR/2021/016 è stata rifatta.'

/**
 * Il banco: la prima chiamata a `from('avvisi_dentista')` serve
 * l'aggiornamento condizionato, la seconda l'eventuale lettura di
 * disambiguazione (che esiste SOLO quando l'aggiornamento non tocca righe).
 */
function banco(opts: {
  aggiornate?: Record<string, unknown>[]
  erroreUpdate?: { code?: string; message?: string } | null
  riga?: Record<string, unknown> | null
} = {}) {
  const catenaUpdate = catena({
    data: opts.erroreUpdate ? null : (opts.aggiornate ?? [rigaChiusa()]),
    error: opts.erroreUpdate ?? null,
  })
  const catenaLettura = catena({ data: opts.riga ?? null, error: null })
  const tabelle: string[] = []
  const code = [catenaUpdate, catenaLettura]
  mockFrom.mockImplementation((tabella: string) => {
    tabelle.push(tabella)
    return code.shift() ?? catena({ data: null, error: null })
  })
  return { catenaUpdate, catenaLettura, tabelle }
}

function rigaChiusa(extra: Record<string, unknown> = {}) {
  return {
    id: AVVISO_ID,
    lavoro_id: LAVORO_ID,
    cliente_id: CLIENTE_ID,
    stato: 'comunicato_dall_app',
    comunicato_at: new Date().toISOString(),
    comunicato_da: USER_ID,
    testo_inviato: TESTO,
    ...extra,
  }
}

const URL_ROTTA = `http://localhost/api/lavori/${LAVORO_ID}/avviso`
const params = (id: string = LAVORO_ID) => ({ params: Promise.resolve({ id }) })

function req(
  corpo: unknown,
  headers: Record<string, string> = { origin: 'http://localhost', host: 'localhost' }
) {
  const init: RequestInit = { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers } }
  if (corpo !== undefined) init.body = JSON.stringify(corpo)
  return new Request(URL_ROTTA, init)
}

function reqGrezza(raw: string) {
  return new Request(URL_ROTTA, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost', host: 'localhost' },
    body: raw,
  })
}

/** Gli argomenti dell'`update`, cioè ESATTAMENTE ciò che si scriverebbe. */
function payloadDiUpdate(c: Catena): Record<string, unknown> {
  const chiamata = c.chiamate.find((x) => x.metodo === 'update')
  expect(chiamata, 'nessun update sulla catena').toBeTruthy()
  return chiamata!.args[0] as Record<string, unknown>
}

/** Le coppie `eq(colonna, valore)` viste dalla catena. */
function filtri(c: Catena): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const x of c.chiamate) {
    if (x.metodo === 'eq') out[x.args[0] as string] = x.args[1]
    if (x.metodo === 'in') out[`in:${x.args[0] as string}`] = x.args[1]
  }
  return out
}

let erroreSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.clearAllMocks()
  process.env.UA_LAB_GUARD_MODE = 'enforce'
  mockGetFreshLabContext.mockResolvedValue(CONTESTO)
  erroreSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  erroreSpy.mockRestore()
})

// ═══════════════════════════════════════════════════════════════════════════
describe('POST /api/lavori/[id]/avviso — le guardie che stanno PRIMA di tutto', () => {
  it('① rifiuta un\'origine estranea con 403, e non tocca la banca dati', async () => {
    banco()
    const r = await POST(req({ avviso_id: AVVISO_ID, come: 'a_voce' }, { origin: 'https://cattivo.example', host: 'localhost' }), params())
    expect(r.status).toBe(403)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('② senza sessione risponde 401, e non tocca la banca dati', async () => {
    banco()
    mockGetFreshLabContext.mockResolvedValue(null)
    const r = await POST(req({ avviso_id: AVVISO_ID, come: 'a_voce' }), params())
    expect(r.status).toBe(401)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('③ un contesto senza laboratorio (admin_sistema) risponde 403', async () => {
    banco()
    mockGetFreshLabContext.mockResolvedValue({ ...CONTESTO, ruolo: 'admin_sistema', laboratorioId: null, lab: null })
    const r = await POST(req({ avviso_id: AVVISO_ID, come: 'a_voce' }), params())
    expect(r.status).toBe(403)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('④ la guardia VERA del laboratorio ferma un lab sospeso con 403', async () => {
    banco()
    mockGetFreshLabContext.mockResolvedValue({
      ...CONTESTO,
      lab: { stato: 'sospeso', trial_ends_at: null, nome: 'Lab di prova' },
    })
    const r = await POST(req({ avviso_id: AVVISO_ID, come: 'a_voce' }), params())
    expect(r.status).toBe(403)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('⑤ un id di percorso che non è un UUID risponde 404, non 400', async () => {
    banco()
    const r = await POST(req({ avviso_id: AVVISO_ID, come: 'a_voce' }), params('pippo'))
    expect(r.status).toBe(404)
    expect(mockFrom).not.toHaveBeenCalled()
  })
})

describe('POST /api/lavori/[id]/avviso — la forma del corpo', () => {
  it('⑥ un corpo non-JSON, `null`, un array o uno scalare rispondono 400', async () => {
    for (const grezzo of ['{non json', 'null', '[1,2]', '"testo"', '42']) {
      banco()
      vi.clearAllMocks()
      mockGetFreshLabContext.mockResolvedValue(CONTESTO)
      const r = await POST(reqGrezza(grezzo), params())
      expect(r.status, `corpo ${grezzo}`).toBe(400)
      expect(mockFrom, `corpo ${grezzo}`).not.toHaveBeenCalled()
    }
  })

  it('⑦ una chiave IGNOTA nel corpo si rifiuta con 422, non si scarta in silenzio', async () => {
    for (const chiave of ['visto_dal_dentista_at', 'comunicato_da', 'comunicato_at', 'stato', 'testo_inviato', 'campi_corretti']) {
      banco()
      vi.clearAllMocks()
      mockGetFreshLabContext.mockResolvedValue(CONTESTO)
      const r = await POST(req({ avviso_id: AVVISO_ID, come: 'a_voce', [chiave]: 'x' }), params())
      expect(r.status, `chiave ${chiave}`).toBe(422)
      expect(mockFrom, `chiave ${chiave}`).not.toHaveBeenCalled()
      const body = await r.json()
      expect(body.error, `chiave ${chiave}`).toContain(chiave)
    }
  })

  it('⑧ `avviso_id` assente, non stringa o non UUID risponde 422 senza toccare il DB', async () => {
    for (const valore of [undefined, null, 42, ['x'], {}, '', 'pippo', '4444-4444']) {
      banco()
      vi.clearAllMocks()
      mockGetFreshLabContext.mockResolvedValue(CONTESTO)
      const corpo: Record<string, unknown> = { come: 'a_voce' }
      if (valore !== undefined) corpo.avviso_id = valore
      const r = await POST(req(corpo), params())
      expect(r.status, `avviso_id ${JSON.stringify(valore)}`).toBe(422)
      expect(mockFrom, `avviso_id ${JSON.stringify(valore)}`).not.toHaveBeenCalled()
    }
  })

  it('⑨ `come` assente, non stringa o fuori vocabolario risponde 422 senza toccare il DB', async () => {
    for (const valore of [undefined, null, 42, 'sms', 'comunicato_dall_app', 'dall app', '']) {
      banco()
      vi.clearAllMocks()
      mockGetFreshLabContext.mockResolvedValue(CONTESTO)
      const corpo: Record<string, unknown> = { avviso_id: AVVISO_ID }
      if (valore !== undefined) corpo.come = valore
      const r = await POST(req(corpo), params())
      expect(r.status, `come ${JSON.stringify(valore)}`).toBe(422)
      expect(mockFrom, `come ${JSON.stringify(valore)}`).not.toHaveBeenCalled()
    }
  })

  it('⑩ `come: "__proto__"` (o "constructor") non risale al prototipo: 422', async () => {
    for (const valore of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
      banco()
      vi.clearAllMocks()
      mockGetFreshLabContext.mockResolvedValue(CONTESTO)
      const r = await POST(reqGrezza(JSON.stringify({ avviso_id: AVVISO_ID, come: valore })), params())
      expect(r.status, `come ${valore}`).toBe(422)
      expect(mockFrom, `come ${valore}`).not.toHaveBeenCalled()
    }
  })
})

describe('POST /api/lavori/[id]/avviso — il testo, e il 422 che arriva PRIMA della banca dati', () => {
  it('⑪ `dall_app` senza `testo` risponde 422 e il finto client NON riceve NESSUNA chiamata', async () => {
    const b = banco()
    const r = await POST(req({ avviso_id: AVVISO_ID, come: 'dall_app' }), params())
    expect(r.status).toBe(422)
    // 🔑 LE DUE ASSERZIONI VANNO IN COPPIA, ed è la coppia a dimostrare la cosa
    // che il piano dava per scontata: la prima dice «la rotta risponde 422», la
    // seconda «e ci arriva senza aver provato a scrivere». Da sola, nessuna
    // delle due proverebbe che il 422 precede la banca dati.
    expect(mockFrom).not.toHaveBeenCalled()
    expect(b.catenaUpdate.chiamate).toHaveLength(0)
  })

  it('⑫ `dall_app` con testo vuoto o di soli spazi risponde 422 senza toccare il DB', async () => {
    for (const testo of ['', '   ', '\n\t ', ' ']) {
      banco()
      vi.clearAllMocks()
      mockGetFreshLabContext.mockResolvedValue(CONTESTO)
      const r = await POST(req({ avviso_id: AVVISO_ID, come: 'dall_app', testo }), params())
      expect(r.status, `testo ${JSON.stringify(testo)}`).toBe(422)
      expect(mockFrom, `testo ${JSON.stringify(testo)}`).not.toHaveBeenCalled()
    }
  })

  it('⑬ `dall_app` con testo non stringa o oltre 1000 caratteri risponde 422 senza toccare il DB', async () => {
    for (const testo of [42, ['x'], { a: 1 }, true, 'x'.repeat(1001)]) {
      banco()
      vi.clearAllMocks()
      mockGetFreshLabContext.mockResolvedValue(CONTESTO)
      const r = await POST(req({ avviso_id: AVVISO_ID, come: 'dall_app', testo }), params())
      expect(r.status, `testo ${typeof testo}`).toBe(422)
      expect(mockFrom, `testo ${typeof testo}`).not.toHaveBeenCalled()
    }
  })

  it('⑬-bis un testo di esattamente 1000 caratteri passa: il limite non è a 999', async () => {
    const b = banco({ aggiornate: [rigaChiusa({ testo_inviato: 'x'.repeat(1000) })] })
    const r = await POST(req({ avviso_id: AVVISO_ID, come: 'dall_app', testo: 'x'.repeat(1000) }), params())
    expect(r.status).toBe(200)
    expect(payloadDiUpdate(b.catenaUpdate).testo_inviato).toHaveLength(1000)
  })

  it('⑭ `a_voce` CON un testo si rifiuta con 422: non si scarta in silenzio (D339)', async () => {
    banco()
    const r = await POST(req({ avviso_id: AVVISO_ID, come: 'a_voce', testo: TESTO }), params())
    expect(r.status).toBe(422)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('⑮ `a_voce` con `testo: null` passa: `null` vale come assente', async () => {
    const b = banco({ aggiornate: [rigaChiusa({ stato: 'comunicato_a_voce', testo_inviato: null })] })
    const r = await POST(req({ avviso_id: AVVISO_ID, come: 'a_voce', testo: null }), params())
    expect(r.status).toBe(200)
    expect(Object.hasOwn(payloadDiUpdate(b.catenaUpdate), 'testo_inviato')).toBe(false)
  })
})

describe('POST /api/lavori/[id]/avviso — a quale avviso si può arrivare', () => {
  it('⑯⑰ un avviso di un altro laboratorio o di un altro lavoro risponde 404', async () => {
    // Il finto client non sa filtrare: chi filtra è la rotta. La prova sta nel
    // fatto che l'aggiornamento PORTA i due filtri, e che a zero righe la
    // lettura di controllo (con gli stessi filtri) non trova niente → 404.
    const b = banco({ aggiornate: [], riga: null })
    const r = await POST(req({ avviso_id: AVVISO_ID, come: 'a_voce' }), params())
    expect(r.status).toBe(404)
    const f = filtri(b.catenaUpdate)
    expect(f.laboratorio_id).toBe(LAB_ID)
    expect(f.lavoro_id).toBe(LAVORO_ID)
    expect(f.id).toBe(AVVISO_ID)
    // e la lettura di disambiguazione è ristretta allo stesso perimetro
    const g = filtri(b.catenaLettura)
    expect(g.laboratorio_id).toBe(LAB_ID)
    expect(g.lavoro_id).toBe(LAVORO_ID)
  })

  it('🛑 l\'aggiornamento è CONDIZIONATO allo stato ancora aperto, e l\'elenco è DERIVATO da stati.ts', async () => {
    const b = banco()
    await POST(req({ avviso_id: AVVISO_ID, come: 'a_voce' }), params())
    const aperti = filtri(b.catenaUpdate)['in:stato'] as string[]
    // Non si ricopia «da_comunicare»: si controlla che l'elenco sia ESATTAMENTE
    // il complemento di STATI_CHIUSI dentro STATI_AVVISO. Il giorno in cui
    // nascesse un quarto stato, questa prova dice da sola cosa deve accadere.
    expect([...aperti].sort()).toEqual(
      STATI_AVVISO.filter((s) => !(STATI_CHIUSI as readonly string[]).includes(s)).sort()
    )
  })

  it('⑱ un avviso GIÀ chiuso risponde 409, non un secondo aggiornamento silenzioso', async () => {
    for (const stato of STATI_CHIUSI) {
      banco({ aggiornate: [], riga: rigaChiusa({ stato }) })
      const r = await POST(req({ avviso_id: AVVISO_ID, come: 'a_voce' }), params())
      expect(r.status, `stato ${stato}`).toBe(409)
      vi.clearAllMocks()
      mockGetFreshLabContext.mockResolvedValue(CONTESTO)
    }
  })

  it('⑲ uno stato fuori vocabolario non si legge come «apribile»: 409 fail-closed', async () => {
    banco({ aggiornate: [], riga: rigaChiusa({ stato: 'pippo' }) })
    const r = await POST(req({ avviso_id: AVVISO_ID, come: 'a_voce' }), params())
    expect(r.status).toBe(409)
    expect(erroreSpy).toHaveBeenCalled()
  })

  it('⑳ un errore del database risponde 500, e il messaggio non porta il testo di Postgres', async () => {
    banco({ erroreUpdate: { code: '23514', message: 'violates check constraint "avviso_testo_solo_se_dall_app"' } })
    const r = await POST(req({ avviso_id: AVVISO_ID, come: 'a_voce' }), params())
    expect(r.status).toBe(500)
    const body = await r.json()
    expect(body.error).not.toContain('check constraint')
    expect(erroreSpy).toHaveBeenCalled()
  })
})

describe('POST /api/lavori/[id]/avviso — che cosa si scrive davvero', () => {
  it('㉑ `dall_app`: scrive le QUATTRO colonne concesse e NESSUNA altra', async () => {
    const b = banco()
    const r = await POST(req({ avviso_id: AVVISO_ID, come: 'dall_app', testo: TESTO }), params())
    expect(r.status).toBe(200)

    // 🔑 IL CONTROLLO POSITIVO del finto client: se `from` non fosse collegato,
    // tutti gli `not.toHaveBeenCalled()` di questo file passerebbero a vuoto.
    expect(mockFrom).toHaveBeenCalledWith('avvisi_dentista')

    const payload = payloadDiUpdate(b.catenaUpdate)
    // Le quattro colonne su cui esiste il GRANT (migration 20260809124517),
    // e nient'altro: `visto_dal_dentista_at` non è concesso a NESSUNO.
    expect(Object.keys(payload).sort()).toEqual(
      ['comunicato_at', 'comunicato_da', 'stato', 'testo_inviato'].sort()
    )
    expect(payload.stato).toBe('comunicato_dall_app')
    expect(payload.testo_inviato).toBe(TESTO)
  })

  it('㉑-bis `comunicato_da` viene dalla SESSIONE, e `comunicato_at` è un istante di adesso', async () => {
    const b = banco()
    const prima = Date.now()
    await POST(req({ avviso_id: AVVISO_ID, come: 'dall_app', testo: TESTO }), params())
    const payload = payloadDiUpdate(b.catenaUpdate)
    expect(payload.comunicato_da).toBe(USER_ID)
    const t = Date.parse(payload.comunicato_at as string)
    expect(Number.isNaN(t)).toBe(false)
    expect(t).toBeGreaterThanOrEqual(prima - 1000)
    expect(t).toBeLessThanOrEqual(Date.now() + 1000)
  })

  it('㉒ `a_voce`: scrive tre colonne e OMETTE `testo_inviato` (non manda `null`)', async () => {
    const b = banco({ aggiornate: [rigaChiusa({ stato: 'comunicato_a_voce', testo_inviato: null })] })
    const r = await POST(req({ avviso_id: AVVISO_ID, come: 'a_voce' }), params())
    expect(r.status).toBe(200)
    const payload = payloadDiUpdate(b.catenaUpdate)
    expect(Object.keys(payload).sort()).toEqual(['comunicato_at', 'comunicato_da', 'stato'].sort())
    expect(payload.stato).toBe('comunicato_a_voce')
  })

  it('㉒-bis la risposta porta `ok: true` e la riga salvata, non un campo calcolato', async () => {
    banco()
    const r = await POST(req({ avviso_id: AVVISO_ID, come: 'dall_app', testo: TESTO }), params())
    const body = await r.json()
    expect(body.ok).toBe(true)
    expect(body.avviso.id).toBe(AVVISO_ID)
    expect(body.avviso.stato).toBe('comunicato_dall_app')
    expect(body.avviso.comunicato_da).toBe(USER_ID)
  })

  it('㉓ OGGI nessun ruolo è escluso: i quattro ruoli legati a un laboratorio chiudono l\'avviso', async () => {
    // 🔴 NON è una decisione di Francesco: è il perimetro della rotta modello
    // (`eventi-qualita/route.ts`, nessun cancello di ruolo) reso VISIBILE. Se e
    // quando il perimetro si stringerà, questa prova deve arrossire — è ciò che
    // impedisce a un cambio di permessi di passare inosservato.
    // 🔑 E LA SECONDA ASSERZIONE NON È DECORAZIONE: con il solo `toBe(200)`
    // questa prova era l'UNICA delle 26 che passava contro l'abbozzo inerte
    // (25 su 26 → 26 su 26 dopo questa riga). Un «200» da una rotta che non
    // scrive niente non dimostra che il ruolo sia stato ammesso: dimostra solo
    // che nessuno l'ha fermato. È il difetto N3 del Task 3, trovato dal conteggio.
    for (const ruolo of ['titolare', 'tecnico', 'front_desk', 'admin_rete']) {
      const b = banco()
      mockGetFreshLabContext.mockResolvedValue({ ...CONTESTO, ruolo })
      const r = await POST(req({ avviso_id: AVVISO_ID, come: 'a_voce' }), params())
      expect(r.status, `ruolo ${ruolo}`).toBe(200)
      expect(payloadDiUpdate(b.catenaUpdate).comunicato_da, `ruolo ${ruolo}`).toBe(USER_ID)
      vi.clearAllMocks()
      mockGetFreshLabContext.mockResolvedValue(CONTESTO)
    }
  })
})
