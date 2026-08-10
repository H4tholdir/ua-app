import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { AvvisiProvider } from '@/components/ds/Avviso'
// 🔑 LA DURATA DELLA FINESTRA SI IMPORTA, NON SI RICOPIA: due copie dello stesso
//    numero divergono alla prima modifica, e la prova finirebbe a sorvegliare un
//    numero che il componente non usa più (R-P6).
import {
  AvvisoDentista,
  quandoLeggibile,
  FINESTRA_ANNULLO_AVVISO_MS,
} from '@/components/features/lavori/scheda-v3/AvvisoDentista'
// 🔑 IL TESTO PROPOSTO NON SI RICOPIA QUI: è quello di `buildAvvisoMessage`, e la
//    firma è quella di `firmaMessaggio` (⚖️ D345). Se un giorno cambia la forma
//    del messaggio, queste prove la seguono invece di fissarla una seconda volta.
import { buildAvvisoMessage } from '@/lib/avvisi/messaggio'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'

/**
 * «Avvisa il dentista» (Task 5) — il foglio della VARIANTE A2, ⚖️ D344.
 *
 * 🔑 LE DECISIONI CHE QUESTE PROVE SORVEGLIANO, e non i pixel:
 *   ⚖️ D335/D344 — le due strade valgono UGUALE, e la parità non è solo la tinta
 *      delle righe: è anche il **numero di tocchi**. Una strada da un tocco e una
 *      da due non sono pari, e la corta diventa la strada che si prende — cioè il
 *      difetto per cui la variante A1 è stata scartata.
 *   ⚖️ D334 — il testo è modificabile, e **quello modificato è quello spedito**.
 *   ⚖️ D339 — nessuna bozza si conserva: si registra solo il testo mandato.
 *   ⚖️ D331 — l'app propone, la persona manda. Quel che resta scritto è
 *      un'**autodichiarazione**: nessuna prova qui dice, né fa credere, che l'app
 *      sappia se il messaggio è davvero partito.
 *   ⚖️ D345 — la firma è il nome del laboratorio, non una costante.
 *   🛑 Il vincolo in banca dati (`avviso_testo_solo_se_dall_app`) è STRETTO: con
 *      «l'ho avvisato a voce» il corpo **non porta `testo`**, o la rotta risponde
 *      422 (`src/app/api/lavori/[id]/avviso/route.ts:317-324`).
 */

const refreshMock = vi.fn()
const pushMock = vi.fn()
const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock, refresh: refreshMock }),
}))

// 🛑 Si finge l'HOOK, non il router (CLAUDE.md §9): in jsdom
//    `cediEntryAllaNavigazione()` ripiega comunque su `router.push`, quindi
//    guardando il router un `push` nudo e l'hook sarebbero indistinguibili.
//    Questo foglio non naviga da nessuna parte — la spia resta a zero, ed è
//    proprio ciò che si prova.
const navigaMock = vi.fn()
vi.mock('@/components/ds/useNavigaDaOverlay', () => ({ useNavigaDaOverlay: () => navigaMock }))

const LAVORO_ID = '11111111-1111-1111-1111-111111111111'
const AVVISO_ID = '55555555-5555-5555-5555-555555555555'
/** Il formato maggioritario in banca dati (276 righe su 299), non `2026/0042`. */
const NUMERO = 'STOR/2021/016'
const STUDIO = 'Studio Bianchi'
const LAB = 'Laboratorio Odontotecnico Formicola'
const TOKEN = 'a1b2c3d4-0000-4000-8000-000000000001'
const TELEFONO = '333 1234567'

const PROPS = {
  lavoroId: LAVORO_ID,
  avvisoId: AVVISO_ID,
  numeroLavoro: NUMERO,
  nomeStudio: STUDIO,
  pazienteMostrato: 'ROSSI MARIO',
  portalToken: TOKEN,
  nomeLaboratorio: LAB as string | null,
  telefonoStudio: TELEFONO as string | null,
}

function monta(extra: Partial<typeof PROPS> = {}) {
  return render(
    <AvvisiProvider>
      <AvvisoDentista {...PROPS} {...extra} />
    </AvvisiProvider>
  )
}

/** L'ora salvata dalla rotta, costruita sull'orologio LOCALE: un ISO fisso
 *  renderebbe la lettura «oggi alle 14:32» dipendente dal fuso della macchina. */
function oraSalvata(): string {
  const d = new Date()
  d.setHours(14, 32, 0, 0)
  return d.toISOString()
}

/** La risposta della rotta, che porta **la riga davvero salvata** (Task 4). */
function rispostaOk(stato = 'comunicato_dall_app', comunicatoAt: string | null = oraSalvata()) {
  return {
    ok: true,
    avviso: {
      id: AVVISO_ID,
      lavoro_id: LAVORO_ID,
      cliente_id: '22222222-2222-2222-2222-222222222222',
      stato,
      comunicato_at: comunicatoAt,
      comunicato_da: '33333333-3333-3333-3333-333333333333',
      testo_inviato: null,
    },
  }
}

type Spia = ReturnType<typeof vi.fn>

function fingiRotta(risposta?: unknown, ok = true): Spia {
  const corpo = risposta ?? rispostaOk()
  const spia = vi.fn().mockResolvedValue({ ok, json: async () => corpo })
  vi.stubGlobal('fetch', spia)
  return spia
}

