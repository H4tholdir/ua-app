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
//
// 🔄 QUESTA RIGA DICEVA «il perimetro per RUOLO non è deciso» ED È SUPERATA
//    (09/08/2026): ⚖️ **D342** l'ha deciso — `titolare` · `tecnico` ·
//    `front_desk` chiudono, `admin_rete` e `admin_sistema` **no, per nome**.
//    Il perimetro è **coperto**, dalle prove `㉔`-`㉙`; la vecchia `㉓`, che
//    fissava il comportamento precedente, è arrossita e si è ritirata (la nota
//    al suo posto porta la misura). ⚠️ Riscritta **qui**, dove stava la riga
//    falsa, e non aggiunta in fondo: in un file lungo vince ciò che si legge
//    per primo, e una correzione messa dopo l'affermazione che smentisce non la
//    sostituisce — la lascia in piedi (`CLAUDE.md` §9, D296).
//
//  ㉔ la allowlist contiene solo ruoli veri, ed è esattamente quella di D342
//  ㉕ i TRE ammessi                                    → 200 + riga scritta
//  ㉖ `admin_rete`                                     → 403, DB non toccato
//  ㉗ `admin_sistema` CON laboratorio valorizzato      → 403, DB non toccato
//  ㉘ i due esclusi prendono la STESSA frase           → il cancello è uno
//  ㉙ un ruolo FUORI dai cinque (`admin` nudo, …)      → 403 (allowlist, non
//     blocklist: è la sola prova che distingue le due forme)
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

import { POST, RUOLI_CHIUSURA_AVVISO } from '@/app/api/lavori/[id]/avviso/route'
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

  // ㉓ ⚰️ RITIRATA IL 09/08/2026, E HA FATTO ESATTAMENTE IL SUO LAVORO.
  // Fissava il comportamento **pre-D342** («nessun ruolo escluso»: `titolare`,
  // `tecnico`, `front_desk`, `admin_rete` → 200) proprio perché una decisione
  // futura dovesse farla arrossire invece di passare inosservata. La decisione è
  // arrivata (⚖️ D342) e **la prova è arrossita**, `misurato:`
  //   `AssertionError: ruolo admin_rete: expected 403 to be 200`
  //   ❯ tests/unit/api-avviso.test.ts:493 (la riga di allora)
  // ➡️ Il perimetro per ruolo ora sta nel blocco `㉔`-`㉙` qui sotto. Questa nota
  // resta al posto della prova perché un numero che spariva senza spiegazione
  // avrebbe lasciato credere a una dimenticanza.
})

