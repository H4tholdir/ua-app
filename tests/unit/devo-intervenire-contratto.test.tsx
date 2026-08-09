import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AvvisiProvider } from '@/components/ds/Avviso'
import { DevoIntervenire } from '@/components/features/lavori/scheda-v3/DevoIntervenire'
import { MOTIVI, type Motivo } from '@/lib/domain/qualita-costanti'
import { MOTIVI_UI, SCELTA_UI, TASTO_SCELTA } from '@/lib/qualita/motivi-ui'
import { MOTIVI_CON_SCELTA, SCELTE } from '@/lib/qualita/effetti'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  IL FOGLIO PARLA CON LA ROTTA VERA — Task 10, e chiude una CATEGORIA di
 *  difetto, non un caso.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 🔴 IL FATTO CHE L'HA GENERATA, misurato dal Task 9 il 09/08/2026: **cinque
 * prove unitarie erano VERDI su un corpo che la rotta RIFIUTA.** Premevano il
 * tasto finale su «Difetto di lavorazione» senza nessuna scelta, leggevano il
 * corpo spedito e lo trovavano giusto — mentre il server avrebbe risposto
 * **422**. Nessuna di quelle prove poteva accorgersene, perché **il `fetch` è
 * finto**: una spia che registra ciò che è stato spedito non sa che cosa il
 * destinatario ne farebbe.
 *
 * 🔑 LA FORMA DELLA PROVA, ed è tutta qui: il `fetch` non viene FINTO, viene
 * **INSTRADATO**. La spia costruisce una `Request` vera e chiama la `POST` VERA
 * della rotta — quella importata da `@/app/api/lavori/[id]/eventi-qualita/route`
 * — restituendo al componente la `Response` che il server produrrebbe davvero.
 * Il corpo lo compone il foglio; a giudicarlo è il contratto, non una copia del
 * contratto. **Non esiste una terza copia della validazione**: la validazione è
 * una sola, e questa prova la ESEGUE invece di descriverla.
 *
 * 🛑 CHE COSA RESTA FINTO, e va detto invece di lasciarlo credere: il client
 * Supabase. Quindi questa prova sorveglia il confine **corpo → contratto**
 * (forma, vocabolari, coppie proibite, campi obbligatori), non ciò che accade
 * in banca dati — quello vive nei file di `tests/integration/`, che parlano col
 * database vero.
 *
 * 🛑 PERCHÉ UN FILE NUOVO e non un blocco dentro `DevoIntervenire.test.tsx` o
 * `eventi-qualita-route.test.ts`: tutti e due portano ~1700 righe di finzioni
 * costruite per il proprio soggetto (l'uno finge `fetch`, l'altro finge la
 * sessione e il banco). Mescolare le due superfici di finzione è il modo
 * classico di ottenere un verde per il motivo sbagliato.
 */

// ── le due finzioni della ROTTA (le stesse di `eventi-qualita-route.test.ts`) ──
const { mockFrom, mockRpc, mockGetFreshLabContext } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
  mockGetFreshLabContext: vi.fn(),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom, rpc: mockRpc }),
}))
vi.mock('@/lib/supabase/lab-context', () => ({ getFreshLabContext: mockGetFreshLabContext }))

// ── le due finzioni del COMPONENTE ──────────────────────────────────────────
const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('@/components/ds/useNavigaDaOverlay', () => ({ useNavigaDaOverlay: () => vi.fn() }))

import { POST as POST_EVENTO } from '@/app/api/lavori/[id]/eventi-qualita/route'

const LAVORO_ID = '11111111-1111-1111-1111-111111111111'
const LAB_ID = '22222222-2222-2222-2222-222222222222'
const UTENTE_ID = '99999999-9999-9999-9999-999999999999'
const EVENTO_ID = '44444444-4444-4444-4444-444444444444'

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

/** Catena postgrest minima: ogni metodo torna sé stesso, i terminali risolvono. */
function catena(risolvi: () => Risultato) {
  const c: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is', 'insert', 'update', 'order', 'limit', 'neq']) {
    c[m] = () => c
  }
  c.single = async () => risolvi()
  c.maybeSingle = async () => risolvi()
  c.then = (ok: (v: unknown) => void) => ok(risolvi())
  return c
}

/** L'ultima riga che la rotta ha chiesto di INSERIRE in `eventi_qualita`. */
let rigaInserita: Record<string, unknown> | null = null