function corpoDi(spia: Spia, i = 0): Record<string, unknown> {
  const chiamata = spia.mock.calls[i] as [string, RequestInit]
  return JSON.parse(chiamata[1].body as string) as Record<string, unknown>
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
function testoDelFoglio(): string {
  return document.querySelector('[role="dialog"]')?.textContent ?? ''
}

describe('AvvisoDentista — la riga sulla scheda', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  it('la riga dice DOVE si va, e il fatto in una riga sola', () => {
    monta()
    const riga = screen.getByRole('button', { name: /Avvisa il dentista/i })
    expect(riga.textContent).toContain('La dichiarazione è stata rifatta')
  })

  it('la riga non apre niente da sola: il foglio compare al tocco', () => {
    monta()
    expect(screen.queryByRole('heading', { name: /Come avvisi il dentista/i })).toBeNull()
    apriFoglio()
    expect(screen.getByRole('heading', { name: 'Come avvisi il dentista?' })).toBeTruthy()
  })
})

describe('AvvisoDentista — passo 1: DUE STRADE PARI (⚖️ D335 · D344)', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  it('una domanda sola, e due risposte (L1)', () => {
    monta()
    apriFoglio()
    expect(screen.getByRole('heading', { name: 'Come avvisi il dentista?' })).toBeTruthy()
    expect(stradaWhatsApp()).toBeTruthy()
    expect(stradaVoce()).toBeTruthy()
  })

  it('🛑 le due righe hanno lo STESSO peso visivo: fondo, filo, raggio, altezza', () => {
    monta()
    apriFoglio()
    const a = stradaWhatsApp()
    const b = stradaVoce()
    expect(a.style.background).toBe(b.style.background)
    expect(a.style.border).toBe(b.style.border)
    expect(a.style.borderRadius).toBe(b.style.borderRadius)
    expect(a.style.minHeight).toBe(b.style.minHeight)
    // 🛑 E nessuna delle due è un tasto fisico: sul passo della scelta non esiste
    //    un tasto primario, o una delle due sarebbe la strada suggerita (A1).
    expect(a.style.background).not.toContain('gradient')
    expect(b.style.background).not.toContain('gradient')
  })

  it('entrambe portano il gallone «entra»: promettono un passo, non un atto', () => {
    monta()
    apriFoglio()
    expect(stradaWhatsApp().textContent).toContain('›')
    expect(stradaVoce().textContent).toContain('›')
  })

  /**
   * 🔄 QUESTA PROVA DICEVA IL CONTRARIO, ED È STATA RISCRITTA — non aggiustata.
   * Fino al 09/08/2026 si chiamava «*e lo stesso NUMERO DI TOCCHI: nessuna delle
   * due scrive al primo tocco*», e sorvegliava la tesi del Task 5: che la parità
   * di ⚖️ D335 fosse **anche** parità di tocchi. ⚖️ **D351 l'ha ribaltata**
   * («*Un tocco solo*»), e questa prova è **arrossita** — cioè ha fatto il suo
   * mestiere: era davvero la guardia di quella decisione.
   *
   * ➡️ Ciò che resta da sorvegliare è **il conto vero**, scritto nei numeri, così
   * che nessuno possa cambiarlo per distrazione: dalla scheda, WhatsApp costa
   * **tre** tocchi (apri · scegli · manda) e «a voce» **due** (apri · scegli).
   */
  it('⚖️ D351 — «a voce» chiude in DUE tocchi (apri · scegli): nessun passo di conferma', () => {
    const spia = fingiRotta()
    monta()
    apriFoglio() // 1
    fireEvent.click(stradaVoce()) // 2 → la scrittura è PROGRAMMATA, non chiesta
    // 🛑 Il tasto di conferma del Task 5 NON esiste più.
    expect(screen.queryByRole('button', { name: /^Sì, l’ho avvisato io$/ })).toBeNull()
    // 🛑 Ma il tocco non ha scritto: al suo posto c'è la via di fuga (L6).
    expect(spia).not.toHaveBeenCalled()
    const foglio = screen.getByRole('dialog')
    expect(within(foglio).getByRole('button', { name: 'Annulla' })).toBeTruthy()
  })

  it('⚖️ D334 — e su WhatsApp restano TRE: il passo del messaggio non si tocca', async () => {
    const spia = fingiRotta()
    monta()
    apriFoglio() // 1
    fireEvent.click(stradaWhatsApp()) // 2
    expect(spia).not.toHaveBeenCalled()
    fireEvent.click(tastoVerde()) // 3
    await waitFor(() => expect(spia).toHaveBeenCalledTimes(1))
  })

  it('«Perché te lo chiedo» dice che il promemoria non si spegne da solo', () => {
    monta()
    apriFoglio()
    expect(screen.getByText(/Perché te lo chiedo/i)).toBeTruthy()
    expect(screen.getByText(/non si spegne da solo/i)).toBeTruthy()
  })

  it('il colore non è l’unica fonte di stato: ogni strada porta le sue parole (L3)', () => {
    monta()
    apriFoglio()
    expect(stradaWhatsApp().textContent).toContain('lo puoi cambiare')
    expect(stradaVoce().textContent).toContain('l’hai fatto tu')
  })
})

