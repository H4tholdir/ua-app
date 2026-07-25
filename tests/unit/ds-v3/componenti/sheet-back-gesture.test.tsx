// G5 (FIX-I, verbale ri-collaudo #2) — il gesto back del telefono deve CHIUDERE lo sheet
// aperto, non navigare sotto. Pattern history-entry (v. commento su Sheet.tsx): all'apertura
// si pusha un'entry marcata `{uaSheet:true}`; un popstate la consuma e chiama `onChiudi`; alla
// chiusura esplicita si fa `history.back()` SOLO se l'entry è ancora in cima.
//
// Convenzione di mock: STESSA di `stanze-pager.test.tsx` (che presidia il gemello lato pager) —
// `history.pushState`/`history.back` spiati e no-op (mai un vero cambio di `window.location` che
// trapelerebbe fra un test e l'altro dello stesso file), `popstate` sintetico via
// `window.dispatchEvent`. Il test di NON interferenza col pager (che richiede un pathname reale)
// vive invece in `stanze-pager.test.tsx`, dove quella manipolazione è già di casa (v. describe
// «remount con indirizzo già /cassette»).
import { useState } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { Sheet } from '@/components/ds/Sheet'
import { DialogConferma } from '@/components/ds/DialogConferma'

function attivaReducedMotion(): () => void {
  const originalMatchMedia = window.matchMedia
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia
  return () => {
    window.matchMedia = originalMatchMedia
  }
}

let pushStateSpy: ReturnType<typeof vi.spyOn>
let historyBackSpy: ReturnType<typeof vi.spyOn>

// Stato di history finto, letto da `window.history.state` (getter ridefinito qui sotto): serve
// al gate della review FIX-I («back del cleanup solo se l'entry è in cima») che ora legge
// `window.history.state?.uaSheet` oltre al ref — senza questo, `pushState`/`back` mockati come
// puri no-op (necessari per non far trapelare un vero cambio di `window.location` fra test)
// lascerebbero `state` sempre `null`, rendendo il gate impossibile da esercitare in isolamento.
let statoHistoryFinto: unknown = null

beforeEach(() => {
  statoHistoryFinto = null
  Object.defineProperty(window.history, 'state', {
    configurable: true,
    get: () => statoHistoryFinto,
  })
  pushStateSpy = vi.spyOn(window.history, 'pushState').mockImplementation((state: unknown) => {
    statoHistoryFinto = state
  })
  historyBackSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {
    // Simula il pop reale: l'entry in cima sparisce, si torna a quella precedente (nei nostri
    // scenari, mai marcata `{uaSheet:true}`).
    statoHistoryFinto = null
  })
  document.body.style.overflow = ''
  document.body.style.paddingRight = ''
})
afterEach(() => {
  pushStateSpy.mockRestore()
  historyBackSpy.mockRestore()
  vi.restoreAllMocks()
  document.body.style.overflow = ''
  document.body.style.paddingRight = ''
})

