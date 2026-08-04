import { StrictMode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// ═══════════════════════════════════════════════════════════════════════════
// T12 — l'eliminazione dal visore, sulla SCHEDA del lavoro.
//
// 🔑 Perché un file suo, e perché QUESTA superficie: le due superfici che
//    mostrano le foto rimuovono in due modi DIVERSI. Il form di modifica tiene
//    `immagini` in `useState` e basta un filtro; la scheda riceve `lavoro` da un
//    componente server e ha una riconciliazione sua
//    (`props.lavoro !== lavoroPropPrecedente`, adjusting-state durante il
//    render). Una prova sola che esercita il form lascerebbe SCOPERTA la
//    superficie che Francesco guarda davvero.
//
// 🛑 La dipendenza dura è T4, ed è atterrata: il server elimina il file dallo
//    Storage, scrive la traccia in `lavori_immagini_eliminazioni`, e risponde
//    409 su lavoro consegnato (`[imgId]/route.ts:200`). Per questo la voce di
//    menù NON si offre su un lavoro consegnato: la carta non deve offrire un
//    gesto che fallisce solo dopo il tocco.
//
// 🔧 T8 (S7, D214) aggiunge quattro prove sul 409 «fonte in uso» (il server
//    ora rifiuta di distruggere l'immagine che è fonte di una prescrizione —
//    v. `[imgId]/route.ts`) e rinforza quella sul 500: `eliminaFotoCorrente`
//    (`SchedaLavoroV3.tsx`) aveva UN messaggio generico per ogni `!res.ok` —
//    dopo T8 legge il corpo `{ error }` solo sul 409 e mostra LA frase del
//    server, lasciando il 500 muto sul dettaglio (G9).
//    R-P4, misurato DUE VOLTE (stesso comando, nessuna modifica in mezzo),
//    contro `eliminaFotoCorrente` NON MODIFICATA (l'abbozzo inerte è il
//    codice preesistente: risponde sempre col messaggio generico, qualunque
//    sia lo status): comando `npx vitest run tests/unit/scheda-v3/scheda-album-elimina.test.tsx`
//    → **2 falliti su 14**, identico alle due misure. I due rossi sono
//    ESATTAMENTE le due prove che pretendono la frase del server (fonte di
//    questo lavoro, fonte di un rifacimento); le altre due prove nuove (500
//    resta generico, 409 senza corpo leggibile ricade sul generico) sono
//    VERDI da subito — misurano che il comportamento preesistente resti
//    intatto, non il codice nuovo.
// ═══════════════════════════════════════════════════════════════════════════

const push = vi.fn()
const refresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
  usePathname: () => '/lavori/lav',
}))
const { initSuoniSpy } = vi.hoisted(() => ({ initSuoniSpy: vi.fn() }))
vi.mock('@/design-system/v3/sound', async (importOriginal) => {
  const reale = await importOriginal<typeof import('@/design-system/v3/sound')>()
  return { ...reale, initSuoni: initSuoniSpy }
})

// 🔍 La storia degli overlay resta QUELLA VERA: si guarda soltanto quante volte
//    ci si entra e se ne esce. Un doppio giro entra/esce/entra è la firma del
//    montaggio condizionale — quello che nell'app faceva richiudere il visore
//    da solo.
const { entraSpy, esciSpy } = vi.hoisted(() => ({ entraSpy: vi.fn(), esciSpy: vi.fn() }))
vi.mock('@/components/ds/storia-overlay', async (importOriginal) => {
  const reale = await importOriginal<typeof import('@/components/ds/storia-overlay')>()
  return {
    ...reale,
    entraOverlay: (marca: 'uaSheet' | 'uaDialog', chiudi: () => void) => {
      entraSpy(marca)
      return reale.entraOverlay(marca, chiudi)
    },
    esciOverlay: (token: number) => {
      esciSpy(token)
      return reale.esciOverlay(token)
    },
  }
})

