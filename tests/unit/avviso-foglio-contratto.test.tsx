import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { AvvisiProvider } from '@/components/ds/Avviso'
import { AvvisoDentista, FINESTRA_ANNULLO_AVVISO_MS } from '@/components/features/lavori/scheda-v3/AvvisoDentista'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  IL FOGLIO PARLA CON LA ROTTA VERA — Task 10-A dell'ondata «l'avviso al
 *  dentista», e chiude la STESSA categoria di difetto della riga 38, per il
 *  foglio gemello.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 🔑 IL MODELLO È `tests/unit/devo-intervenire-contratto.test.tsx`, e questo
 * file ne copia l'approccio: il `fetch` non si finge, si INSTRADA. La spia
 * costruisce una `Request` vera e chiama la `POST` autentica della rotta —
 * `import { POST } from '@/app/api/lavori/[id]/avviso/route'` — restituendo al
 * componente la `Response` che il server produrrebbe davvero. Il corpo lo
 * compone il foglio; a giudicarlo è il contratto, non una copia del contratto.
 *
 * 🛑 CHE COSA RESTA FINTO: il client Supabase (`getServiceClient`) e
 * `getFreshLabContext`. Questa prova sorveglia il confine **corpo → contratto**
 * (forma, vocabolario, il vincolo stretto `avviso_testo_solo_se_dall_app`), non
 * ciò che accade davvero in banca dati — quello vive in `api-avviso.test.ts`
 * (che finge la rotta e prova il suo comportamento in isolamento) e in
 * `tests/integration/` (che parla col database vero).
 *
 * ═══ I CONFINI, DICHIARATI E NON AFFRONTATI (mandato del Task 10-A) ═══════
 * · Il verso OPPOSTO (risposta del server → schermata «Fatto») resta APERTO,
 *   com'era per il foglio gemello dopo il Task 10: questo file non prova che
 *   `leggiRiuscita` renda davvero il corpo che la rotta ha costruito.
 * · La chiusura a LIVELLO DI TIPO (la rotta esporta il tipo del corpo e della
 *   risposta, il foglio compone `satisfies`) resta APERTA — è un cambiamento
 *   alla rotta, fuori da questo mandato (R-E2).
 *
 * ═══ LA MISURA (§2 del brief) — «quante prove si accendono» ══════════════
 * 🔑 Il censimento NON tocca `AvvisoDentista.tsx` (il brief lo chiede
 * «INTATTO»): la leva sta nel PONTE, non nel foglio. `mutaSeRichiesto` sotto
 * applica una mutazione plausibile al corpo IN TRANSITO, sempre inerte
 * (`process.env.AVVISO_MUTAZIONE` non è mai valorizzato durante una corsa
 * normale — la suite qui sotto è quindi sempre quella scritta, mai una
 * copia mutata). La misura si ottiene da FUORI, rilanciando l'intero file con
 * la variabile valorizzata e leggendo quante `it` diventano rosse — il
 * risultato reale, coi comandi e l'uscita incollata, sta nel resoconto
 * (`avviso-dentista-task-10a-report.md`), non qui: qui vive solo il
 * meccanismo, perché deve restare disponibile a chi rilancerà la misura in
 * futuro.
 * ⚠️ Divergenza dichiarata dal precedente (Task 10, `devo-intervenire`): là la
 * mutazione veniva scritta nel COMPONENTE e poi annullata (`git checkout`);
 * qui vive nel PONTE e non tocca mai un file di produzione. Le due strade
 * rispondono alla stessa domanda («quante prove noterebbero un rifacimento
 * plausibile del corpo?»), ma i numeri delle due ondate non sono la stessa
 * unità di misura — chi confronta le due cifre deve saperlo.
 */

// ── le due finzioni della ROTTA (le stesse di `api-avviso.test.ts`) ─────────
const { mockFrom, mockGetFreshLabContext } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetFreshLabContext: vi.fn(),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))
vi.mock('@/lib/supabase/lab-context', () => ({ getFreshLabContext: mockGetFreshLabContext }))

// ── le finzioni del COMPONENTE (le stesse di `AvvisoDentista.test.tsx`) ────
const refreshMock = vi.fn()
const pushMock = vi.fn()
const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock, refresh: refreshMock }),
}))

import { POST as POST_AVVISO } from '@/app/api/lavori/[id]/avviso/route'

const LAVORO_ID = '11111111-1111-1111-1111-111111111111'
const LAB_ID = '22222222-2222-2222-2222-222222222222'
const UTENTE_ID = '99999999-9999-9999-9999-999999999999'
const AVVISO_ID = '55555555-5555-5555-5555-555555555555'