// ═══════════════════════════════════════════════════════════════════════════
// ⚖️ D342 — CHI CHIUDE UN AVVISO STA *IN* LABORATORIO
// (verbale `2026-07-28-wizard-ondata-b-decisioni.md`, centoquarantottesima
// tornata, 09/08/2026 — «Solo chi sta in laboratorio»)
//
// Tre ammessi: `titolare` · `tecnico` · `front_desk`.
// Due esclusi: `admin_rete` · `admin_sistema`, **entrambi PER NOME**.
//
// 🛑 PERCHÉ `admin_sistema` SI PROVA CON UN LABORATORIO **VALORIZZATO**, e non
//    riusando il caso ③: con `laboratorioId: null` si prova il 403 VECCHIO
//    (`!context.laboratorioId`), che sta prima — sarebbe una prova verde per il
//    motivo sbagliato. Il cancello NUOVO si vede solo quando l'altro 403 non
//    scatta. E quello stato **è legale in banca dati**, non un'ipotesi:
//    `provato:` in transazione annullata, `UPDATE public.utenti SET
//    laboratorio_id=(un laboratorio vero) WHERE ruolo='admin_sistema'` →
//    `[2] UPDATE — 1 righe`, accettato (09/08/2026).
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /api/lavori/[id]/avviso — ⚖️ D342: chi può chiudere un avviso', () => {
  /**
   * I CINQUE ruoli veri, e la fonte è il `CHECK` su `public.utenti.ruolo`
   * (`ruolo` è `text` + CHECK, **non** un enum: `enum_range` non funziona).
   * `provato:` catalogo vivo, 09/08/2026 —
   *   `SELECT pg_get_constraintdef(oid) … WHERE conname='utenti_ruolo_check'` →
   *   `CHECK ((ruolo = ANY (ARRAY['titolare','tecnico','front_desk','admin_rete','admin_sistema'])))`
   * e, con valori che **devono** essere rifiutati (R-P1), in transazione
   * annullata: `ruolo='admin'` → `❌ 23514 … utenti_ruolo_check`;
   * `ruolo='front-desk'` (col trattino) → `❌ 23514 … utenti_ruolo_check`.
   *
   * 🛑 Una prova unitaria **non può interrogare il banco**, quindi questo elenco
   * è una seconda copia — dichiarata, con la sua misura accanto. È qui perché
   * serve a prendere il refuso che `tsc` non prende: `context.ruolo` è `string`.
   * ⚠️ E NON si legge da `supabase/schema.sql:247`, che porta un CHECK **vecchio
   * di quattro ruoli** (senza `admin_sistema`, aggiunto da
   * `001_commercial_infra.sql:8`): chi costruisse un cancello da lì ne
   * dimenticherebbe uno.
   */
  const CINQUE_RUOLI = ['titolare', 'tecnico', 'front_desk', 'admin_rete', 'admin_sistema'] as const

  it('㉔ la allowlist contiene SOLO ruoli che esistono davvero, e sono esattamente i tre di D342', () => {
    // 🔑 QUESTA È LA PROVA CHE PRENDE IL REFUSO. `context.ruolo` è `string`:
    // un `'admin'` nudo, o un `'front-desk'` col trattino, compilerebbe e
    // taglierebbe fuori in silenzio chi doveva passare.
    for (const ruolo of RUOLI_CHIUSURA_AVVISO) {
      expect(CINQUE_RUOLI as readonly string[], `«${ruolo}» non è un ruolo di questo progetto`).toContain(ruolo)
    }
    expect([...RUOLI_CHIUSURA_AVVISO].sort()).toEqual(['front_desk', 'tecnico', 'titolare'])
    // …e il complemento è ESATTAMENTE i due esclusi: se un ruolo entrasse
    // nell'allowlist senza passare da una decisione, questa riga arrossisce.
    const esclusi = CINQUE_RUOLI.filter((r) => !(RUOLI_CHIUSURA_AVVISO as readonly string[]).includes(r))
    expect([...esclusi].sort()).toEqual(['admin_rete', 'admin_sistema'])
    expect(RUOLI_CHIUSURA_AVVISO as readonly string[]).not.toContain('admin')
  })

  it('㉕ i TRE ammessi chiudono l\'avviso: 200 e la riga scritta con l\'autore giusto', async () => {
    // 🛑 I TRE NOMI SONO SCRITTI A MANO, e non presi da `RUOLI_CHIUSURA_AVVISO`.
    // Un ciclo sulla costante sarebbe **tautologico**: se qualcuno togliesse
    // `front_desk` dall'allowlist, il ciclo girerebbe su due nomi e passerebbe —
    // cioè la prova si adatterebbe al difetto invece di trovarlo. `provato:`
    // togliendo `front_desk` dall'allowlist, questa prova arrossisce
    // (`ruolo front_desk: expected 403 to be 200`), col ciclo sulla costante no.
    for (const ruolo of ['titolare', 'tecnico', 'front_desk']) {
      const b = banco()
      mockGetFreshLabContext.mockResolvedValue({ ...CONTESTO, ruolo })
      const r = await POST(req({ avviso_id: AVVISO_ID, come: 'a_voce' }), params())
      expect(r.status, `ruolo ${ruolo}`).toBe(200)
      // 🔑 Non basta il 200 (difetto N3 del Task 3, ricomparso su `㉓`): un 200
      // da una rotta che non scrive niente non dimostra che il ruolo sia
      // ammesso, dimostra che nessuno l'ha fermato.
      expect(payloadDiUpdate(b.catenaUpdate).comunicato_da, `ruolo ${ruolo}`).toBe(USER_ID)
      vi.clearAllMocks()
      mockGetFreshLabContext.mockResolvedValue(CONTESTO)
    }
  })

  it('㉖ `admin_rete` prende 403 PER NOME, senza toccare la banca dati', async () => {
    const b = banco()
    mockGetFreshLabContext.mockResolvedValue({ ...CONTESTO, ruolo: 'admin_rete' })
    const r = await POST(req({ avviso_id: AVVISO_ID, come: 'a_voce' }), params())
    expect(r.status).toBe(403)
    // 🔑 LA COPPIA, come per il 422 (`⑪`): il 403 **e** «ci è arrivato senza
    // aver provato a scrivere». Da sola nessuna delle due lo dimostra.
    expect(mockFrom).not.toHaveBeenCalled()
    expect(b.catenaUpdate.chiamate).toHaveLength(0)
    // …e la frase dice che è il RUOLO a non poterlo fare, non «non consentito».
    const body = await r.json()
    expect(body.error).toMatch(/ruolo/i)
    expect(body.error).not.toBe('Laboratorio non trovato')
  })

  it('㉗ `admin_sistema` prende 403 PER NOME anche CON un laboratorio valorizzato — non è il 403 di `!laboratorioId`', async () => {
    const b = banco()
    // 🛑 IL PUNTO DI TUTTA QUESTA PROVA: `laboratorioId` è VALORIZZATO e il
    // laboratorio è `attivo`, quindi né il 403 di `!laboratorioId` né la
    // guardia del laboratorio possono scattare — quest'ultima per
    // `admin_sistema` fa anzi «bypass totale» (`lab-guard.ts:50`).
    // ➡️ Se il 403 arriva, arriva SOLO dal cancello di D342.
    mockGetFreshLabContext.mockResolvedValue({ ...CONTESTO, ruolo: 'admin_sistema', laboratorioId: LAB_ID })
    const r = await POST(req({ avviso_id: AVVISO_ID, come: 'a_voce' }), params())
    expect(r.status).toBe(403)
    expect(mockFrom).not.toHaveBeenCalled()
    expect(b.catenaUpdate.chiamate).toHaveLength(0)
    const body = await r.json()
    expect(body.error).toMatch(/ruolo/i)
    // 🔑 E QUESTA RIGA È LA DIFFERENZA fra il cancello nuovo e quello vecchio:
    // se un giorno qualcuno rimettesse l'esclusione a carico di `!laboratorioId`,
    // la frase tornerebbe «Laboratorio non trovato» e questa prova arrossisce.
    expect(body.error).not.toBe('Laboratorio non trovato')
  })

  it('㉘ il cancello guarda il RUOLO, non il laboratorio: `admin_sistema` con laboratorio è fermato dalla stessa frase di `admin_rete`', async () => {
    // Due contesti che non hanno niente in comune se non il ruolo escluso:
    // se le due frasi coincidono, il cancello è UNO e guarda il nome.
    const frasi: string[] = []
    for (const ctx of [
      { ...CONTESTO, ruolo: 'admin_rete' },
      { ...CONTESTO, ruolo: 'admin_sistema', laboratorioId: LAB_ID },
    ]) {
      banco()
      mockGetFreshLabContext.mockResolvedValue(ctx)
      const r = await POST(req({ avviso_id: AVVISO_ID, come: 'a_voce' }), params())
      expect(r.status, `ruolo ${ctx.ruolo}`).toBe(403)
      frasi.push((await r.json()).error)
      vi.clearAllMocks()
      mockGetFreshLabContext.mockResolvedValue(CONTESTO)
    }
    expect(frasi[0]).toBe(frasi[1])
  })

  it('㉙ un ruolo FUORI dai cinque è rifiutato: è una allowlist, non una blocklist', async () => {
    // 🔑 QUESTA È LA PROVA CHE DISTINGUE UNA ALLOWLIST DA UNA BLOCKLIST, e
    // nessuna delle altre la fa. Un cancello scritto come «rifiuta `admin_rete`
    // e `admin_sistema`» supera ㉔㉕㉖㉗㉘ tutte e cinque — e il giorno in cui il
    // `CHECK` in banca dati guadagnasse un sesto ruolo, quel ruolo potrebbe
    // chiudere un adempimento di legge **senza che nessuno l'abbia deciso**.
    // Qui il verso è l'altro: fuori dall'elenco ⟹ 403, e per entrare qualcuno
    // deve scrivere il nome nell'allowlist.
    // 📌 `'admin'` nudo è nell'elenco di proposito: NON è un ruolo di questo
    // progetto (`provato:` `UPDATE … SET ruolo='admin'` → `❌ 23514 …
    // utenti_ruolo_check`), ed è il refuso classico di questa casa.
    for (const ruolo of ['admin', 'front-desk', 'apprendista', 'Titolare', '', 'TITOLARE']) {
      const b = banco()
      mockGetFreshLabContext.mockResolvedValue({ ...CONTESTO, ruolo })
      const r = await POST(req({ avviso_id: AVVISO_ID, come: 'a_voce' }), params())
      expect(r.status, `ruolo ${JSON.stringify(ruolo)}`).toBe(403)
      expect(mockFrom, `ruolo ${JSON.stringify(ruolo)}`).not.toHaveBeenCalled()
      expect(b.catenaUpdate.chiamate, `ruolo ${JSON.stringify(ruolo)}`).toHaveLength(0)
      vi.clearAllMocks()
      mockGetFreshLabContext.mockResolvedValue(CONTESTO)
    }
  })
})