import { SchedaLavoroV3 } from '@/components/features/lavori/scheda-v3/SchedaLavoroV3'
import type { LavoroDettaglio } from '@/types/domain'
// T8 — le frasi si IMPORTANO dalla stessa casa unica del server (modello:
// prescrizione-costanti): un valore incollato a mano qui resterebbe verde
// anche se la rotta cambiasse parola.
import {
  MESSAGGIO_FONTE_ALTRO_LAVORO,
  MESSAGGIO_FONTE_QUESTO_LAVORO,
  MOTIVO_FONTE_IN_USO,
} from '@/lib/domain/immagini-eliminazione-messaggi'

const FOTO = [
  { id: 'f1', url: 'https://esempio/1.jpg', categoria: 'impronta', created_at: '2026-08-01T09:00:00Z', nome_file: null },
  { id: 'f2', url: 'https://esempio/2.jpg', categoria: 'prescrizione', created_at: '2026-08-01T10:00:00Z', nome_file: null },
]

function makeLavoro(over: Partial<LavoroDettaglio> = {}): LavoroDettaglio {
  return {
    id: 'lav', numero_lavoro: '2026-0147', stato: 'pronto',
    data_consegna_prevista: '2026-07-20', ora_consegna: '16:00',
    descrizione: 'Corona zirconia', paziente_nome_snapshot: null,
    cliente: { studio_nome: 'Studio Esposito', nome: 'Marco', cognome: 'Esposito' },
    paziente: null, tecnico: { nome: 'Ciro', cognome: 'B', sigla: 'CB' },
    fasi: [], immagini: FOTO, lavorazioni: [], appuntamenti: [], materiali: [], ddc: null,
    laboratorio: { nome: 'Lab', telefono: null },
    ...over,
  } as unknown as LavoroDettaglio
}

function apriVisore() {
  fireEvent.click(screen.getByRole('button', { name: /^Apri la foto grande/ }))
}

function apriTendina() {
  fireEvent.click(screen.getByRole('button', { name: 'Altre cose da fare su questa foto' }))
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', vi.fn())
})