// ⚖️ D358 (tornata 154, chiude M-T6-1) — IL FOGLIO A SCHERMO (passo 1, la
// domanda), NON il messaggio WhatsApp: `buildAvvisoMessage` ha una sua prova
// dedicata più sotto e non è toccata qui.
describe('AvvisoDentista — ⚖️ D358: il foglio senza nome paziente usa il numero del lavoro', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  it('col nome del paziente presente, la frase NON cambia (invariato)', () => {
    monta() // PROPS di default: pazienteMostrato: 'ROSSI MARIO'
    apriFoglio()
    const testo = testoDelFoglio()
    expect(testo).toContain('Hai rifatto la dichiarazione di')
    expect(testo).toContain('ROSSI MARIO')
    expect(testo).not.toContain(NUMERO)
  })

  // 🔴 QUESTA PROVA DEVE FALLIRE CONTRO IL CODICE DI OGGI (RED vero, dichiarato
  //    dal brief): oggi, senza `paziente_nome_snapshot`, `pazienteMostrato`
  //    arriva come `'—'` (`SchedaLavoroV3.tsx:413` —
  //    `lavoro.paziente_nome_snapshot ?? '—'`) e il foglio stampa sempre «Hai
  //    rifatto la dichiarazione di —», mai il numero del lavoro.
  it('senza nome del paziente (pazienteMostrato "—"), la frase usa il NUMERO del lavoro', () => {
    monta({ pazienteMostrato: '—' })
    apriFoglio()
    const testo = testoDelFoglio()
    expect(testo).toContain(`Hai rifatto la dichiarazione del lavoro #${NUMERO}`)
    expect(testo).not.toContain('dichiarazione di —')
  })

  it('senza nome del paziente, il resto della frase resta invariato', () => {
    monta({ pazienteMostrato: '—' })
    apriFoglio()
    const testo = testoDelFoglio()
    expect(testo).toContain(`Scegli come far sapere a ${STUDIO} che quella in mano non vale più`)
  })
})