/** Il formato maggioritario in banca dati, non `2026/0042` (v. modello). */
const NUMERO = 'STOR/2021/016'
const STUDIO = 'Studio Bianchi'
const LAB_NOME = 'Laboratorio Odontotecnico Formicola'
const TOKEN = 'a1b2c3d4-0000-4000-8000-000000000001'
const TELEFONO = '333 1234567'

const PROPS = {
  lavoroId: LAVORO_ID,
  avvisoId: AVVISO_ID,
  numeroLavoro: NUMERO,
  nomeStudio: STUDIO,
  pazienteMostrato: 'ROSSI MARIO',
  portalToken: TOKEN,
  nomeLaboratorio: LAB_NOME as string | null,
  telefonoStudio: TELEFONO as string | null,
}

const CONTESTO = {
  userId: UTENTE_ID,
  email: null,
  ruolo: 'titolare',
  laboratorioId: LAB_ID,
  nome: null,
  cognome: null,
  lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}

// ── il banco finto della rotta ──────────────────────────────────────────────
type Risultato = { data: unknown; error: unknown }

/** Lo stato che la VERIFICA (Ⓐ, prima della scrittura) trova per l'avviso
 *  indicato. `da_comunicare` = aperto: è il caso di successo, il più comune
 *  in questo file. */
let statoDaVerificare: Record<string, unknown> | null
/** L'ultimo oggetto passato a `.update(...)`: ciò che la rotta scriverebbe. */
let ultimoAggiornamento: Record<string, unknown> | null

/** Catena postgrest minima per una tabella che questa prova non deve toccare:
 *  ogni metodo torna sé stesso, i terminali risolvono a vuoto. */
function catenaInerte(): Record<string, unknown> {
  const c: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'in', 'is', 'order', 'limit'] as const) c[m] = () => c
  c.maybeSingle = async () => ({ data: null, error: null }) as Risultato
  c.single = async () => ({ data: null, error: null }) as Risultato
  c.then = (ok: (v: Risultato) => void) => ok({ data: [], error: null })
  return c
}

function preparaBanco() {
  statoDaVerificare = { id: AVVISO_ID, stato: 'da_comunicare' }
  ultimoAggiornamento = null
  mockGetFreshLabContext.mockResolvedValue(CONTESTO)
  mockFrom.mockImplementation((tabella: string) => {
    if (tabella !== 'avvisi_dentista') return catenaInerte()
    const c: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'in', 'is', 'order', 'limit'] as const) c[m] = () => c
    // La VERIFICA (`select(...).eq(...).eq(...).eq(...).maybeSingle()`) risolve
    // qui — un metodo esplicito, non tramite `then`.
    c.maybeSingle = async () => ({ data: statoDaVerificare, error: null }) as Risultato
    c.single = async () => ({ data: statoDaVerificare, error: null }) as Risultato
    // L'AGGIORNAMENTO (`update(...).eq(...).eq(...).in(...).select(...)`) non
    // chiama nessun terminale esplicito: la rotta fa `await` sull'intera
    // catena, e quell'`await` chiama `then`.
    c.update = (riga: Record<string, unknown>) => {
      ultimoAggiornamento = riga
      return c
    }
    c.then = (ok: (v: Risultato) => void) =>
      ok({
        data: [{ id: AVVISO_ID, lavoro_id: LAVORO_ID, cliente_id: null, ...(ultimoAggiornamento ?? {}) }],
        error: null,
      })
    return c
  })
}

// ── IL CENSIMENTO — inerte finché nessuno accende `AVVISO_MUTAZIONE` ────────
//
// 🔑 Due mutazioni, scelte per essere PLAUSIBILI (un rifacimento vero che
// qualcuno scriverebbe), non per rompere apposta:
//  · `sempre_testo` — «mandiamo sempre il testo, anche a voce»: è esattamente
//    il rifacimento contro cui mette in guardia il commento di
//    `AvvisoDentista.tsx:504` («*il corpo cambia con la strada, e non per
//    eleganza*»). Tocca SOLO il percorso «a voce» — un mutante interessante,
//    non un tappeto rosso su tutto.
//  · `rinomina_avviso_id` — un refuso di refactor (`avviso_id` → `avvisoId`,
//    la convenzione camelCase che il resto del componente usa altrove) che
//    tocca OGNI corpo, indipendentemente dalla strada.
const MUTAZIONI: Record<string, (corpo: Record<string, unknown>) => Record<string, unknown>> = {
  sempre_testo: (corpo) =>
    corpo.come === 'a_voce' ? { ...corpo, testo: 'Gliel’ho detto stamattina, di persona.' } : corpo,
  rinomina_avviso_id: (corpo) => {
    const { avviso_id, ...resto } = corpo
    return { ...resto, avvisoId: avviso_id }
  },
}

