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
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { Sheet } from '@/components/ds/Sheet'

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

beforeEach(() => {
  pushStateSpy = vi.spyOn(window.history, 'pushState').mockImplementation(() => {})
  historyBackSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {})
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