describe('AvvisoDentista — la strada di WhatsApp (⚖️ D331 · D334)', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  function apriMessaggio() {
    apriFoglio()
    fireEvent.click(stradaWhatsApp())
  }

  it('il testo proposto è quello di `buildAvvisoMessage`, firmato col nome del laboratorio', () => {
    monta()
    apriMessaggio()
    const atteso = buildAvvisoMessage({ numeroLavoro: NUMERO, portalToken: TOKEN, nomeLaboratorio: LAB })
    expect(campoMessaggio().value).toBe(atteso)
    expect(atteso).toContain(`— ${LAB}`)
  })

  it('🛑 il testo non nomina mai il paziente, benché il foglio lo mostri', () => {
    monta()
    apriMessaggio()
    expect(campoMessaggio().value).not.toContain('ROSSI')
    expect(campoMessaggio().value).not.toContain('MARIO')
  })

  it('⚖️ D334 — il testo MODIFICATO è quello che parte: nel collegamento e nel registrato', async () => {
    const spia = fingiRotta()
    monta()
    apriMessaggio()
    fireEvent.change(campoMessaggio(), { target: { value: 'Dottore, la dichiarazione è cambiata.' } })

    expect(tastoVerde().getAttribute('href')).toContain(
      encodeURIComponent('Dottore, la dichiarazione è cambiata.')
    )

    fireEvent.click(tastoVerde())
    await waitFor(() => expect(spia).toHaveBeenCalledTimes(1))
    expect(corpoDi(spia).testo).toBe('Dottore, la dichiarazione è cambiata.')
  })

  it('il corpo per «dall_app» porta ESATTAMENTE le tre chiavi del contratto', async () => {
    const spia = fingiRotta()
    monta()
    apriMessaggio()
    fireEvent.click(tastoVerde())
    await waitFor(() => expect(spia).toHaveBeenCalledTimes(1))
    expect(Object.keys(corpoDi(spia)).sort()).toEqual(['avviso_id', 'come', 'testo'])
    expect(corpoDi(spia).come).toBe('dall_app')
    expect(corpoDi(spia).avviso_id).toBe(AVVISO_ID)
    const chiamata = spia.mock.calls[0] as [string, RequestInit]
    expect(chiamata[0]).toBe(`/api/lavori/${LAVORO_ID}/avviso`)
    expect(chiamata[1].method).toBe('POST')
  })

  it('🔑 l’apertura di WhatsApp e la registrazione stanno nello STESSO gesto', async () => {
    const spia = fingiRotta()
    monta()
    apriMessaggio()
    const link = tastoVerde()
    // Il collegamento resta un collegamento: si apre da sé, dentro il gesto della
    // persona — nessuna finestra aperta da noi dopo un `await`.
    expect(link.getAttribute('href')?.startsWith('https://wa.me/')).toBe(true)
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
    expect(spia).not.toHaveBeenCalled()
    fireEvent.click(link)
    await waitFor(() => expect(spia).toHaveBeenCalledTimes(1))
  })

  it('🛑 un doppio tocco registra UNA volta sola', async () => {
    const spia = fingiRotta()
    monta()
    apriMessaggio()
    const link = tastoVerde()
    fireEvent.click(link)
    fireEvent.click(link)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Fatto' })).toBeTruthy())
    expect(spia).toHaveBeenCalledTimes(1)
  })

  it('🛑 campo svuotato: il tasto verde non c’è, quello spento dice cosa manca, e non si registra niente', () => {
    const spia = fingiRotta()
    monta()
    apriMessaggio()
    fireEvent.change(campoMessaggio(), { target: { value: '   ' } })
    expect(screen.queryByRole('link', { name: /Mandalo su WhatsApp/i })).toBeNull()
    const spento = screen.getByRole('button', { name: /Mandalo su WhatsApp/i })
    expect(spento).toBeDisabled()
    expect(screen.getByText(/Senza testo non c’è niente da mandare/i)).toBeTruthy()
    fireEvent.click(spento)
    expect(spia).not.toHaveBeenCalled()
  })

  it('il tetto del testo è quello della rotta: 1000 caratteri', () => {
    monta()
    apriMessaggio()
    expect(campoMessaggio()).toHaveAttribute('maxlength', '1000')
  })

  it('e si torna alla scelta senza scrivere niente', async () => {
    const spia = fingiRotta()
    monta()
    apriMessaggio()
    fireEvent.click(screen.getByRole('button', { name: /Torna alla scelta/i }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Come avvisi il dentista?' })).toBeTruthy())
    expect(spia).not.toHaveBeenCalled()
  })
})

/**
 * ⚖️ D351 — «A VOCE» CON UN TOCCO, E LA VIA DI FUGA CHE VIVE **DOPO**.
 *
 * 🔴 QUESTO È IL BLOCCO CHE IL TASK 5-BIS HA RIFATTO. Prima queste prove
 * sorvegliavano un **passo di conferma**; oggi sorvegliano una **finestra**: il
 * tocco programma, per dieci secondi non parte niente, e un «Annulla» sta a
 * schermo. Il vincolo stretto in banca dati (`avviso_testo_solo_se_dall_app`) è
 * rimasto identico e va sorvegliato uguale — cambia **quando** parte la
 * richiesta, non **che cosa** porta.
 *
 * 🛑 QUI GLI OROLOGI SONO FINTI, e con loro NON si usa `waitFor`: la sua attesa
 *    gira su `setTimeout`, che è finto — e il rilevamento automatico degli
 *    orologi finti di Testing Library cerca `jest`, che in questo progetto non
 *    esiste. Una `waitFor` qui resterebbe appesa. Si avanza a mano, dentro `act`.
 */
describe('AvvisoDentista — ⚖️ D351: la finestra di «a voce» (Legge 6)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  /** Un tocco solo: apri, scegli. Da qui la scrittura è **programmata**. */
  function tocca() {
    apriFoglio()
    fireEvent.click(stradaVoce())
  }

  /** Fa scorrere la finestra fino in fondo e lascia risolvere la richiesta. */
  async function scadeLaFinestra() {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FINESTRA_ANNULLO_AVVISO_MS + 20)
    })
  }

  async function passano(ms: number) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms)
    })
  }

  it('🛑 per tutta la finestra NON parte nessuna richiesta: in banca dati non cambia niente', async () => {
    const spia = fingiRotta(rispostaOk('comunicato_a_voce'))
    monta()
    tocca()
    await passano(FINESTRA_ANNULLO_AVVISO_MS - 100)
    expect(spia).not.toHaveBeenCalled()
  })

  /**
   * 🔑 IL NUMERO DELLA FINESTRA È QUELLO DELLA LEGGE 6, e questa prova lo lega al
   * suo motivo: §1 promette «*"Annulla" leggibile senza scrollare, entro 10s
   * dall'azione*». Una finestra più corta violerebbe la legge **col suo stesso
   * numero** — chi reagisce all'ottavo secondo non troverebbe più niente.
   */
  it('🔑 la via di fuga c\'è ancora al decimo secondo (è il numero che L6 promette)', async () => {
    fingiRotta(rispostaOk('comunicato_a_voce'))
    monta()
    tocca()
    await passano(9_900)
    expect(FINESTRA_ANNULLO_AVVISO_MS).toBeGreaterThanOrEqual(10_000)
    const foglio = screen.getByRole('dialog')
    expect(within(foglio).getByRole('button', { name: 'Annulla' })).toBeTruthy()
  })

  it('allo scadere la scrittura parte, e il corpo NON porta `testo` (il vincolo lo rifiuterebbe con un 422)', async () => {
    const spia = fingiRotta(rispostaOk('comunicato_a_voce'))
    monta()
    tocca()
    await scadeLaFinestra()
    expect(spia).toHaveBeenCalledTimes(1)
    const corpo = corpoDi(spia)
    expect(Object.keys(corpo).sort()).toEqual(['avviso_id', 'come'])
    expect('testo' in corpo).toBe(false)
    expect(corpo.come).toBe('a_voce')
  })

  it('🔴 «Annulla» ferma la scrittura: non parte MAI, e si torna alla domanda', async () => {
    const spia = fingiRotta(rispostaOk('comunicato_a_voce'))
    monta()
    tocca()
    const foglio = screen.getByRole('dialog')
    fireEvent.click(within(foglio).getByRole('button', { name: 'Annulla' }))
    expect(screen.getByRole('heading', { name: 'Come avvisi il dentista?' })).toBeTruthy()
    // 🛑 E non parte nemmeno dopo: l'orologio è stato fermato, non rimandato.
    await passano(FINESTRA_ANNULLO_AVVISO_MS * 3)
    expect(spia).not.toHaveBeenCalled()
  })

  it('🔑 la rilettura di ciò che resterà scritto è RIMASTA: D351 ha tolto il tocco, non la lettura', () => {
    monta()
    tocca()
    const foglio = testoDelFoglio()
    expect(foglio).toContain('a voce')
    expect(foglio).toContain(NUMERO)
    expect(foglio).toContain(STUDIO)
  })

  it('🛑 e non promette un orologio che non ha ancora: nessuna ora prima della scrittura', () => {
    monta()
    tocca()
    expect(testoDelFoglio()).not.toMatch(/alle \d{2}:\d{2}/)
  })

  it('🛑 il titolo non dice «fatto» finché non è fatto: per quei secondi niente è scritto', () => {
    monta()
    tocca()
    expect(screen.getByRole('heading', { name: 'Lo segno fra un attimo' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Fatto' })).toBeNull()
  })

  it('🛑 un doppio tocco apre UNA finestra sola e scrive UNA volta sola', async () => {
    const spia = fingiRotta(rispostaOk('comunicato_a_voce'))
    monta()
    apriFoglio()
    const riga = stradaVoce()
    fireEvent.click(riga)
    fireEvent.click(riga)
    await scadeLaFinestra()
    expect(spia).toHaveBeenCalledTimes(1)
  })

  /**
   * 🔴 CHIUDERE IL FOGLIO NON È ANNULLARE, e questa è la prova che tiene in piedi
   * il «tocco solo»: chi tocca e va via ha chiuso l'obbligo. Se la chiusura
   * fermasse la scrittura, D351 non chiuderebbe niente nel caso normale.
   * 🔑 E la via di fuga NON scompare con il foglio: prende il posto della riga
   * sulla scheda, come fa `AnnullaConsegnaBanner` per la consegna.
   */
  it('🔴 chiuso il foglio, la scrittura parte comunque E la via di fuga resta sulla scheda', async () => {
    const spia = fingiRotta(rispostaOk('comunicato_a_voce'))
    monta()
    tocca()
    const foglio = screen.getByRole('dialog')
    fireEvent.click(within(foglio).getByRole('button', { name: 'Chiudi' }))
    await passano(100)
    expect(screen.queryByRole('dialog')).toBeNull()

    // La striscia ha preso il posto della riga: la via di fuga è ancora lì…
    const striscia = screen.getByRole('status')
    expect(striscia.textContent).toContain('puoi ancora fermarmi')
    expect(within(striscia).getByRole('button', { name: 'Annulla' })).toBeTruthy()
    // …e la riga «Avvisa il dentista» non è raggiungibile: la domanda è già stata
    // risposta, e riaprirla offrirebbe di rispondere due volte.
    expect(screen.queryByRole('button', { name: /Avvisa il dentista/i })).toBeNull()

    await scadeLaFinestra()
    expect(spia).toHaveBeenCalledTimes(1)
  })

  it('🔴 e a foglio chiuso la riuscita NON riapre il foglio: rinfresca la pagina', async () => {
    fingiRotta(rispostaOk('comunicato_a_voce'))
    monta()
    tocca()
    const foglio = screen.getByRole('dialog')
    fireEvent.click(within(foglio).getByRole('button', { name: 'Chiudi' }))
    await scadeLaFinestra()
    // 🛑 Nessun overlay comparso da solo: un foglio che si apre dieci secondi
    //    dopo, senza che nessuno l'abbia toccato, è un'imboscata.
    expect(screen.queryByRole('dialog')).toBeNull()
    // 🔑 E il rinfresco NON aspetta una chiusura che non verrà più.
    expect(refreshMock).toHaveBeenCalledTimes(1)
  })

  /**
   * 🔴 IL CASO STRETTO: si chiude il foglio **all'ultimo istante**, e la finestra
   * scade nello stesso gesto. È il momento in cui «il foglio è aperto?» viene
   * riletta da chi decide il passo e da chi decide il rinfresco: se i due
   * rispondessero diverso, il rinfresco resterebbe appeso a una chiusura che non
   * arriverà più e la riga rimarrebbe a schermo su un promemoria spento.
   * 🛑 In jsdom gli effetti si svuotano dentro `act`, quindi questa prova **non
   *    riproduce** il ritardo di un commit: la difesa vera è strutturale (una
   *    lettura sola, `passoRef` aggiornato da `vaiA`). Questa prova fissa il
   *    COMPORTAMENTO atteso, e lo dico invece di far credere che dimostri di più.
   */
  it('🔴 chiusura all’ultimo istante e finestra che scade insieme: un rinfresco solo, nessun foglio', async () => {
    const spia = fingiRotta(rispostaOk('comunicato_a_voce'))
    monta()
    tocca()
    await passano(FINESTRA_ANNULLO_AVVISO_MS - 200)
    const foglio = screen.getByRole('dialog')
    fireEvent.click(within(foglio).getByRole('button', { name: 'Chiudi' }))
    await passano(400)
    expect(spia).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(refreshMock).toHaveBeenCalledTimes(1)
    // E la striscia se ne è andata: non è rimasta una finestra senza scrittura.
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('a foglio APERTO la riuscita porta al passo «Fatto», e il rinfresco resta alla chiusura', async () => {
    fingiRotta(rispostaOk('comunicato_a_voce'))
    monta()
    tocca()
    await scadeLaFinestra()
    expect(screen.getByRole('heading', { name: 'Fatto' })).toBeTruthy()
    expect(testoDelFoglio()).toContain('a voce')
    expect(refreshMock).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /Ho capito/i }))
    await passano(50)
    expect(refreshMock).toHaveBeenCalledTimes(1)
  })

  it('🛑 se la rotta non manda l’ora, si rilegge senza orologio — mai un «undefined»', async () => {
    fingiRotta(rispostaOk('comunicato_a_voce', null))
    monta()
    tocca()
    await scadeLaFinestra()
    expect(screen.getByRole('heading', { name: 'Fatto' })).toBeTruthy()
    expect(testoDelFoglio()).not.toContain('undefined')
    expect(testoDelFoglio()).not.toMatch(/alle \d{2}:\d{2}/)
  })

  /**
   * 🔴 IL RAMO CHE UNA FINESTRA SCADUTA RENDE RAGGIUNGIBILE: la scrittura parte e
   * fallisce. Niente è uscito verso il dentista e niente è stato scritto, quindi
   * si torna alla DOMANDA — non si resta su una finestra scaduta e vuota, che è
   * il difetto che questa prova esiste per impedire.
   */
  it('🔴 se la scrittura fallisce si torna alla domanda, e il foglio non resta vuoto', async () => {
    fingiRotta({ error: 'Non sono riuscita a segnare l’avviso come comunicato: riprova fra un momento.' }, false)
    monta()
    tocca()
    await scadeLaFinestra()
    expect(screen.getByRole('heading', { name: 'Come avvisi il dentista?' })).toBeTruthy()
    expect(stradaVoce()).toBeTruthy()
    expect(refreshMock).not.toHaveBeenCalled()
  })

  it('la rete assente si racconta allo stesso modo, e il promemoria resta aperto', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('rete assente')))
    monta()
    tocca()
    await scadeLaFinestra()
    expect(screen.getByRole('heading', { name: 'Come avvisi il dentista?' })).toBeTruthy()
    expect(refreshMock).not.toHaveBeenCalled()
  })

  /** L6 chiede la via di fuga **leggibile senza scorrere**, e le regole di casa un
   *  bersaglio ≥ 44 px. Il numero che scende è un aiuto per gli occhi, quindi è
   *  `aria-hidden`: il limite lo dicono le PAROLE, una volta sola. */
  it('la via di fuga è un bersaglio ≥ 44px, e il conto alla rovescia non parla alla voce sintetica', () => {
    monta()
    tocca()
    const foglio = screen.getByRole('dialog')
    const annulla = within(foglio).getByRole('button', { name: 'Annulla' })
    expect(parseFloat(annulla.style.minHeight)).toBeGreaterThanOrEqual(44)
    // Il limite è detto a parole, dentro il pannello.
    expect(testoDelFoglio()).toMatch(/fra pochi secondi/i)
    // Il numero c'è, ma non ha voce.
    const contatore = foglio.querySelector('[aria-hidden="true"]')
    expect(contatore).toBeTruthy()
    expect(testoDelFoglio()).toMatch(/\d+″/)
  })
})