function mutaSeRichiesto(corpo: Record<string, unknown>): Record<string, unknown> {
  const nome = process.env.AVVISO_MUTAZIONE
  if (!nome) return corpo
  const f = MUTAZIONI[nome]
  if (!f) {
    throw new Error(`AVVISO_MUTAZIONE sconosciuta: «${nome}». Note: ${Object.keys(MUTAZIONI).join(', ')}`)
  }
  return f(corpo)
}

/** Ogni giro registrato: il corpo composto dal foglio (dopo un'eventuale
 *  mutazione del censimento) e la risposta VERA della rotta. */
type Giro = { corpo: Record<string, unknown>; status: number; risposta: unknown }

/**
 * 🔑 IL PONTE. `fetch` diventa un adattatore: prende ciò che il foglio ha
 * composto, ne fa una `Request` e la consegna alla `POST` vera. Al componente
 * torna la `Response` autentica, con il suo `ok` e il suo `status`.
 *
 * ⚠️ Nessuna intestazione `origin`: `isSameOrigin` (`src/lib/utils/csrf.ts:9`)
 * considera sicura una richiesta che non ne porta — il caso server-to-server.
 *
 * 🔑 Il `lavoroId` per `params` si legge dall'URL CATTURATO, non da una
 * costante: un foglio che componesse l'indirizzo sbagliato lo vedrebbe
 * comunque passare, se qui si ripiegasse su `LAVORO_ID`.
 */
