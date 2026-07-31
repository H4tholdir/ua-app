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
    expect(screen.queryByRole('dialog')).toBeNull()
    // e si chiede al server la versione fresca: la rimozione locale è ottimistica
    expect(refresh).toHaveBeenCalled()
  })

  it('la DELETE fallisce → la foto RESTA a schermo e l\'utente lo legge', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    m.mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: 'boom' }) })

    render(<SchedaLavoroV3 lavoro={makeLavoro()} />)
    apriVisore()
    apriTendina()
    fireEvent.click(screen.getByRole('menuitem', { name: /Elimina foto/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Elimina' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Apri la foto grande.*1 di 2/ })).toBeInTheDocument()
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
  it('con visore + tendina aperti, un Escape chiude SOLO la tendina', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro()} />)
    apriVisore()
    apriTendina()
    expect(screen.getByRole('menu')).toBeInTheDocument()

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })

    expect(screen.queryByRole('menu')).toBeNull()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