describe('AvvisoDentista — il caso peggiore: il messaggio è partito e la registrazione no', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  async function invioConRottaRotta(): Promise<Spia> {
    const spia = fingiRotta(
      { error: 'Non sono riuscita a segnare l’avviso come comunicato: riprova fra un momento.' },
      false
    )
    monta()
    apriFoglio()
    fireEvent.click(stradaWhatsApp())
    fireEvent.click(tastoVerde())
    await waitFor(() => expect(spia).toHaveBeenCalledTimes(1))
    return spia
  }

  it('🔴 lo dice per intero: il messaggio è partito, la registrazione no', async () => {
    await invioConRottaRotta()
    await waitFor(() => expect(screen.getByText(/Il messaggio è partito/i)).toBeTruthy())
  })

  it('🛑 e non si rimanda: al posto del tasto verde una registrazione che non riapre WhatsApp', async () => {
    const spia = await invioConRottaRotta()
    await waitFor(() => expect(screen.queryByRole('link', { name: /Mandalo su WhatsApp/i })).toBeNull())
    fireEvent.click(screen.getByRole('button', { name: /Registra l’avviso/i }))
    await waitFor(() => expect(spia).toHaveBeenCalledTimes(2))
  })

  it('🛑 il testo diventa di sola lettura: si registra QUELLO CHE È PARTITO, non uno riscritto dopo', async () => {
    const spia = await invioConRottaRotta()
    await waitFor(() => expect(campoMessaggio().readOnly).toBe(true))
    const partito = campoMessaggio().value
    fireEvent.change(campoMessaggio(), { target: { value: 'un altro testo' } })
    fireEvent.click(screen.getByRole('button', { name: /Registra l’avviso/i }))
    await waitFor(() => expect(spia).toHaveBeenCalledTimes(2))
    expect(corpoDi(spia, 1).testo).toBe(partito)
  })

  it('🛑 il promemoria NON si chiude: la pagina non si rinfresca su un fallimento', async () => {
    await invioConRottaRotta()
    await waitFor(() => expect(screen.getByText(/Il messaggio è partito/i)).toBeTruthy())
    // 🔑 `within` sul foglio, e non `screen`: l'avviso d'errore porta il suo
    //    «Chiudi» (e non sparisce da solo, §5.18) — due bersagli con lo stesso
    //    nome. La via di fuga che si prova è quella del FOGLIO.
    const foglio = screen.getByRole('dialog')
    fireEvent.click(within(foglio).getByRole('button', { name: 'Chiudi' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(refreshMock).not.toHaveBeenCalled()
  })

  /**
   * 🔴 IL RICUPERO DEVE SOPRAVVIVERE ALLA CHIUSURA DEL FOGLIO, e queste quattro
   * prove chiudono un difetto vero: `chiudi()` azzerava il testo mandato. La
   * sequenza raggiungibile era — messaggio partito → registrazione fallita → la
   * persona chiude (Esc, scrim, «Chiudi») → riapre, e si ritrovava davanti alla
   * SCELTA, dove le uniche due mosse sono **mandare un secondo messaggio** o
   * registrare «a voce» una telefonata che non c'è stata.
   */
  it('🔴 chiuso e riaperto, il foglio RIPRENDE dal ricupero — non dalla scelta', async () => {
    await invioConRottaRotta()
    await waitFor(() => expect(screen.getByText(/Il messaggio è partito/i)).toBeTruthy())
    const foglio = screen.getByRole('dialog')
    fireEvent.click(within(foglio).getByRole('button', { name: 'Chiudi' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    apriFoglio()
    // 🛑 NON la domanda «come avvisi il dentista?»: il messaggio è già uscito.
    expect(screen.queryByRole('heading', { name: 'Come avvisi il dentista?' })).toBeNull()
    expect(screen.getByText(/Il messaggio è partito/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Registra l’avviso/i })).toBeTruthy()
    expect(screen.queryByRole('link', { name: /Mandalo su WhatsApp/i })).toBeNull()
  })

  it('🛑 e dal ricupero la SCELTA non è raggiungibile: nessuna delle due mosse false', async () => {
    await invioConRottaRotta()
    await waitFor(() => expect(screen.getByText(/Il messaggio è partito/i)).toBeTruthy())
    expect(screen.queryByRole('button', { name: /Torna alla scelta/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /a voce/i })).toBeNull()
  })

  it('🔑 e dopo il rientro si registra ANCORA il testo partito, non uno ricostruito', async () => {
    const spia = await invioConRottaRotta()
    await waitFor(() => expect(screen.getByText(/Il messaggio è partito/i)).toBeTruthy())
    const partito = campoMessaggio().value
    const foglio = screen.getByRole('dialog')
    fireEvent.click(within(foglio).getByRole('button', { name: 'Chiudi' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    apriFoglio()
    expect(campoMessaggio().value).toBe(partito)
    expect(campoMessaggio().readOnly).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: /Registra l’avviso/i }))
    await waitFor(() => expect(spia).toHaveBeenCalledTimes(2))
    expect(corpoDi(spia, 1).testo).toBe(partito)
  })

  it('la riuscita SPEGNE il ricupero: dopo, il foglio riparte dalla scelta', async () => {
    // Prima il fallimento, poi una rotta che risponde bene al ricupero.
    await invioConRottaRotta()
    await waitFor(() => expect(screen.getByText(/Il messaggio è partito/i)).toBeTruthy())
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => rispostaOk() }))
    fireEvent.click(screen.getByRole('button', { name: /Registra l’avviso/i }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Fatto' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /Ho capito/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    apriFoglio()
    expect(screen.getByRole('heading', { name: 'Come avvisi il dentista?' })).toBeTruthy()
  })

  it('la rete assente si racconta allo stesso modo', async () => {
    const spia = vi.fn().mockRejectedValue(new Error('rete assente'))
    vi.stubGlobal('fetch', spia)
    monta()
    apriFoglio()
    fireEvent.click(stradaWhatsApp())
    fireEvent.click(tastoVerde())
    await waitFor(() => expect(screen.getByText(/Il messaggio è partito/i)).toBeTruthy())
  })
})

describe('AvvisoDentista — la schermata finale RILEGGE ciò che è stato scritto', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  it('legge stato e ora dalla RIGA SALVATA, non da una previsione locale', async () => {
    fingiRotta(rispostaOk('comunicato_dall_app'))
    monta()
    apriFoglio()
    fireEvent.click(stradaWhatsApp())
    fireEvent.click(tastoVerde())
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Fatto' })).toBeTruthy())
    expect(testoDelFoglio()).toContain('oggi alle 14:32')
    expect(testoDelFoglio()).toContain('dall’app')
    expect(testoDelFoglio()).not.toContain('undefined')
  })

  /**
   * 📌 Le due riletture della strada «a voce» — la parola letta dallo STATO
   * salvato e la riuscita senza orologio — sono passate al blocco di ⚖️ D351: là
   * gli orologi sono finti, perché la scrittura arriva **allo scadere della
   * finestra** e non a un tocco. Sono le stesse due asserzioni, spostate dove il
   * fatto adesso avviene. Qui resta la strada di WhatsApp, che è invariata.
   */
  it('🛑 il rinfresco della pagina avviene alla CHIUSURA, mai a foglio aperto', async () => {
    fingiRotta()
    monta()
    apriFoglio()
    fireEvent.click(stradaWhatsApp())
    fireEvent.click(tastoVerde())
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Fatto' })).toBeTruthy())
    expect(refreshMock).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /Ho capito/i }))
    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1))
  })
})