function instradaVersoLaRottaVera(): Giro[] {
  const giri: Giro[] = []
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    const match = /^\/api\/lavori\/([^/]+)\/avviso$/.exec(url)
    if (!match) {
      // Questo foglio ha una sola rotta: qui per difesa, non perché serva oggi.
      return new Response(JSON.stringify({}), { status: 200 })
    }
    const [, lavoroIdDallUrl] = match
    let corpo = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
    corpo = mutaSeRichiesto(corpo)
    const testo = JSON.stringify(corpo)
    const req = new Request(`http://localhost${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: testo,
    })
    const res = await POST_AVVISO(req, { params: Promise.resolve({ id: lavoroIdDallUrl }) })
    const copia = res.clone()
    giri.push({ corpo, status: res.status, risposta: await copia.json() })
    return res
  })
  return giri
}

function monta(extra: Partial<typeof PROPS> = {}) {
  return render(
    <AvvisiProvider>
      <AvvisoDentista {...PROPS} {...extra} />
    </AvvisiProvider>
  )
}

function apriFoglio() {
  fireEvent.click(screen.getByRole('button', { name: /Avvisa il dentista/i }))
}
function stradaWhatsApp() {
  return screen.getByRole('button', { name: /Glielo mando su WhatsApp/i })
}
function stradaVoce() {
  return screen.getByRole('button', { name: /a voce/i })
}
function tastoVerde() {
  return screen.getByRole('link', { name: /Mandalo su WhatsApp/i })
}
function campoMessaggio() {
  return screen.getByLabelText(/Il messaggio che manderai/i) as HTMLTextAreaElement
}

describe('AvvisoDentista → la rotta VERA: il corpo composto dal foglio non può divergere dal contratto', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Esplicito e non lasciato all'ambiente (`api-avviso.test.ts:256`):
    // `assertLabOperativo` gira per davvero qui, e non deve dipendere da una
    // variabile che un'altra corsa potrebbe aver lasciato impostata.
    process.env.UA_LAB_GUARD_MODE = 'enforce'
    preparaBanco()
  })
  afterEach(() => vi.unstubAllGlobals())

  // ═══ ① IL PERCORSO WHATSAPP ═════════════════════════════════════════════
  it('① WhatsApp, testo modificato dall’utente → la rotta VERA accetta (200)', async () => {
    const giri = instradaVersoLaRottaVera()
    monta()
    apriFoglio()
    fireEvent.click(stradaWhatsApp())
    fireEvent.change(campoMessaggio(), {
      target: { value: 'Dottore, la dichiarazione è cambiata: la trova sul portale.' },
    })
    fireEvent.click(tastoVerde())

    await waitFor(() => expect(giri.length).toBe(1))
    // 🔴 È la riga che una prova a `fetch` finto non può scrivere: qui c'è
    // davvero uno status da leggere, prodotto dalla rotta vera.
    expect(giri[0].status).toBe(200)
    expect(giri[0].corpo).toEqual({
      avviso_id: AVVISO_ID,
      come: 'dall_app',
      testo: 'Dottore, la dichiarazione è cambiata: la trova sul portale.',
    })
  })

  // ═══ ④ LA MUTAZIONE PLAUSIBILE — IL GIUDICE È IL CONTRATTO, NON UNA COPIA ═
  it('④ una mutazione PLAUSIBILE del corpo (chiave rinominata, o chiave in più) → la rotta VERA la rifiuta', async () => {
    instradaVersoLaRottaVera()

    // Chiave rinominata: il rifacimento camelCase più ovvio da scrivere.
    const conChiaveRinominata = await fetch(`/api/lavori/${LAVORO_ID}/avviso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avvisoId: AVVISO_ID, come: 'dall_app', testo: 'Un testo plausibile.' }),
    })
    expect(conChiaveRinominata.status).toBe(422)
    expect(mockFrom).not.toHaveBeenCalled()

    // Chiave in più: un tentativo (anche innocente) di far scrivere l'autore
    // dal client invece che dalla sessione — l'allowlist la rifiuta a prescindere
    // dal valore.
    vi.clearAllMocks()
    process.env.UA_LAB_GUARD_MODE = 'enforce'
    preparaBanco()
    const conChiaveInPiu = await fetch(`/api/lavori/${LAVORO_ID}/avviso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        avviso_id: AVVISO_ID,
        come: 'dall_app',
        testo: 'Un testo plausibile.',
        comunicato_da: UTENTE_ID,
      }),
    })
    expect(conChiaveInPiu.status).toBe(422)
    expect(mockFrom).not.toHaveBeenCalled()
  })
})

/**
 * ⚖️ D351 — «A VOCE» SCRIVE DOPO UNA FINESTRA DI `FINESTRA_ANNULLO_AVVISO_MS`:
 * qui servono orologi finti, avanzati a mano dentro `act` — MAI `waitFor`
 * dentro questo blocco (gira su `setTimeout`, che è finto: resterebbe appesa,
 * lezione già scritta in `AvvisoDentista.test.tsx:398`).
 */
describe('AvvisoDentista → la rotta VERA: la strada «a voce» (finestra ⚖️ D351, orologi finti)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UA_LAB_GUARD_MODE = 'enforce'
    preparaBanco()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  /** Fa scorrere la finestra fino in fondo e lascia risolvere la richiesta,
   *  poi un giro a vuoto in più per i microtask che restano indietro. */
  async function scadeLaFinestra() {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FINESTRA_ANNULLO_AVVISO_MS + 20)
    })
    await act(async () => {})
  }

  // ═══ ② IL PERCORSO «A VOCE» ═══════════════════════════════════════════════
  it('② «l’ho avvisato io, a voce», senza testo → la rotta VERA accetta (200)', async () => {
    const giri = instradaVersoLaRottaVera()
    monta()
    apriFoglio()
    fireEvent.click(stradaVoce())
    await scadeLaFinestra()

    expect(giri.length).toBe(1)
    expect(giri[0].status).toBe(200)
    expect(giri[0].corpo).toEqual({ avviso_id: AVVISO_ID, come: 'a_voce' })
  })

  // ═══ ③ «A VOCE» CON UN TESTO GIÀ IN MANO ══════════════════════════════════
  //
  // 🔑 Lo stato `testo` è UNO SOLO, condiviso dalle due strade
  // (`AvvisoDentista.tsx:288-290`): nasce già valorizzato da `buildAvvisoMessage`
  // al montaggio, prima ancora che qualcuno apra il passo del messaggio. Qui si
  // passa dal passo WhatsApp solo per CONFERMARE che quel testo è davvero «in
  // mano» (non vuoto), poi si torna alla scelta e si prende la strada «a voce»:
  // la coppia dimostra che il foglio compone giusto (non lo manda) **e** che la
  // rotta rifiuterebbe il contrario (lo manderebbe → 422).
  it('③ «a voce» con un testo già in mano: il foglio non lo manda, e se lo mandasse la rotta lo rifiuterebbe (422)', async () => {
    const giri = instradaVersoLaRottaVera()
    monta()
    apriFoglio()
    fireEvent.click(stradaWhatsApp())
    expect(campoMessaggio().value.trim().length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: /Torna alla scelta/i }))

    fireEvent.click(stradaVoce())
    await scadeLaFinestra()

    expect(giri.length).toBe(1)
    expect(giri[0].status).toBe(200)
    expect('testo' in giri[0].corpo).toBe(false)

    // E se lo mandasse — la metà che il foglio non può dimostrare da solo:
    const res = await fetch(`/api/lavori/${LAVORO_ID}/avviso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avviso_id: AVVISO_ID, come: 'a_voce', testo: 'Gliel’ho detto io, a voce.' }),
    })
    expect(res.status).toBe(422)
  })
})