function preparaBanco() {
  rigaInserita = null
  mockGetFreshLabContext.mockResolvedValue(CONTESTO)
  mockFrom.mockImplementation((tabella: string) => {
    if (tabella === 'eventi_qualita') {
      const c = catena(() => ({
        data: { id: EVENTO_ID, lavoro_id: LAVORO_ID, ...(rigaInserita ?? {}) },
        error: null,
      })) as Record<string, unknown> & { insert: unknown }
      c.insert = (riga: Record<string, unknown>) => {
        rigaInserita = riga
        return c
      }
      return c
    }
    if (tabella === 'lavori') return catena(() => ({ data: { id: LAVORO_ID, post_consegna_correzioni: 3 }, error: null }))
    return catena(() => ({ data: null, error: null }))
  })
  // Le RPC riescono: qui si misura il CONTRATTO del corpo, non il database.
  mockRpc.mockImplementation(async (nome: string) => {
    if (nome === 'crea_rifacimento_atomico') {
      return { data: { lavoro_nuovo_id: '55555555-5555-5555-5555-555555555555', numero_lavoro: '2026/0042' }, error: null }
    }
    if (nome === 'cassetta_trasferisci_rifacimento') return { data: { esito: 'niente_da_trasferire' }, error: null }
    return { data: { esito: 'ok', ddc_assente: false, ddc_viva: true }, error: null }
  })
}

/** Ogni giro registrato: il corpo composto dal foglio e la risposta VERA. */
type Giro = { corpo: Record<string, unknown>; status: number; risposta: unknown }

/**
 * 🔑 IL PONTE. `fetch` diventa un adattatore: prende ciò che il foglio ha
 * composto, ne fa una `Request` e la consegna alla `POST` vera. Al componente
 * torna la `Response` autentica, con il suo `ok` e il suo `status`.
 *
 * ⚠️ Nessuna intestazione `origin`: `isSameOrigin` (`src/lib/utils/csrf.ts:7`)
 * considera sicura una richiesta che non ne porta — è il caso server-to-server.
 * Se un giorno quella regola cambiasse, queste prove diventerebbero **rosse
 * tutte insieme**, che è la direzione giusta.
 */