describe('AvvisoDentista — i rami che un dato mancante apre, e che si dicono invece di fingerli', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  it('senza gettone del portale: nessun collegamento morto nel testo, e lo dice', () => {
    monta({ portalToken: '' })
    apriFoglio()
    fireEvent.click(stradaWhatsApp())
    expect(campoMessaggio().value).not.toContain('/portale/')
    expect(screen.getByText(/non porta il collegamento/i)).toBeTruthy()
  })

  it('senza cellulare dello studio: il collegamento non porta cifre, e lo dice', () => {
    monta({ telefonoStudio: null })
    apriFoglio()
    fireEvent.click(stradaWhatsApp())
    expect(tastoVerde().getAttribute('href')?.startsWith('https://wa.me/?text=')).toBe(true)
    expect(screen.getByText(/scegliere il contatto/i)).toBeTruthy()
  })

  it('⚖️ D345 — senza nome del laboratorio il messaggio esce senza firma, mai con una firma finta', () => {
    monta({ nomeLaboratorio: null })
    apriFoglio()
    fireEvent.click(stradaWhatsApp())
    const testo = campoMessaggio().value
    expect(testo).not.toContain('—')
    expect(testo).not.toContain('undefined')
    expect(testo).not.toContain('UÀ Lab')
  })
})