describe('Sheet — G5, history-entry per il back gesture', () => {
  it('apertura pusha UNA entry marcata {uaSheet:true}, senza cambiare url', () => {
    render(
      <Sheet aperto onChiudi={() => {}} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    expect(pushStateSpy).toHaveBeenCalledTimes(1)
    expect(pushStateSpy).toHaveBeenCalledWith({ uaSheet: true }, '')
  })

  it('aperto=false dal primo render → nessuna pushState (nessuno sheet da proteggere)', () => {
    render(
      <Sheet aperto={false} onChiudi={() => {}}>
        <p>Contenuto</p>
      </Sheet>
    )
    expect(pushStateSpy).not.toHaveBeenCalled()
  })

  it('chiusura esplicita (LinkQuieto «Chiudi»): history.back() chiamato una volta, l\'entry era ancora in cima', () => {
    const onChiudi = vi.fn()
    const { rerender } = render(
      <Sheet aperto onChiudi={onChiudi} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    fireEvent.click(screen.getByText('Chiudi'))
    expect(onChiudi).toHaveBeenCalledTimes(1)
    // Il chiamante reale flip-perebbe `aperto` a false qui: lo simuliamo col rerender, che è
    // il punto in cui l'effect fa la sua pulizia (history.back(), entry ancora in cima).
    rerender(
      <Sheet aperto={false} onChiudi={onChiudi} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    expect(historyBackSpy).toHaveBeenCalledTimes(1)
  })

  it('popstate (back del telefono) chiude lo sheet via onChiudi, SENZA un secondo history.back (la traversal l\'ha già fatta il browser)', () => {
    const onChiudi = vi.fn()
    render(
      <Sheet aperto onChiudi={onChiudi} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    act(() => {
      window.dispatchEvent(new Event('popstate'))
    })
    expect(onChiudi).toHaveBeenCalledTimes(1)
    expect(historyBackSpy).not.toHaveBeenCalled()
  })

  it('un secondo popstate dopo il primo NON richiama onChiudi una seconda volta (l\'entry è già stata consumata — disarma il ref)', () => {
    const onChiudi = vi.fn()
    render(
      <Sheet aperto onChiudi={onChiudi} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    act(() => {
      window.dispatchEvent(new Event('popstate'))
    })
    expect(onChiudi).toHaveBeenCalledTimes(1)
    act(() => {
      window.dispatchEvent(new Event('popstate'))
    })
    expect(onChiudi).toHaveBeenCalledTimes(1)
  })

  it('chiusura esplicita DOPO un popstate già consumato: history.back() NON si richiama (l\'entry non c\'è più)', () => {
    const onChiudi = vi.fn()
    const { rerender } = render(
      <Sheet aperto onChiudi={onChiudi} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    act(() => {
      window.dispatchEvent(new Event('popstate'))
    })
    expect(onChiudi).toHaveBeenCalledTimes(1)
    historyBackSpy.mockClear()
    // Il chiamante reale, ricevuto onChiudi, chiude (aperto=false) — qui l'entry è già stata
    // consumata dal popstate sopra: nessuna seconda `history.back()` deve partire.
    rerender(
      <Sheet aperto={false} onChiudi={onChiudi} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    expect(historyBackSpy).not.toHaveBeenCalled()
  })

  it('riapertura dopo una chiusura: una nuova pushState per il nuovo ciclo di vita', () => {
    const onChiudi = vi.fn()
    const { rerender } = render(
      <Sheet aperto onChiudi={onChiudi} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    expect(pushStateSpy).toHaveBeenCalledTimes(1)
    rerender(
      <Sheet aperto={false} onChiudi={onChiudi} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    expect(historyBackSpy).toHaveBeenCalledTimes(1)
    rerender(
      <Sheet aperto onChiudi={onChiudi} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    expect(pushStateSpy).toHaveBeenCalledTimes(2)
  })

  // Rationale critico (v. commento su Sheet.tsx, `onChiudiRef`): un chiamante come
  // `CassettaSheet` passa `onChiudi={() => { if (!dialogAperto) onChiudi() }}` — una NUOVA
  // closure a OGNI suo render (es. ogni tasto premuto in un campo). Se l'effect di push/pop
  // dipendesse da `onChiudi`, ogni keystroke ripusherebbe/rip-opperebbe un'entry: qui si prova
  // che NON succede — l'identità di `onChiudi` cambia, `aperto` no, nessuna nuova pushState.
  it('cambio di IDENTITÀ di onChiudi (stesso aperto=true, come una digitazione nel chiamante) NON ripusha una nuova entry', () => {
    const { rerender } = render(
      <Sheet aperto onChiudi={() => {}} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    expect(pushStateSpy).toHaveBeenCalledTimes(1)
    rerender(
      <Sheet aperto onChiudi={() => {}} titolo="Dettagli">
        <p>Contenuto diverso</p>
      </Sheet>
    )
    expect(pushStateSpy).toHaveBeenCalledTimes(1)
  })

  // ... ma la nuova identità resta quella EFFETTIVAMENTE chiamata da un popstate successivo:
  // prova che `onChiudiRef` insegue la closure più recente, non quella catturata al mount.
  it('un popstate dopo un cambio di identità di onChiudi chiama la versione PIÙ RECENTE, non quella del mount', () => {
    const onChiudiVecchio = vi.fn()
    const onChiudiNuovo = vi.fn()
    const { rerender } = render(
      <Sheet aperto onChiudi={onChiudiVecchio} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    rerender(
      <Sheet aperto onChiudi={onChiudiNuovo} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    act(() => {
      window.dispatchEvent(new Event('popstate'))
    })
    expect(onChiudiVecchio).not.toHaveBeenCalled()
    expect(onChiudiNuovo).toHaveBeenCalledTimes(1)
  })

  it('smontaggio REALE mentre aperto (entry ancora in cima): history.back() la disfa, non resta appesa', () => {
    const { unmount } = render(
      <Sheet aperto onChiudi={() => {}} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    expect(pushStateSpy).toHaveBeenCalledTimes(1)
    unmount()
    expect(historyBackSpy).toHaveBeenCalledTimes(1)
  })

  // Review FIX-I (G5): due consumatori reali fanno `router.push` mentre lo sheet resta montato
  // e aperto — `MenuSchedaSheet.tsx:145` verso `/lavori/[id]/modifica`,
  // `SchedaPersonaSheet.tsx:205` verso `/tecnici/[id]/produttivita`. Next impila la nuova entry
  // SOPRA quella `{uaSheet:true}` di questo componente: alla cleanup (chiusura esplicita o
  // smontaggio) l'entry in cima non è più la nostra, e un `history.back()` cieco consumerebbe
  // l'entry del consumer — nel caso peggiore una back-navigation che ribalta il tap dell'utente.
  it('un consumer pusha un\'entry PROPRIA (router.push) mentre lo sheet è aperto: allo smontaggio NON si chiama history.back (l\'entry in cima non è più quella dello sheet)', () => {
    const onChiudi = vi.fn()
    const { unmount } = render(
      <Sheet aperto onChiudi={onChiudi} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    expect(pushStateSpy).toHaveBeenCalledTimes(1)
    // Simula il router che impila una entry propria, non marcata `uaSheet`, mentre il ref dello
    // sheet non è stato toccato (nessun popstate, nessuna chiusura esplicita è passata di qui).
    act(() => {
      window.history.pushState({}, '', '/lavori/1/modifica')
    })
    unmount()
    expect(historyBackSpy).not.toHaveBeenCalled()
  })

  // Stessa scena, ma la chiusura arriva per via esplicita (rerender aperto=false) invece dello
  // smontaggio — entrambi i percorsi passano per la STESSA cleanup, quindi devono comportarsi
  // allo stesso modo.
  it('un consumer pusha un\'entry PROPRIA mentre lo sheet è aperto: la chiusura esplicita successiva NON chiama history.back', () => {
    const onChiudi = vi.fn()
    const { rerender } = render(
      <Sheet aperto onChiudi={onChiudi} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    act(() => {
      window.history.pushState({}, '', '/lavori/1/modifica')
    })
    rerender(
      <Sheet aperto={false} onChiudi={onChiudi} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    expect(historyBackSpy).not.toHaveBeenCalled()
  })

  it('smontaggio DOPO un popstate già consumato: nessun history.back in più (l\'entry non c\'è già più)', () => {
    const onChiudi = vi.fn()
    const { unmount } = render(
      <Sheet aperto onChiudi={onChiudi} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    act(() => {
      window.dispatchEvent(new Event('popstate'))
    })
    historyBackSpy.mockClear()
    unmount()
    expect(historyBackSpy).not.toHaveBeenCalled()
  })

  // C2 (review finale whole-branch) — un `DialogConferma` aperto SOPRA lo sheet (pattern
  // `CassettaSheet`: il compositore tiene lo sheet aperto e guarda la chiusura con
  // `if (!dialogAperto)`). Da qui in poi la meccanica di history è condivisa
  // (`storia-overlay.ts`): UNA entry per l'intera pila, a un back reagisce solo il più alto,
  // l'entry si disfa quando la pila si svuota — in QUALUNQUE ordine escano i due overlay.
  describe('C2 — DialogConferma impilato sopra lo Sheet', () => {
    /** Riproduce l'anatomia di `CassettaSheet`: dialog fratello dello sheet, sheet che resta
     *  aperto mentre il dialog è in scena, chiusura dello sheet guardata da `dialogAperto`.
     *  `dialogPrima` inverte l'ordine di MONTAGGIO dei due: React esegue le cleanup in ordine
     *  di setup, quindi è l'unica leva che ha un test per provare che l'unwind non dipende da
     *  chi si è montato per primo. */
    function Composto(props: { dialogPrima?: boolean }) {
      const [sheetAperto, setSheetAperto] = useState(true)
      const [dialogAperto, setDialogAperto] = useState(false)
      const sheet = (
        <Sheet
          key="sheet"
          aperto={sheetAperto}
          onChiudi={() => {
            if (!dialogAperto) setSheetAperto(false)
          }}
          titolo="Dettagli"
        >
          <button type="button" onClick={() => setDialogAperto(true)}>
            Butta via
          </button>
        </Sheet>
      )
      const dialog = (
        <DialogConferma
          key="dialog"
          aperto={dialogAperto}
          titolo="Butto via la cassetta C12?"
          testo="Sparisce dalla parete."
          etichettaDistruttiva="Butta via"
          etichettaSicura="Tienila"
          // Conferma riuscita: dialog E sheet si chiudono nello STESSO commit (è ciò che fa
          // `segnaComeLibera`/`buttaVia` in `CassettaSheet`) — il caso in cui due meccaniche
          // separate si pestavano i piedi sulla history.
          onConferma={() => {
            setDialogAperto(false)
            setSheetAperto(false)
          }}
          onAnnulla={() => setDialogAperto(false)}
        />
      )
      return <>{props.dialogPrima ? [dialog, sheet] : [sheet, dialog]}</>
    }

    async function apriDialog() {
      fireEvent.click(screen.getByText('Butta via'))
      expect(await screen.findByRole('dialog', { name: /Butto via la cassetta C12/ })).toBeInTheDocument()
    }

    it('aprire il dialog NON spinge una seconda entry: quella dello sheet protegge già tutta la pila', async () => {
      render(<Composto />)
      expect(pushStateSpy).toHaveBeenCalledTimes(1)
      await apriDialog()
      expect(pushStateSpy).toHaveBeenCalledTimes(1)
    })

    it('back col dialog aperto: si chiude SOLO il dialog, lo sheet resta (e resta protetto da una entry ri-spinta)', async () => {
      render(<Composto />)
      await apriDialog()
      pushStateSpy.mockClear()
      act(() => {
        window.dispatchEvent(new Event('popstate'))
      })
      await waitFor(() => expect(screen.queryByRole('dialog', { name: /Butto via la cassetta C12/ })).toBeNull())
      expect(screen.getByRole('dialog', { name: 'Dettagli' })).toBeInTheDocument()
      // Ri-push: lo sheet rimasto sotto deve restare protetto, altrimenti il back successivo
      // se ne andrebbe dalla pagina invece di chiuderlo.
      expect(pushStateSpy).toHaveBeenCalledTimes(1)
      expect(historyBackSpy).not.toHaveBeenCalled()
    })

    it('un secondo back chiude lo sheet — e SOLO allora la pila è vuota', async () => {
      render(<Composto />)
      await apriDialog()
      act(() => {
        window.dispatchEvent(new Event('popstate'))
      })
      await waitFor(() => expect(screen.queryByRole('dialog', { name: /Butto via la cassetta C12/ })).toBeNull())
      act(() => {
        window.dispatchEvent(new Event('popstate'))
      })
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Dettagli' })).toBeNull())
      // La traversal l'ha fatta il browser tutte e due le volte: mai un `back()` nostro sopra.
      expect(historyBackSpy).not.toHaveBeenCalled()
    })

    it('«Tienila» (annulla): il dialog se ne va da solo e l\'entry NON si consuma — resta a proteggere lo sheet', async () => {
      render(<Composto />)
      await apriDialog()
      pushStateSpy.mockClear()
      fireEvent.click(screen.getByText('Tienila'))
      await waitFor(() => expect(screen.queryByRole('dialog', { name: /Butto via la cassetta C12/ })).toBeNull())
      expect(screen.getByRole('dialog', { name: 'Dettagli' })).toBeInTheDocument()
      expect(historyBackSpy).not.toHaveBeenCalled()
      expect(pushStateSpy).not.toHaveBeenCalled()
    })

    it.each([
      ['sheet montato per primo', false],
      ['dialog montato per primo (ordine di cleanup invertito)', true],
    ])('conferma riuscita (%s): dialog e sheet si chiudono nello stesso commit → ESATTAMENTE un history.back, nessuna entry appesa', async (_nome, dialogPrima) => {
      render(<Composto dialogPrima={dialogPrima} />)
      await apriDialog()
      fireEvent.click(screen.getAllByText('Butta via')[1] ?? screen.getByText('Butta via'))
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      expect(historyBackSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('reduced motion (§8.4) — il push/pop non dipende dal ramo animato', () => {
    let ripristina: () => void
    beforeEach(() => {
      ripristina = attivaReducedMotion()
    })
    afterEach(() => ripristina())

    it('apertura pusha comunque l\'entry, chiusura fa comunque history.back()', () => {
      const onChiudi = vi.fn()
      const { rerender } = render(
        <Sheet aperto onChiudi={onChiudi} titolo="Dettagli">
          <p>Contenuto</p>
        </Sheet>
      )
      expect(pushStateSpy).toHaveBeenCalledTimes(1)
      rerender(
        <Sheet aperto={false} onChiudi={onChiudi} titolo="Dettagli">
          <p>Contenuto</p>
        </Sheet>
      )
      expect(historyBackSpy).toHaveBeenCalledTimes(1)
    })

    it('popstate chiude lo sheet ridotto via onChiudi, senza un secondo history.back', () => {
      const onChiudi = vi.fn()
      render(
        <Sheet aperto onChiudi={onChiudi} titolo="Dettagli">
          <p>Contenuto</p>
        </Sheet>
      )
      act(() => {
        window.dispatchEvent(new Event('popstate'))
      })
      expect(onChiudi).toHaveBeenCalledTimes(1)
      expect(historyBackSpy).not.toHaveBeenCalled()
    })
  })
})