function instradaVersoLaRottaVera(): Giro[] {
  const giri: Giro[] = []
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    const testo = String(init?.body ?? '{}')
    // 🛑 IL FILTRO È SULL'INTERO PERCORSO, e la trappola l'ho pagata scrivendo
    // questo file: `url.includes('/eventi-qualita')` cattura ANCHE
    // `/api/eventi-qualita/<id>/valutazioni`, che è la SECONDA rotta (il
    // giudizio, D267). Instradata sulla prima, rispondeva 422 e la schermata
    // finale non arrivava mai — un difetto della prova travestito da difetto
    // del componente.
    if (!/^\/api\/lavori\/[^/]+\/eventi-qualita$/.test(url)) {
      // Le altre chiamate del foglio (pazienti, riemissione, valutazioni) non
      // sono il soggetto di questo file: rispondono in modo inerte.
      return new Response(JSON.stringify({}), { status: 200 })
    }
    const req = new Request(`http://localhost${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: testo,
    })
    const res = await POST_EVENTO(req, { params: Promise.resolve({ id: LAVORO_ID }) })
    const copia = res.clone()
    giri.push({ corpo: JSON.parse(testo), status: res.status, risposta: await copia.json() })
    return res
  })
  return giri
}

const DOCUMENTO = {
  updatedAt: '2026-08-08T10:20:30.123456+00:00',
  clienteId: '33333333-3333-3333-3333-333333333333',
  richiedenteNome: 'Dott. Marco Ferri',
  prescrittoreMostrato: 'Dott. Marco Ferri',
  pazienteId: '66666666-6666-6666-6666-666666666666',
  pazienteMostrato: 'Mario Rossi',
  tipoDispositivo: 'protesi_fissa' as const,
  descrizione: 'Corona in zirconia su 26',
  denti: [
    {
      fdi: 26, ruolo: 'elemento', scala: 'vita_classical', codice: 'A3',
      codice_collo: null, codice_corpo: null, codice_incisale: null, provenienza: 'prescritto',
    },
  ],
  dentiMostrati: ['26'],
  prescrizione: { elementi: [26], colore: 'A3' },
}

function monta() {
  return render(
    <AvvisiProvider>
      <DevoIntervenire lavoroId={LAVORO_ID} descrizione="Corona zirconia n.147" documento={DOCUMENTO} />
    </AvvisiProvider>
  )
}

function apriElencoMotivi() {
  fireEvent.click(screen.getByRole('button', { name: /Devo intervenire/i }))
  fireEvent.click(screen.getByRole('button', { name: /Sì, devo intervenire/i }))
}

/**
 * Porta il foglio dalla riga fino all'invio, **passando dai gesti veri**: è la
 * differenza fra provare il contratto e ricomporlo a mano.
 * Restituisce `false` per i motivi che non arrivano all'invio da soli.
 */
function percorriFinoAllInvio(motivo: Motivo, scelta?: 'si_sistema' | 'si_rifa') {
  apriElencoMotivi()
  fireEvent.click(screen.getByText(MOTIVI_UI[motivo].etichetta))

  // ── I TRE PERCORSI CHE NON SONO «motivo → quattro caselle → tasto» ────────
  // 🔑 Sono esattamente i tre punti in cui il foglio compone un corpo DIVERSO,
  // ed è il motivo per cui questa prova percorre i gesti invece di ricomporre
  // il corpo a mano: una scorciatoia salterebbe proprio le strade a rischio.
  if (motivo === 'errore_registrazione') {
    // ① Percorso corto: prima la DOMANDA sul manufatto (Task A), poi si invia
    //    senza passare dalle quattro caselle.
    fireEvent.click(screen.getByRole('button', { name: 'No, è sempre rimasto qui' }))
    return
  }
  if (motivo === 'errore_dato_dichiarazione') {
    // ② L'ATTO UNICO (D308/D322): prima si corregge un dato, poi le caselle, e
    //    il tocco finale fa DUE chiamate in fila — la prima è questa rotta.
    fireEvent.click(screen.getByRole('button', { name: /Descrizione/i }))
    fireEvent.change(screen.getByLabelText('Come deve dire il documento'), {
      target: { value: 'Corona in zirconia su 25' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Usa questo/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Continua/i }))
    fireEvent.click(screen.getByRole('button', { name: /Correggi e rifai la dichiarazione/i }))
    return
  }
  if (motivo === 'altro') {
    // ③ «Altro» è l'unico motivo che porta `motivo_libero` **e** una `natura`
    //    scelta: senza la descrizione il tasto resta spento.
    fireEvent.change(screen.getByLabelText('Di che cosa si tratta?'), {
      target: { value: 'Scatola arrivata aperta' },
    })
  }
  if (scelta) {
    fireEvent.click(screen.getByRole('button', { name: SCELTA_UI[scelta] }))
    fireEvent.click(screen.getByRole('button', { name: TASTO_SCELTA[scelta] }))
    return
  }
  fireEvent.click(screen.getByRole('button', { name: 'Continua' }))
}

describe('«Devo intervenire» → la rotta VERA: il corpo composto dal foglio non può divergere dal contratto', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    preparaBanco()
  })
  afterEach(() => vi.unstubAllGlobals())

  // ═══ ① LA PROVA DI CATEGORIA — ogni strada del foglio, contro il contratto ══
  //
  // 🔑 L'elenco NON è scritto a mano: si deriva da `MOTIVI` (copiato dal CHECK
  // vivo) e da `MOTIVI_CON_SCELTA`. Un motivo nuovo entra qui **da solo**, e se
  // il foglio non sa comporne il corpo questa prova diventa rossa il giorno in
  // cui il motivo nasce, non il giorno in cui un'operatrice lo preme.
  type Strada = { nome: string; motivo: Motivo; scelta?: 'si_sistema' | 'si_rifa' }
  const STRADE: Strada[] = MOTIVI.flatMap((m): Strada[] =>
    (MOTIVI_CON_SCELTA as readonly Motivo[]).includes(m)
      ? SCELTE.map((s) => ({ nome: `${m} + ${s}`, motivo: m, scelta: s }))
      : [{ nome: m, motivo: m }]
  )

  it.each(STRADE)('$nome → la rotta VERA accetta (201), non 4xx', async ({ motivo, scelta }) => {
    const giri = instradaVersoLaRottaVera()
    monta()
    percorriFinoAllInvio(motivo, scelta)

    await waitFor(() => expect(giri.length).toBe(1))
    // 🔴 È LA RIGA CHE IL 09/08 MANCAVA. Con `fetch` finto questa asserzione non
    // era esprimibile: non c'era nessuno status da leggere.
    expect({ motivo, scelta, status: giri[0].status }).toEqual({ motivo, scelta, status: 201 })
  })

  // ═══ ② LA PROVA CHE LA PROVA MORDE ═════════════════════════════════════════
  //
  // 🛑 R-P1 — un vincolo si prova con un valore che DEVE essere rifiutato.
  // Senza questa, «tutte 201» potrebbe voler dire «il ponte non arriva alla
  // rotta»: un adattatore che rispondesse sempre 201 supererebbe la ①.
  it('🛑 il ponte arriva davvero al contratto: un corpo storto torna 422 dalla rotta VERA', async () => {
    instradaVersoLaRottaVera()
    // Il corpo che il Task 9 ha trovato verde: motivo del bivio, nessuna scelta.
    const res = await fetch(`/api/lavori/${LAVORO_ID}/eventi-qualita`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        motivo: 'difetto_lavorazione',
        origine_informazione: 'laboratorio_interno',
        stato_dispositivo: 'consegnato_non_applicato',
        conosciuto_il: new Date(Date.now() - 3600_000).toISOString(),
        potenziale_di_danno: 'da_valutare',
      }),
    })
    expect(res.status).toBe(422)
    expect((await res.json()).error).toMatch(/si sistema questo manufatto/i)
  })

  // ═══ ③ LE COPPIE PROIBITE — il foglio non le può nemmeno comporre ══════════
  //
  // 🔑 Due guardie della rotta (`route.ts`) rifiutano una COMBINAZIONE, non un
  // valore. Il Passo 4 del Task 9 ha spento a schermo una delle due; questa
  // prova verifica che la strada spenta e la strada rifiutata siano **la
  // stessa**: se un giorno la pastiglia si riaccendesse, qui si vedrebbe un 422
  // invece di un 201.
  it('🛑 «persona sbagliata» + «mai uscito»: il foglio non la compone, e se la componesse la rotta la rifiuterebbe', async () => {
    const giri = instradaVersoLaRottaVera()
    monta()
    apriElencoMotivi()
    fireEvent.click(screen.getByText(MOTIVI_UI.destinatario_errato.etichetta))

    // ① a schermo la strada è spenta
    const mai = screen.getByRole('button', { name: 'Mai uscito' })
    expect(mai.hasAttribute('disabled') || mai.getAttribute('aria-disabled') === 'true').toBe(true)

    // ② e la rotta la rifiuterebbe comunque — il confine sta lì, non nel foglio
    const res = await fetch(`/api/lavori/${LAVORO_ID}/eventi-qualita`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        motivo: 'destinatario_errato',
        origine_informazione: 'laboratorio_interno',
        stato_dispositivo: 'mai_uscito_dal_lab',
        conosciuto_il: new Date(Date.now() - 3600_000).toISOString(),
        potenziale_di_danno: 'da_valutare',
      }),
    })
    expect(res.status).toBe(422)
    expect(giri.length).toBe(1)
  })

  it('🛑 «ho premuto consegna per sbaglio» + «è uscito»: il foglio riporta all\'elenco senza spedire nulla', async () => {
    const giri = instradaVersoLaRottaVera()
    monta()
    apriElencoMotivi()
    fireEvent.click(screen.getByText(MOTIVI_UI.errore_registrazione.etichetta))
    fireEvent.click(screen.getByRole('button', { name: 'Sì, è uscito' }))

    await waitFor(() => expect(screen.getByText(MOTIVI_UI.difetto_lavorazione.etichetta)).toBeTruthy())
    expect(giri.length).toBe(0)
  })

  // ═══ ④ IL RITORNO — la risposta VERA arriva alla schermata ═════════════════
  //
  // 🔑 L'altra metà della stessa categoria: il tipo `RispostaEvento` del
  // componente è scritto a mano contro la forma che la rotta RESTITUISCE. Qui
  // il foglio rende una risposta che ha prodotto il server, non una scritta
  // dalla prova — quindi un campo rinominato nella rotta si vede a schermo.
  it('🔑 la schermata finale rende la risposta VERA della rotta, non una scritta dalla prova', async () => {
    const giri = instradaVersoLaRottaVera()
    monta()
    percorriFinoAllInvio('difetto_lavorazione', 'si_rifa')

    await waitFor(() => expect(giri.length).toBe(1))
    const risposta = giri[0].risposta as { esito_azione?: { lavoro_nuovo?: { numero_lavoro?: string } } }
    // La rotta ha davvero costruito il quarto campo, col nome del Task 7.
    expect(risposta.esito_azione?.lavoro_nuovo?.numero_lavoro).toBe('2026/0042')

    await waitFor(() => expect(screen.getByText('Ecco cosa ne penso')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Registra' }))
    await waitFor(() => expect(screen.getByText('È nato il lavoro 2026/0042')).toBeTruthy())
  })

  // ═══ ⑤ LA RIGA CHE ARRIVA IN BANCA DATI ════════════════════════════════════
  it('🔑 la scelta del bivio arriva fino alla riga da inserire, col nome di colonna vero', async () => {
    const giri = instradaVersoLaRottaVera()
    monta()
    percorriFinoAllInvio('difetto_materiale', 'si_sistema')

    await waitFor(() => expect(giri.length).toBe(1))
    expect(rigaInserita?.scelta_intervento).toBe('si_sistema')
    // 🔑 `laboratorio_id` e `created_by` non vengono MAI dal corpo: la sessione
    // li mette, e il foglio non li manda.
    expect(giri[0].corpo.laboratorio_id).toBeUndefined()
    expect(rigaInserita?.laboratorio_id).toBe(LAB_ID)
    expect(rigaInserita?.created_by).toBe(UTENTE_ID)
  })

  it('🔑 sui motivi FUORI dal bivio la chiave non parte affatto', async () => {
    const giri = instradaVersoLaRottaVera()
    monta()
    percorriFinoAllInvio('errore_dato_dichiarazione')

    await waitFor(() => expect(giri.length).toBe(1))
    expect('scelta_intervento' in giri[0].corpo).toBe(false)
    expect(giri[0].status).toBe(201)
  })

  // ═══ ⑥ CHE COSA FA DAVVERO LA ROTTA CON `null` ═════════════════════════════
  //
  // 🔄 UNA CORREZIONE, TROVATA ISTRADANDO LE PROVE E NON LEGGENDO IL CODICE.
  // Due punti in casa affermano che `scelta_intervento: null` prenda **422 su
  // ogni motivo**: il commento accanto alla composizione del corpo
  // (`DevoIntervenire.tsx:693-695`, «*`null` esplicito conta come presente per
  // quella guardia*») e il NOME di una prova esistente
  // (`DevoIntervenire.test.tsx`, «*sugli altri sette motivi la chiave è ASSENTE,
  // mai `null`: `null` prende 422*»).
  // 🛑 **È vero per DUE motivi su nove, falso per gli altri sette.** La guardia
  // della rotta è `sceltaGrezza !== undefined && sceltaGrezza !== null`
  // (`route.ts:264`): fuori dal bivio un `null` esplicito è **accettato**.
  // 🔑 Perché lo scrivo qui invece di correggere le due righe: sono fuori dal
  // mandato di questo compito (R-E2), e soprattutto **la scelta del componente
  // resta quella giusta** — omettere la chiave è più stretto di mandarla nulla.
  // Ciò che era sbagliato è la RAGIONE dichiarata, non il comportamento. E una
  // ragione falsa è pericolosa quanto un difetto: chi la legge crede di avere
  // una rete che non c'è.
  it.each([
    ['difetto_lavorazione', 'motivo DEL bivio', 422],
    ['errore_dato_dichiarazione', 'motivo FUORI dal bivio', 201],
  ])('`scelta_intervento: null` su un %s (%s) → %i', async (motivo, _quale, atteso) => {
    instradaVersoLaRottaVera()
    const res = await fetch(`/api/lavori/${LAVORO_ID}/eventi-qualita`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        motivo,
        scelta_intervento: null,
        origine_informazione: 'laboratorio_interno',
        stato_dispositivo: 'consegnato_non_applicato',
        conosciuto_il: new Date(Date.now() - 3600_000).toISOString(),
        potenziale_di_danno: 'da_valutare',
      }),
    })
    expect(res.status).toBe(atteso)
  })
})