describe('AvvisoDentista — le regole di casa', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  it('parole del banco, mai del software (L2, §2.3) — su tutti e tre i passi', () => {
    fingiRotta()
    monta()
    apriFoglio()
    expect(trovaParoleVietate(document.body.textContent ?? '')).toEqual([])
    fireEvent.click(stradaWhatsApp())
    expect(trovaParoleVietate(document.body.textContent ?? '')).toEqual([])
    fireEvent.click(screen.getByRole('button', { name: /Torna alla scelta/i }))
    fireEvent.click(stradaVoce())
    expect(trovaParoleVietate(document.body.textContent ?? '')).toEqual([])
  })

  // ⚖️ D356/D358 — la prova sopra monta coi PROPS di default
  // (`pazienteMostrato: 'ROSSI MARIO'`): la frase senza nome che D358 ha
  // aggiunto (`Hai rifatto la dichiarazione del lavoro #…`) non passa MAI da
  // lì. Senza questa prova il dizionario non guarderebbe mai l'unica stringa
  // nuova visibile su questa superficie v3.
  it('⚖️ D358 — anche la frase SENZA nome del paziente passa dal dizionario', () => {
    monta({ pazienteMostrato: '—' })
    apriFoglio()
    expect(trovaParoleVietate(document.body.textContent ?? '')).toEqual([])
  })

  it('🛑 nessuna navigazione: né `router.push` né l’hook degli overlay', () => {
    monta()
    apriFoglio()
    fireEvent.click(stradaWhatsApp())
    expect(pushMock).not.toHaveBeenCalled()
    expect(navigaMock).not.toHaveBeenCalled()
  })

  it('bersagli ≥ 44px: la riga sulla scheda e le due righe della scelta', () => {
    monta()
    const riga = screen.getByRole('button', { name: /Avvisa il dentista/i })
    expect(parseFloat(riga.style.minHeight)).toBeGreaterThanOrEqual(44)
    apriFoglio()
    expect(parseFloat(stradaWhatsApp().style.minHeight)).toBeGreaterThanOrEqual(44)
    expect(parseFloat(stradaVoce().style.minHeight)).toBeGreaterThanOrEqual(44)
  })

  /**
   * 🔴 IL DIFETTO EREDITATO DA `Sheet`, e la via locale che lo chiude.
   * `Sheet.tsx` non azzera mai `scrollTop` al cambio di contenuto
   * (`grep -n scrollTop` → zero righe). `misurato:` sul banco vero a 195×422
   * (390×844 con zoom del browser al 200%, §13.3): scorso il passo 1 in fondo
   * (`scrollTop` 712), al cambio di passo restava **216**, col titolo del passo
   * nuovo a **−150 px**, fuori dal pannello.
   * 🛑 jsdom non fa layout, quindi qui non si misura un'altezza: si prova il
   *    MECCANISMO — il pannello torna in cima quando il passo cambia.
   */
  it('🔴 al cambio di passo lo scorrimento torna in cima (difetto ereditato da `Sheet`)', () => {
    monta()
    apriFoglio()
    const pannello = screen.getByRole('dialog')
    pannello.scrollTop = 380
    expect(pannello.scrollTop).toBe(380)
    fireEvent.click(stradaWhatsApp())
    expect(pannello.scrollTop).toBe(0)
  })

  it('🛑 nessun colore, nessuna ombra e nessuna durata scritti a mano nel sorgente', () => {
    const sorgente = readFileSync(
      join(process.cwd(), 'src/components/features/lavori/scheda-v3/AvvisoDentista.tsx'),
      'utf8'
    )
    // Solo le righe di CODICE: i commenti citano misure e token per iscritto.
    const codice = sorgente
      .split('\n')
      .filter((r) => !/^\s*(\/\/|\*|\/\*)/.test(r))
      .join('\n')
    expect(codice).not.toMatch(/#[0-9A-Fa-f]{6}\b/)
    expect(codice).not.toMatch(/rgba?\(/)
    expect(codice).not.toMatch(/duration:\s*[0-9]/)
  })
})

describe('quandoLeggibile — l’ora si legge in parole, mai 09/08/2026 (§2.1)', () => {
  const ADESSO = new Date(2026, 7, 9, 18, 0, 0)

  it('oggi porta solo l’ora', () => {
    expect(quandoLeggibile(new Date(2026, 7, 9, 14, 32).toISOString(), ADESSO)).toBe('oggi alle 14:32')
  })

  it('un altro giorno porta il giorno breve, mai la data in cifre', () => {
    const testo = quandoLeggibile(new Date(2026, 7, 7, 9, 5).toISOString(), ADESSO) ?? ''
    expect(testo).toContain('alle 09:05')
    expect(testo).not.toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })

  it('un valore che non è un istante torna `null`, non una stringa rotta', () => {
    expect(quandoLeggibile(null, ADESSO)).toBeNull()
    expect(quandoLeggibile(undefined, ADESSO)).toBeNull()
    expect(quandoLeggibile('non-una-data', ADESSO)).toBeNull()
    expect(quandoLeggibile(42, ADESSO)).toBeNull()
  })
})
