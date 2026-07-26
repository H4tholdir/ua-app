// D-2/D-1 (collaudo browser 26/07/2026) — chiudere un overlay IN LOCO e chiuderlo NAVIGANDO
// VIA sono due cose diverse, e prima lo erano solo per l'utente: il modulo faceva sempre
// `history.back()` e in un verso si mangiava la navigazione (il CTA primario dello sheet di
// consegna si comportava come un annulla), nell'altro lasciava un'entry sepolta che costava
// una pressione back morta.
//
// LIMITE ONESTO DI QUESTI TEST: in jsdom `history.back()` è un no-op sincrono (qui, per giunta,
// è un mock), mentre nel browser è una traversal ASINCRONA — ed è proprio quell'asincronia a
// produrre D-2, motivo per cui la suite è rimasta verde per tutto il tempo in cui il difetto
// era in piedi. Qui si presidia ciò che jsdom PUÒ vedere davvero: che dopo la dichiarazione di
// navigazione nessun `history.back()` parta più, e che la navigazione usi `replace` (sostituire
// la nostra entry) invece di `push` (impilarcisi sopra). L'ordine reale degli eventi nel
// browser è presidiato da `scripts/guardia-navigazione-overlay.mjs`.
import { useState } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

const push = vi.fn()
const replace = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace, refresh: vi.fn(), back: vi.fn() }) }))

import { Sheet } from '@/components/ds/Sheet'
import { DialogConferma } from '@/components/ds/DialogConferma'
import { useNavigaDaOverlay } from '@/components/ds/useNavigaDaOverlay'

let pushStateSpy: ReturnType<typeof vi.spyOn>
let historyBackSpy: ReturnType<typeof vi.spyOn>
// Stesso stato di history finto della convenzione di `sheet-back-gesture.test.tsx`: i mock di
// `pushState`/`back` non devono toccare `window.location` (trapelerebbe fra i test), ma il gate
// «l'entry in cima è ancora la nostra» legge `window.history.state` — senza questo getter
// resterebbe sempre `null` e il gate non sarebbe esercitabile.
let statoHistoryFinto: unknown = null

beforeEach(() => {
  push.mockClear()
  replace.mockClear()
  statoHistoryFinto = null
  Object.defineProperty(window.history, 'state', { configurable: true, get: () => statoHistoryFinto })
  pushStateSpy = vi.spyOn(window.history, 'pushState').mockImplementation((state: unknown) => {
    statoHistoryFinto = state
  })
  historyBackSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {
    statoHistoryFinto = null
  })
})
afterEach(() => {
  pushStateSpy.mockRestore()
  historyBackSpy.mockRestore()
  vi.restoreAllMocks()
})

/** Host minimo con la forma esatta dei siti reali (`PilaAperta`, `HomeDesktop`, `PilaSplit`,
 *  `SchedaLavoroV3`): un tasto DENTRO lo sheet che naviga e chiude nello stesso gesto —
 *  navigazione PRIMA, chiusura dopo, come impone il contratto di `useNavigaDaOverlay`. */
function HostChiudeENaviga(props: { aperto?: boolean }) {
  const naviga = useNavigaDaOverlay()
  const [aperto, setAperto] = useState(props.aperto ?? true)
  return (
    <Sheet aperto={aperto} onChiudi={() => setAperto(false)} titolo="Prima di consegnare">
      <button
        type="button"
        onClick={() => {
          naviga('/lavori/1/modifica?tab=clinica')
          setAperto(false)
        }}
      >
        Completa i dati del lavoro
      </button>
    </Sheet>
  )
}

describe('useNavigaDaOverlay — navigare via da una pagina con un overlay aperto', () => {
  it('con un overlay aperto SOSTITUISCE la nostra entry (replace), non ci si impila sopra (push)', () => {
    const { unmount } = render(<HostChiudeENaviga />)
    expect(pushStateSpy).toHaveBeenCalledWith({ uaSheet: true }, '')
    fireEvent.click(screen.getByText('Completa i dati del lavoro'))
    expect(replace).toHaveBeenCalledWith('/lavori/1/modifica?tab=clinica')
    expect(push).not.toHaveBeenCalled()
    unmount()
  })

  // IL CUORE DI D-2: con `router.push` nudo la chiusura arrivava a chiamare `history.back()`, e
  // nel browser quella traversal (asincrona ma già in coda) cancellava la navigazione appena
  // chiesta. Dichiarata la navigazione, nessun back deve più partire — né alla chiusura né allo
  // smontaggio che il cambio di rotta porta con sé.
  it('dopo la dichiarazione, chiudere l\'overlay NON chiama più history.back()', () => {
    const { unmount } = render(<HostChiudeENaviga />)
    fireEvent.click(screen.getByText('Completa i dati del lavoro'))
    expect(historyBackSpy).not.toHaveBeenCalled()
    // e nemmeno lo smontaggio successivo (è quello che fa Next quando la rotta cambia)
    unmount()
    expect(historyBackSpy).not.toHaveBeenCalled()
  })

  it('senza nessun overlay aperto resta una navigazione normale (push)', () => {
    function SoloTasto() {
      const naviga = useNavigaDaOverlay()
      return <button type="button" onClick={() => naviga('/dashboard')}>Vai</button>
    }
    const { unmount } = render(<SoloTasto />)
    fireEvent.click(screen.getByText('Vai'))
    expect(push).toHaveBeenCalledWith('/dashboard')
    expect(replace).not.toHaveBeenCalled()
    unmount()
  })

  // Dopo la cessione il modulo non deve credere di possedere ancora un'entry: l'overlay che si
  // apre sulla pagina di DESTINAZIONE deve spingersi la propria protezione, altrimenti il back
  // là in fondo se ne andrebbe dalla pagina invece di chiuderlo.
  it('l\'entry ceduta non resta "nostra": un overlay aperto DOPO la navigazione spinge una entry nuova', () => {
    const primo = render(<HostChiudeENaviga />)
    fireEvent.click(screen.getByText('Completa i dati del lavoro'))
    primo.unmount()
    pushStateSpy.mockClear()
    const secondo = render(
      <Sheet aperto onChiudi={() => {}} titolo="Documenti">
        <p>contenuto</p>
      </Sheet>
    )
    expect(pushStateSpy).toHaveBeenCalledTimes(1)
    expect(pushStateSpy).toHaveBeenCalledWith({ uaSheet: true }, '')
    secondo.unmount()
  })

  // Requisito 4, ri-verificato dopo il cambio: un gesto di ritorno annulla, non conferma. La
  // cessione dell'entry non tocca `alPop`, che continua a chiamare `onAnnulla` del più alto.
  it('un back sopra un DialogConferma continua ad ANNULLARE, mai a confermare', () => {
    const onConferma = vi.fn()
    const onAnnulla = vi.fn()
    const { unmount } = render(
      <DialogConferma
        aperto
        titolo="Butto via il lavoro n.148?"
        testo="Sparisce dalla lista."
        etichettaDistruttiva="Butta via"
        etichettaSicura="Tienilo"
        onConferma={onConferma}
        onAnnulla={onAnnulla}
      />
    )
    act(() => {
      window.dispatchEvent(new Event('popstate'))
    })
    expect(onAnnulla).toHaveBeenCalledTimes(1)
    expect(onConferma).not.toHaveBeenCalled()
    unmount()
  })
})