describe('T12 — la scheda: dal visore si elimina una foto', () => {
  it('«⤢ Apri» apre DAVVERO il visore a tutto schermo (fino a T12 era un bottone che non apriva niente)', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro()} />)
    expect(screen.queryByRole('dialog')).toBeNull()
    apriVisore()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('la pastiglia della categoria apre il foglio che la corregge (D70)', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro()} />)
    fireEvent.click(screen.getAllByRole('button', { name: /^Cambia la categoria/ })[0])
    expect(screen.getByRole('heading', { name: 'Che foto è?' })).toBeInTheDocument()
  })

  it('menù → «Elimina foto» → conferma → DELETE chiamata UNA volta sola, sulla foto giusta', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    m.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) })

    render(<SchedaLavoroV3 lavoro={makeLavoro()} />)
    apriVisore()
    apriTendina()
    fireEvent.click(screen.getByRole('menuitem', { name: /Elimina foto/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Elimina' }))

    await waitFor(() => expect(m).toHaveBeenCalledTimes(1))
    expect(m.mock.calls[0][0]).toBe('/api/lavori/lav/immagini/f1')
    expect(m.mock.calls[0][1]).toMatchObject({ method: 'DELETE' })
  })

  // 🔑 IL CONTROLLO POSITIVO CHE MANCA SEMPRE: senza questo, una conferma che
  //    chiama la DELETE su ENTRAMBI i tasti passerebbe la prova qui sopra.
  it('annullare NON chiama niente', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    render(<SchedaLavoroV3 lavoro={makeLavoro()} />)
    apriVisore()
    apriTendina()
    fireEvent.click(screen.getByRole('menuitem', { name: /Elimina foto/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Annulla' }))

    await waitFor(() => expect(screen.queryByText(/Sparisce dalla scheda/)).toBeNull())
    expect(m).not.toHaveBeenCalled()
  })

  it('a conferma riuscita la foto sparisce dallo schermo, non solo dal server', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    m.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) })

    render(<SchedaLavoroV3 lavoro={makeLavoro()} />)
    // due foto → la carta dice «1 di 2»
    expect(screen.getByRole('button', { name: /Apri la foto grande.*1 di 2/ })).toBeInTheDocument()

    apriVisore()
    apriTendina()
    fireEvent.click(screen.getByRole('menuitem', { name: /Elimina foto/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Elimina' }))

    // ne resta UNA: la carta lo dice, e il visore si è chiuso
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Apri la foto grande.*1 di 1/ })).toBeInTheDocument(),
    )
    // 🔧 D100 — gli strati ora ANIMANO l'uscita: fra la chiusura e la sparizione
    // dal documento c'è la loro uscita, quindi si aspetta invece di leggere
    // nello stesso istante. Il fatto preteso non cambia: alla fine il visore
    // non c'è più.
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    // e si chiede al server la versione fresca: la rimozione locale è ottimistica
    expect(refresh).toHaveBeenCalled()
  })

  it('la DELETE fallisce (500) → la foto RESTA a schermo e l\'utente legge il messaggio GENERICO (il testo del server non esce: G9)', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    m.mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: 'boom' }) })

    render(<SchedaLavoroV3 lavoro={makeLavoro()} />)
    apriVisore()
    apriTendina()
    fireEvent.click(screen.getByRole('menuitem', { name: /Elimina foto/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Elimina' }))

    const avviso = await screen.findByRole('alert')
    expect(avviso).toBeInTheDocument()
    // 🔑 Il 500 resta muto sul dettaglio del server: solo il 409 T8 (sotto)
    //    riporta la SUA frase. Se questo test diventasse verde mostrando
    //    "boom", vorrebbe dire che ANCHE il 500 ora espone il corpo grezzo.
    expect(avviso).toHaveTextContent('Non sono riuscita a eliminare la foto. Riprova.')
    expect(avviso).not.toHaveTextContent('boom')
    expect(screen.getByRole('button', { name: /Apri la foto grande.*1 di 2/ })).toBeInTheDocument()
  })

  // ═══════════════════════════════════════════════════════════════════════
  // T8 (S7, D214) — 409 «fonte in uso»: la SUA frase, non quella generica.
  // La rotta (`[imgId]/route.ts`) usa la forma `{ error }` (non `{ errore }`
  // come altre route più recenti di questo repo — verificato leggendo il
  // file: PATCH e DELETE rispondono sempre con la chiave inglese).
  // ═══════════════════════════════════════════════════════════════════════
  it('409 «fonte in uso» (fonte di QUESTA prescrizione): il messaggio è quello del server, non quello generico', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    m.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: MESSAGGIO_FONTE_QUESTO_LAVORO, motivo: MOTIVO_FONTE_IN_USO }),
    })

    render(<SchedaLavoroV3 lavoro={makeLavoro()} />)
    apriVisore()
    apriTendina()
    fireEvent.click(screen.getByRole('menuitem', { name: /Elimina foto/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Elimina' }))

    const avviso = await screen.findByRole('alert')
    expect(avviso).toHaveTextContent(MESSAGGIO_FONTE_QUESTO_LAVORO)
    expect(avviso).not.toHaveTextContent('Non sono riuscita a eliminare la foto. Riprova.')
    // Nessuna rimozione ottimistica su un esito non-ok: la foto resta.
    expect(screen.getByRole('button', { name: /Apri la foto grande.*1 di 2/ })).toBeInTheDocument()
  })

  it('409 «fonte in uso» (clone da rifacimento — un ALTRO lavoro): stessa via, messaggio diverso, sempre quello vero del server', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    m.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: MESSAGGIO_FONTE_ALTRO_LAVORO, motivo: MOTIVO_FONTE_IN_USO }),
    })

    render(<SchedaLavoroV3 lavoro={makeLavoro()} />)
    apriVisore()
    apriTendina()
    fireEvent.click(screen.getByRole('menuitem', { name: /Elimina foto/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Elimina' }))

    const avviso = await screen.findByRole('alert')
    expect(avviso).toHaveTextContent(MESSAGGIO_FONTE_ALTRO_LAVORO)
  })

  // 🔑 Rilievo dell'advisor (T8): il fix legge `json.error` per QUALSIASI 409,
  //    non solo «fonte in uso» — quindi cambia ANCHE il 409 «lavoro
  //    consegnato» (`[imgId]/route.ts:200-204`), che prima cadeva sul
  //    generico e ora mostra la sua vera frase. È un effetto voluto (lo
  //    stesso meccanismo, applicato allo stesso modo), ma senza questa prova
  //    sarebbe un cambiamento silenzioso: si dichiara e si fissa qui.
  it('409 «lavoro consegnato» (race — la voce di menù è già omessa in condizioni normali): mostra ANCH\'ESSO la sua vera frase, non più quella generica', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    const MSG_CONSEGNATO = 'Lavoro già consegnato — non è più possibile eliminare le foto'
    m.mockResolvedValue({ ok: false, status: 409, json: async () => ({ error: MSG_CONSEGNATO }) })

    render(<SchedaLavoroV3 lavoro={makeLavoro()} />)
    apriVisore()
    apriTendina()
    fireEvent.click(screen.getByRole('menuitem', { name: /Elimina foto/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Elimina' }))

    const avviso = await screen.findByRole('alert')
    expect(avviso).toHaveTextContent(MSG_CONSEGNATO)
    expect(avviso).not.toHaveTextContent('Non sono riuscita a eliminare la foto. Riprova.')
  })

  it('409 senza corpo leggibile (json() fallisce) → non esplode: cade sul messaggio generico', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    m.mockResolvedValue({ ok: false, status: 409, json: async () => { throw new Error('corpo non-JSON') } })

    render(<SchedaLavoroV3 lavoro={makeLavoro()} />)
    apriVisore()
    apriTendina()
    fireEvent.click(screen.getByRole('menuitem', { name: /Elimina foto/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Elimina' }))

    const avviso = await screen.findByRole('alert')
    expect(avviso).toHaveTextContent('Non sono riuscita a eliminare la foto. Riprova.')
  })

  // 🛑 Il server risponde 409 su lavoro consegnato: la carta NON deve offrire un
  //    gesto che fallisce solo dopo il tocco. Si OMETTE la voce, non la si
  //    mostra spenta — una voce spenta invita comunque e non spiega.
  it('lavoro CONSEGNATO: la voce «Elimina foto» non è offerta affatto', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro({ stato: 'consegnato' })} />)
    apriVisore()
    apriTendina()
    expect(screen.queryByRole('menuitem', { name: /Elimina foto/ })).toBeNull()
  })

  it('il testo della conferma è quello ratificato (§5.42), «e dall\'archivio» compreso', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro()} />)
    apriVisore()
    apriTendina()
    fireEvent.click(screen.getByRole('menuitem', { name: /Elimina foto/ }))
    const pannello = screen.getAllByRole('dialog').at(-1) as HTMLElement
    expect(pannello.textContent).toContain(
      'Sparisce dalla scheda e dall’archivio: non si recupera. Resta annotato chi l’ha eliminata e quando.',
    )
    // 🛑 Mai «elimina definitivamente»: `design-system/v3/dizionario.ts:25` lo vieta.
    expect(pannello.textContent?.toLowerCase()).not.toContain('definitivamente')
  })

  // 🛑 La trappola già pagata in T11: l'effect del focus dipende dall'IDENTITÀ
  //    del ref dell'àncora. Un letterale inline `{ current: x }` passato dal
  //    chiamante è un oggetto NUOVO a ogni render, quindi l'effect si
  //    ri-registra e la trappola rimette il cursore all'inizio — l'utente che
  //    sta scegliendo si vede saltare il fuoco sotto le dita.
  it('un rerender NON rimette il focus da capo: l\'àncora è un ref stabile, mai un letterale', () => {
    const { rerender } = render(<SchedaLavoroV3 lavoro={makeLavoro()} />)
    apriVisore()
    apriTendina()
    const voce = screen.getByRole('menuitem', { name: /Elimina foto/ })
    voce.focus()
    expect(document.activeElement).toBe(voce)

    // stesso lavoro, nuovo render: se un'àncora fosse un letterale inline, qui
    // il focus tornerebbe al pannello.
    rerender(<SchedaLavoroV3 lavoro={makeLavoro()} />)
    expect(document.activeElement).toBe(voce)
  })

  // 🔴 LA PROVA CHE IL COLLAUDO NEL BROWSER HA PRETESO, e che nessuna delle
  //    altre poteva dare. Nell'app vera il visore si apriva e si RICHIUDEVA da
  //    solo in un battito. Causa: montare l'overlay dentro una condizione
  //    (`{foto && <VisoreFoto…>}`) lega il suo CICLO DI VITA all'apertura —
  //    e in sviluppo React monta ogni componente due volte (Strict Mode):
  //      entra → `pushState` · pulizia → `history.back()` · entra di nuovo →
  //      `pushState`, e il `popstate` del `back` (asincrono) arriva DOPO,
  //      dove `storia-overlay.ts:101` lo legge come un «indietro» dell'utente
  //      e chiude l'overlay appena aperto.
  // 🔑 Gli overlay v3 vogliono essere montati SEMPRE e pilotati da `aperto`:
  //    rendono `null` da soli quando sono chiusi (`VisoreFoto.tsx:142`), e
  //    l'entry di history la spingono solo quando servono davvero.
  // ⚠️ `render` di Testing Library NON usa Strict Mode: senza questo wrapper la
  //    prova sarebbe verde su un difetto vivo — ed è esattamente ciò che è
  //    successo prima del collaudo.
  // 🛑 E si prova QUI, sul doppio ingresso, non sul «resta aperto»: jsdom NON
  //    esegue la traversal di `history.back()`, quindi il popstate che chiude
  //    non arriva mai e una prova sul dialogo resterebbe verde su un difetto
  //    vivo. Il fatto osservabile è che un'apertura sola deve entrare nella
  //    storia degli overlay UNA volta, senza uscirne e rientrarci.
  it('🔴 aprire il visore entra nella storia degli overlay UNA volta sola, anche in Strict Mode', () => {
    entraSpy.mockClear()
    esciSpy.mockClear()

    render(<SchedaLavoroV3 lavoro={makeLavoro()} />, { wrapper: StrictMode })
    // A visore chiuso nessuno deve aver spinto niente: gli strati sono montati
    // ma dormono (rendono `null` da soli).
    expect(entraSpy).not.toHaveBeenCalled()

    apriVisore()

    expect(entraSpy).toHaveBeenCalledTimes(1)
    expect(esciSpy).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  // ── Escape: UNO strato per volta, non tutti e tre insieme ────────────────
  it('con visore + tendina aperti, un Escape chiude SOLO la tendina', async () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro()} />)
    apriVisore()
    apriTendina()
    expect(screen.getByRole('menu')).toBeInTheDocument()

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })

    // 🔧 D100 — la tendina esce con la sua molla, quindi resta nel documento per
    // la durata dell'uscita: si aspetta che se ne vada. 🔑 E il fatto che questa
    // prova esiste per presidiare è INTATTO, anzi più forte: alla fine dell'uscita
    // il menù non c'è più e il visore sotto è ancora lì. Un Escape, uno strato.
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
