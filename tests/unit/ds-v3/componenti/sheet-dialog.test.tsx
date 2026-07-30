// Budget 15s per il render dell'intera pagina catalogo: vedi il commento nell'helper.
import '../budget-catalogo'
import { useState } from 'react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen, fireEvent, within, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'

// Il catalogo (page.tsx) monta ora anche NavDesk (§5.37), che chiama
// useRouter() per «+ Nuovo lavoro»: senza mock, il render fuori da un vero
// App Router lancia "invariant expected app router to be mounted" e fa
// cadere l'intero albero. Stesso pattern di NavDesk.test.tsx.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

// Mock di matchMedia per attivare useReducedMotion — stesso precedente di
// righe.test.tsx (CheckTondo §8.4). Restituisce la funzione di ripristino.
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

// Flush del requestAnimationFrame di SheetRidotto (entrata: false → true).
async function flushFrame(): Promise<void> {
  await act(async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  })
}

const suonaMock = vi.fn()
const vibraMock = vi.fn()
vi.mock('@/design-system/v3/sound', () => ({
  suona: (nome: string) => suonaMock(nome),
  initSuoni: () => {},
}))
vi.mock('@/design-system/v3/haptic', () => ({
  vibra: (tipo: string) => vibraMock(tipo),
}))

// D9a (FIX-F) — `useDragControls` resta REALE (il vero `DragControls`, con `subscribe`
// funzionante — il pannello motion.div deve restare draggable per davvero, swipe-to-dismiss
// incluso): si spia SOLO il metodo `.start`, per provare che il drag parte dal grabber e non dal
// contenuto — il difetto D9a esatto (scroll interpretato come trascinamento del pannello).
const dragControlsStartMock = vi.fn()
vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>()
  return {
    ...actual,
    useDragControls: (...args: Parameters<typeof actual.useDragControls>) => {
      const controls = actual.useDragControls(...args)
      const start = controls.start.bind(controls)
      controls.start = (...startArgs: Parameters<typeof start>) => {
        dragControlsStartMock(...startArgs)
        return start(...startArgs)
      }
      return controls
    },
  }
})

import { Sheet, deveChiudere } from '@/components/ds/Sheet'
import { useTapScrim } from '@/components/ds/useTapScrim'
import { DialogConferma } from '@/components/ds/DialogConferma'
import { RigaDato } from '@/components/ds/CardInfo'

describe('Sheet — bottom sheet (§5.16)', () => {
  beforeEach(() => {
    suonaMock.mockClear()
    vibraMock.mockClear()
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
  })
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
  })

  it('aperto=false → nulla nel DOM', () => {
    render(
      <Sheet aperto={false} onChiudi={() => {}} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByText('Contenuto')).toBeNull()
    expect(screen.queryByText('Chiudi')).toBeNull()
  })

  it('aperto=true → dialog nel DOM, con titolo e children', () => {
    render(
      <Sheet aperto onChiudi={() => {}} titolo="Dettagli lavoro">
        <p>Contenuto dello sheet</p>
      </Sheet>
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText('Dettagli lavoro')).toBeInTheDocument()
    expect(within(dialog).getByText('Contenuto dello sheet')).toBeInTheDocument()
  })

  it('titolo è opzionale: senza titolo lo sheet resta valido', () => {
    render(
      <Sheet aperto onChiudi={() => {}}>
        <p>Solo contenuto</p>
      </Sheet>
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Solo contenuto')).toBeInTheDocument()
  })

  it('grabber 36×4 presente', () => {
    render(
      <Sheet aperto onChiudi={() => {}} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    const grabber = document.querySelector('.ds-sheet-grabber') as HTMLElement
    expect(grabber).not.toBeNull()
    expect(grabber.style.width).toBe('36px')
    expect(grabber.style.height).toBe('4px')
    expect(grabber.style.background).toBe('var(--line)')
  })

  it('radius 28 solo in alto (raggio.sheet)', () => {
    render(
      <Sheet aperto onChiudi={() => {}} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog.style.borderTopLeftRadius).toBe('28px')
    expect(dialog.style.borderTopRightRadius).toBe('28px')
    expect(dialog.style.borderBottomLeftRadius).toBe('0px')
    expect(dialog.style.borderBottomRightRadius).toBe('0px')
  })

  it('max 92% viewport (maxHeight)', () => {
    render(
      <Sheet aperto onChiudi={() => {}} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    expect(screen.getByRole('dialog').style.maxHeight).toBe('92vh')
  })

  it('tap sullo scrim → onChiudi', () => {
    const onChiudi = vi.fn()
    render(
      <Sheet aperto onChiudi={onChiudi} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    const scrim = document.querySelector('.ds-sheet-scrim') as HTMLElement
    expect(scrim).not.toBeNull()
    fireEvent.pointerDown(scrim) // contratto R3: il tap-scrim reale nasce sullo scrim
    fireEvent.click(scrim)
    expect(onChiudi).toHaveBeenCalledTimes(1)
  })

  it('tap DENTRO il contenuto NON chiude (il click non deve propagarsi come tap-scrim)', () => {
    const onChiudi = vi.fn()
    render(
      <Sheet aperto onChiudi={onChiudi} titolo="Dettagli">
        <p>Contenuto cliccabile</p>
      </Sheet>
    )
    fireEvent.click(screen.getByText('Contenuto cliccabile'))
    expect(onChiudi).not.toHaveBeenCalled()
  })

  it('QA live Francesco round 2 — il wrapper del portale (data-ds="v3") è esplicitamente trasparente: solo lo scrim dipinge', () => {
    render(
      <Sheet aperto onChiudi={() => {}} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    const scrim = document.querySelector('.ds-sheet-scrim') as HTMLElement
    const wrapper = scrim.parentElement as HTMLElement
    expect(wrapper).toHaveAttribute('data-ds', 'v3')
    expect(wrapper.style.background).toBe('transparent')
  })

  it('Esc → onChiudi', () => {
    const onChiudi = vi.fn()
    render(
      <Sheet aperto onChiudi={onChiudi} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onChiudi).toHaveBeenCalledTimes(1)
  })

  it('Esc quando aperto=false → nessun listener attivo, onChiudi mai chiamato', () => {
    const onChiudi = vi.fn()
    render(
      <Sheet aperto={false} onChiudi={onChiudi}>
        <p>Contenuto</p>
      </Sheet>
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onChiudi).not.toHaveBeenCalled()
  })

  it('LinkQuieto «Chiudi» sempre presente in fondo, click → onChiudi', () => {
    const onChiudi = vi.fn()
    render(
      <Sheet aperto onChiudi={onChiudi} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    const chiudi = screen.getByText('Chiudi')
    expect(chiudi.tagName).toBe('BUTTON')
    fireEvent.click(chiudi)
    expect(onChiudi).toHaveBeenCalledTimes(1)
    // LinkQuieto non suona mai (§5.5) — nessun secondo suono attribuibile a Sheet
    expect(suonaMock).not.toHaveBeenCalled()
  })

  it('MAI una X come unica uscita: nessun bottone con aria-label "Chiudi"/"×" a parte il LinkQuieto testuale', () => {
    render(
      <Sheet aperto onChiudi={() => {}} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    const dialog = screen.getByRole('dialog')
    const bottoni = within(dialog).getAllByRole('button')
    expect(bottoni.length).toBe(1)
    expect(bottoni[0]).toHaveTextContent('Chiudi')
  })

  it('body scroll lock quando aperto, ripristinato SOLO dopo la fine dell\'animazione di uscita (bug QA live Francesco: sbloccare a metà animazione fa slittare lateralmente il pannello centrato quando riappare la scrollbar)', async () => {
    document.body.style.overflow = 'scroll'
    const { rerender } = render(
      <Sheet aperto={false} onChiudi={() => {}}>
        <p>Contenuto</p>
      </Sheet>
    )
    expect(document.body.style.overflow).toBe('scroll')
    rerender(
      <Sheet aperto onChiudi={() => {}}>
        <p>Contenuto</p>
      </Sheet>
    )
    expect(document.body.style.overflow).toBe('hidden')
    rerender(
      <Sheet aperto={false} onChiudi={() => {}}>
        <p>Contenuto</p>
      </Sheet>
    )
    // Subito dopo aperto=false l'uscita è avviata ma non notificata: il body
    // DEVE restare bloccato, altrimenti la scrollbar ricompare a metà uscita
    // e il wrapper centrato si ricentra spostando il pannello di qualche px.
    // NB (intervento flake 22/07): con MotionGlobalConfig.skipAnimations
    // (tests/setup.ts) l'exit non dura più ~500ms di molla.smooth — completa
    // al primo tick di motion, ma la notifica (onExitComplete → sblocco)
    // resta ASINCRONA rispetto all'act del rerender: è questo che tiene vera
    // l'asserzione sincrona qui sotto. Se un upgrade di motion rendesse il
    // completamento sincrono, questo assert fallirebbe con 'scroll' — rosso
    // rumoroso, ripartire da questa nota (vale per i 4 test scroll-lock).
    expect(document.body.style.overflow).toBe('hidden')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.body.style.overflow).toBe('scroll')
  })

  it('compensa la larghezza della scrollbar con paddingRight mentre il body è bloccato (evita il layout shift alla ricomparsa)', async () => {
    const precedentePaddingRight = document.body.style.paddingRight
    // Simula un browser con scrollbar "classica" che riserva 17px di layout:
    // innerWidth include la scrollbar, clientWidth no.
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 })
    Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 1263 })
    try {
      const { rerender } = render(
        <Sheet aperto={false} onChiudi={() => {}}>
          <p>Contenuto</p>
        </Sheet>
      )
      expect(document.body.style.paddingRight).toBe('')
      rerender(
        <Sheet aperto onChiudi={() => {}}>
          <p>Contenuto</p>
        </Sheet>
      )
      expect(document.body.style.paddingRight).toBe('17px')
      rerender(
        <Sheet aperto={false} onChiudi={() => {}}>
          <p>Contenuto</p>
        </Sheet>
      )
      // Ancora compensato tra l'avvio dell'uscita e la sua notifica — coerente
      // col lock (vedi la nota skipAnimations nel primo test scroll-lock).
      expect(document.body.style.paddingRight).toBe('17px')
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      expect(document.body.style.paddingRight).toBe(precedentePaddingRight)
    } finally {
      delete (document.documentElement as unknown as { clientWidth?: number }).clientWidth
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 })
      document.body.style.paddingRight = precedentePaddingRight
    }
  })

  it('riapertura mentre l\'uscita precedente sta ancora giocando NON blocca lo scroll per sempre (il valore originale non va sovrascritto con "hidden")', async () => {
    document.body.style.overflow = 'scroll'
    const { rerender } = render(
      <Sheet aperto onChiudi={() => {}}>
        <p>Contenuto</p>
      </Sheet>
    )
    expect(document.body.style.overflow).toBe('hidden')
    rerender(
      <Sheet aperto={false} onChiudi={() => {}}>
        <p>Contenuto</p>
      </Sheet>
    )
    // Uscita avviata ma non ancora notificata, ancora bloccato (comportamento
    // atteso, testato sopra — vedi la nota skipAnimations nel primo test).
    expect(document.body.style.overflow).toBe('hidden')
    // Riapre PRIMA che l'uscita precedente completi: senza la guardia,
    // questo effect ri-catturerebbe 'hidden' come "valore precedente",
    // perdendo per sempre il vero valore originale ('scroll').
    rerender(
      <Sheet aperto onChiudi={() => {}}>
        <p>Contenuto</p>
      </Sheet>
    )
    expect(document.body.style.overflow).toBe('hidden')
    // Richiude e questa volta lascia completare l'uscita.
    rerender(
      <Sheet aperto={false} onChiudi={() => {}}>
        <p>Contenuto</p>
      </Sheet>
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.body.style.overflow).toBe('scroll')
  })

  it('unmount REALE mentre aperto (es. navigazione client-side con lo sheet aperto) → scroll ripristinato subito, mai bloccato per sempre', () => {
    // Nessun rerender con aperto=false: qui il componente sparisce dal tree
    // mentre è ancora aperto.
    //
    // ⚠️ AGGIORNATO 30/07/2026 — questo commento diceva che la sentinella «deve
    // essere dichiarata PRIMA dell'effect dello scroll lock, altrimenti la
    // cleanup del lock legge montatoRef ancora true e non sblocca mai». Non è
    // più vero: da quando il rilascio vive nella cleanup della sentinella
    // (`Sheet.tsx`), a sentinella dichiarata DOPO questo caso resterebbe verde
    // lo stesso — la cleanup del lock girerebbe per prima senza sbloccare, e la
    // sentinella rilascerebbe subito dopo. L'ordine non è più portante, e
    // nessuna guardia lo protegge: non scriverlo come se lo fosse.
    //
    // Quello che il caso prova ANCORA, e che è utile sapere:
    //  · fino alla riparazione era la misura dell'ordine delle cleanup per
    //    contraddizione — su quel codice l'unico sblocco possibile qui era la
    //    cleanup del lock che legge `montatoRef.current === false`, quindi il
    //    suo verde diceva che React 19.2.4 esegue le cleanup in ORDINE DI SETUP
    //    (A setup, B setup, A cleanup, B cleanup), non LIFO;
    //  · oggi è il percorso che fa DAVVERO la doppia chiamata: la sentinella
    //    rilascia, poi la cleanup del lock richiama `sbloccaScroll` con il ref
    //    già azzerato. Il suo verde è la prova che la seconda chiamata è
    //    innocua — un secondo decremento porterebbe il contatore a −1 e il
    //    blocco successivo non scriverebbe più 'hidden'.
    document.body.style.overflow = 'scroll'
    const { unmount } = render(
      <Sheet aperto onChiudi={() => {}}>
        <p>Contenuto</p>
      </Sheet>
    )
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('scroll')
  })

  it('inversa: la chiusura normale (aperto=false, uscita animata) continua a sbloccare a fine animazione anche dopo il riordino degli effect', async () => {
    document.body.style.overflow = 'scroll'
    const { rerender } = render(
      <Sheet aperto onChiudi={() => {}}>
        <p>Contenuto</p>
      </Sheet>
    )
    expect(document.body.style.overflow).toBe('hidden')
    rerender(
      <Sheet aperto={false} onChiudi={() => {}}>
        <p>Contenuto</p>
      </Sheet>
    )
    // Ancora bloccato tra avvio e notifica dell'uscita (il componente resta
    // montato — vedi la nota skipAnimations nel primo test scroll-lock).
    expect(document.body.style.overflow).toBe('hidden')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.body.style.overflow).toBe('scroll')
  })

  it('DUE Sheet sovrapposti (D84): chiudere quello SOTTO non sblocca la pagina finché quello SOPRA è ancora aperto, e alla fine il body torna al valore originale', async () => {
    // È il difetto che ha fatto nascere `blocca-scorrimento.ts`, nella sua forma osservabile da
    // fuori. Col ref-per-istanza di prima: il pannello sopra catturava 'hidden' (il valore appena
    // scritto da quello sotto), e la chiusura di quello sotto «ripristinava» il body a 'scroll'
    // MENTRE il pannello sopra era ancora aperto — pagina che scorre sotto un pannello modale — e
    // alla chiusura successiva il ripristino a 'hidden' lasciava la pagina bloccata per sempre.
    //
    // Chiusure SFALSATE, non nello stesso commit: due `AnimatePresence` indipendenti completano
    // in un ordine che questo test non controlla, e un finale giusto per caso non proverebbe
    // niente. L'ordine strettamente controllato (sblocchi in ordine di apertura) è provato dove
    // le chiamate sono esplicite: tests/unit/ds-v3/componenti/blocca-scorrimento.test.ts.
    document.body.style.overflow = 'scroll'
    function DueSheet({ sotto, sopra }: { sotto: boolean; sopra: boolean }) {
      return (
        <>
          <Sheet aperto={sotto} onChiudi={() => {}}>
            <p>Pannello sotto</p>
          </Sheet>
          <Sheet aperto={sopra} onChiudi={() => {}}>
            <p>Pannello sopra</p>
          </Sheet>
        </>
      )
    }
    const { rerender } = render(<DueSheet sotto sopra />)
    expect(screen.getAllByRole('dialog')).toHaveLength(2)
    expect(document.body.style.overflow).toBe('hidden')

    // Chiude SOLO quello sotto, e si lascia completare la sua uscita (sblocco deferito arrivato).
    rerender(<DueSheet sotto={false} sopra />)
    await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(1))
    // ASSERZIONE DISCRIMINANTE: qui il vecchio codice rimetteva 'scroll'.
    expect(document.body.style.overflow).toBe('hidden')

    rerender(<DueSheet sotto={false} sopra={false} />)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.body.style.overflow).toBe('scroll')
  })

  // ── Smontaggio A METÀ USCITA — il rilascio del posto nel contatore ──────────────────────────
  // La sequenza, che è quella vera del gesto «chiudi lo sheet e cambia rotta nello stesso
  // momento» (`PilaAperta.tsx`, `PilaSplit.tsx`: `onConfermato={(id) => { navigaDaOverlay(...);
  // setConfermaId(null) }}` su un `ConfermaCassettaSheet` montato sempre e pilotato da
  // `aperto={confermaId !== null}`):
  //   1. `aperto` passa da true a false: la pulizia dell'esecuzione precedente dell'effect del
  //      lock gira, ma con le animazioni attive e il componente ANCORA MONTATO non sblocca —
  //      giusto, aspetta `onExitComplete` (è il comportamento provato nei due casi qui sopra);
  //   2. l'effect rigira con `aperto = false`, esce alla prima riga e NON registra pulizia;
  //   3. il componente si smonta: dell'effect del lock non c'è più niente da eseguire.
  //
  // 🛑 QUELLO CHE IL CASO PROVA, E QUELLO CHE NON PROVA — misurato, non dedotto.
  // L'ipotesi di partenza era «il posto resta occupato per sempre». È FALSA: anche senza la
  // riparazione il rilascio arriva lo stesso, ~1 frame dopo (misura con
  // `MotionGlobalConfig.skipAnimations = false` e smontaggio a 0 ms dall'inizio dell'uscita:
  // 2 ms, contro i 23 ms del completamento naturale — è lo smontaggio a farlo arrivare, non
  // l'animazione che finisce). Il perché sta in framer-motion
  // (`features/animation/exit.mjs`): `ExitAnimationFeature.update()` registra
  // `exitAnimation.then(() => onExitComplete(this.id))`, lo smontaggio risolve quella promise
  // (`AnimationFeature.unmount()` → `animationState.reset()`), e il `.then` è una chiusura JS
  // che sopravvive all'albero React smontato.
  // Quindi il rosso qui sotto NON è «il corpo resta bloccato per sempre»: è **il rilascio è
  // sincrono con lo smontaggio invece di essere appeso a una promise di framer-motion che spara
  // dopo**. È una differenza sincrono-vs-microtask, deterministica: non è un'asserzione di
  // tempistica ballerina. E vale la riga perché quel rilascio dipendeva da due invarianti che
  // nessuna guardia di questo repo può verificare — che React esegua le cleanup in ordine di
  // setup (con LIFO quel percorso perderebbe il posto DAVVERO) e che framer-motion continui a
  // risolvere la promise di un'uscita interrotta. La riparazione le ritira entrambe.
  //
  // Il secondo braccio (pannello NUOVO che apre e chiude dopo) è un guardiano di regressione,
  // NON il discriminante: è verde sia prima sia dopo la riparazione, proprio perché il rilascio
  // tardivo ripulisce comunque il contatore. Quello che sa prendere è un rilascio DOPPIO —
  // contatore a −1, e il `bloccaScorrimento()` successivo non arriverebbe mai a
  // `bloccanti === 1`, quindi il pannello nuovo non scriverebbe mai 'hidden'.
  it('smontaggio A METÀ USCITA (chiusura + cambio rotta nello stesso gesto, cfr. PilaAperta/PilaSplit): il posto nel contatore viene rilasciato — il corpo torna al valore di prima E un pannello nuovo blocca/sblocca normalmente', async () => {
    // Sentinelle che nessun bloccante scriverebbe mai: `overflow:'scroll'` non è `'hidden'`, e
    // `paddingRight:'3px'` non è la compensazione simulata (17px) — «ripristinato» e «compensato»
    // restano distinguibili. Stessa scelta, e stesso motivo, di blocca-scorrimento.test.ts.
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 })
    Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 1263 })
    document.body.style.overflow = 'scroll'
    document.body.style.paddingRight = '3px'
    try {
      const { rerender, unmount } = render(
        <Sheet aperto onChiudi={() => {}}>
          <p>Contenuto</p>
        </Sheet>
      )
      // MENTRE è bloccato: senza questa coppia, un verde finale proverebbe solo che il corpo era
      // già come lo volevamo — non che il blocco sia mai partito.
      expect(document.body.style.overflow).toBe('hidden')
      expect(document.body.style.paddingRight).toBe('17px')

      rerender(
        <Sheet aperto={false} onChiudi={() => {}}>
          <p>Contenuto</p>
        </Sheet>
      )
      // Uscita avviata, NON completata (vedi la nota skipAnimations nel primo test scroll-lock).
      // Questa riga è anche la guardia del caso: se un giorno l'uscita completasse in modo
      // sincrono, qui si vedrebbe 'scroll' e il caso non starebbe più provando lo smontaggio a
      // metà uscita — rosso rumoroso, ripartire da qui.
      expect(document.body.style.overflow).toBe('hidden')

      // Il gesto vero: la rotta cambia e l'albero sparisce mentre l'uscita sta ancora giocando.
      unmount()

      // 🔑 LE DUE ASSERZIONI CHE SI ACCENDONO CON LA RIPARAZIONE (2 su 10 del caso). Il rilascio
      // deve essere avvenuto DENTRO il commit di smontaggio — non un microtask dopo, appeso alla
      // promise di framer-motion (v. il blocco sopra: senza la riparazione qui si legge ancora
      // 'hidden'/'17px', e il rilascio arriva a +2 ms).
      expect(document.body.style.overflow).toBe('scroll')
      expect(document.body.style.paddingRight).toBe('3px')

      // ── Guardiano di regressione: il contatore è a zero, non a −1 ──────────────────────────
      // Verde sia prima sia dopo la riparazione (v. il blocco sopra: non è il discriminante).
      // Prende il caso opposto, il rilascio DOPPIO: con il contatore a −1 il `bloccaScorrimento()`
      // di questo pannello non arriverebbe mai a `bloccanti === 1` e non scriverebbe mai 'hidden'.
      const nuovo = render(
        <Sheet aperto={false} onChiudi={() => {}}>
          <p>Pannello nuovo</p>
        </Sheet>
      )
      nuovo.rerender(
        <Sheet aperto onChiudi={() => {}}>
          <p>Pannello nuovo</p>
        </Sheet>
      )
      expect(document.body.style.overflow).toBe('hidden')
      expect(document.body.style.paddingRight).toBe('17px')

      nuovo.rerender(
        <Sheet aperto={false} onChiudi={() => {}}>
          <p>Pannello nuovo</p>
        </Sheet>
      )
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      expect(document.body.style.overflow).toBe('scroll')
      expect(document.body.style.paddingRight).toBe('3px')
    } finally {
      // `afterEach` fa `vi.restoreAllMocks()`, che NON disfa una `Object.defineProperty`: senza
      // questo finally la larghezza simulata della barra resterebbe addosso a tutto il file.
      delete (document.documentElement as unknown as { clientWidth?: number }).clientWidth
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 })
    }
  })

  it('focus management: al momento dell\'apertura il dialog riceve il focus; alla chiusura torna all\'elemento precedente', async () => {
    function Wrapper() {
      const [aperto, setAperto] = useState(false)
      return (
        <div>
          <button onClick={() => setAperto(true)}>Apri</button>
          <Sheet aperto={aperto} onChiudi={() => setAperto(false)}>
            <p>Contenuto</p>
          </Sheet>
        </div>
      )
    }
    render(<Wrapper />)
    const apriBtn = screen.getByRole('button', { name: 'Apri' })
    apriBtn.focus()
    expect(document.activeElement).toBe(apriBtn)
    fireEvent.click(apriBtn)
    const dialog = screen.getByRole('dialog')
    expect(document.activeElement).toBe(dialog)
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(apriBtn)
  })

  it('accoglie RigheDato come children (uso realistico nel catalogo)', () => {
    render(
      <Sheet aperto onChiudi={() => {}} titolo="Dettagli lavoro">
        <RigaDato chiave="Dentista" valore="Studio Bianchi" />
        <RigaDato chiave="Paziente" valore="PZ-1042" />
      </Sheet>
    )
    expect(screen.getByText('Studio Bianchi')).toBeInTheDocument()
    expect(screen.getByText('PZ-1042')).toBeInTheDocument()
  })

  it('i testi (titolo + Chiudi) passano trovaParoleVietate', () => {
    render(
      <Sheet aperto onChiudi={() => {}} titolo="Dettagli del lavoro">
        <p>Contenuto</p>
      </Sheet>
    )
    const testo = screen.getByRole('dialog').textContent ?? ''
    expect(trovaParoleVietate(testo)).toEqual([])
  })
})

describe('deveChiudere — soglia dismiss swipe giù (§5.16, §8.2.3)', () => {
  const ALTEZZA = 400 // px, pannello demo

  it('sotto soglia distanza e velocità → NON chiude (torna su con molla.smooth)', () => {
    expect(deveChiudere(50, 0, ALTEZZA)).toBe(false)
  })

  it('offsetY oltre il 25% dell\'altezza → chiude', () => {
    expect(deveChiudere(ALTEZZA * 0.25 + 1, 0, ALTEZZA)).toBe(true)
  })

  it('offsetY esattamente al 25% (confine) → NON chiude (soglia stretta, > non >=)', () => {
    expect(deveChiudere(ALTEZZA * 0.25, 0, ALTEZZA)).toBe(false)
  })

  it('offsetY appena sotto il 25% → NON chiude', () => {
    expect(deveChiudere(ALTEZZA * 0.25 - 1, 0, ALTEZZA)).toBe(false)
  })

  it('velocità oltre 500px/s (anche con offset minimo) → chiude — un colpo secco basta', () => {
    expect(deveChiudere(5, 501, ALTEZZA)).toBe(true)
  })

  it('velocità esattamente 500 (confine) → NON chiude', () => {
    expect(deveChiudere(5, 500, ALTEZZA)).toBe(false)
  })

  it('entrambe le soglie superate → chiude', () => {
    expect(deveChiudere(ALTEZZA * 0.5, 800, ALTEZZA)).toBe(true)
  })

  it('offsetY negativo (trascinato verso l\'alto, contro il vincolo dragConstraints top:0) → mai chiude', () => {
    expect(deveChiudere(-50, 0, ALTEZZA)).toBe(false)
  })

  it('velocità negativa (rilasciato mentre risaliva) → non chiude anche con offset residuo alto', () => {
    expect(deveChiudere(ALTEZZA * 0.5, -800, ALTEZZA)).toBe(true) // offset da solo basta
    expect(deveChiudere(10, -800, ALTEZZA)).toBe(false) // né offset né velocità (negativa) bastano
  })

  it('altezza 0 (difensivo): qualunque offsetY positivo supera la soglia 0 → chiude', () => {
    expect(deveChiudere(1, 0, 0)).toBe(true)
    expect(deveChiudere(0, 0, 0)).toBe(false)
  })

  it('offset e velocità entrambi zero → non chiude', () => {
    expect(deveChiudere(0, 0, ALTEZZA)).toBe(false)
  })
})

describe('Sheet — swipe giù per chiudere, wiring drag (§5.16, §8.2.3, D9a FIX-F)', () => {
  beforeEach(() => {
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
    dragControlsStartMock.mockClear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
  })

  // D9a — root cause: prima del fix, il pannello aveva `drag="y"` con `dragListener` di default
  // (true), quindi Motion imponeva `touch-action: pan-x` sull'INTERO pannello — anche sulla lista
  // scrollabile dentro, che su touch interpretava lo swipe verticale come trascinamento del
  // pannello invece che scroll del contenuto. Il fix (`dragListener={false}` + `dragControls` +
  // via `useDragControls()`, drag avviato SOLO da `onPointerDown` sul grabber) fa sì che Motion
  // NON imposti più `touch-action` sul pannello (v. framer-motion `use-props.mjs`: la regola
  // `props.drag && props.dragListener !== false` non scatta più) — lo scroll nativo torna libero
  // ovunque tranne che afferrando il grabber.
  it('il pannello NON impone più touch-action (dragListener={false}): lo scroll nativo del contenuto è libero ovunque tranne il grabber', () => {
    render(
      <Sheet aperto onChiudi={() => {}} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog.style.touchAction).toBeFalsy()
  })

  it('il drag parte SOLO dal grabber: pointerdown lì avvia dragControls.start; pointerdown nel contenuto NO', () => {
    render(
      <Sheet aperto onChiudi={() => {}} titolo="Dettagli">
        <p>Contenuto scrollabile</p>
      </Sheet>
    )
    // Pointerdown nel contenuto: NON deve avviare il drag (è lì che lo scroll deve restare nativo).
    fireEvent.pointerDown(screen.getByText('Contenuto scrollabile'))
    expect(dragControlsStartMock).not.toHaveBeenCalled()

    // Pointerdown sul grabber: avvia il drag esplicitamente (pattern dragListener=false).
    const grabber = document.querySelector('.ds-sheet-grabber') as HTMLElement
    fireEvent.pointerDown(grabber)
    expect(dragControlsStartMock).toHaveBeenCalledTimes(1)
  })

  // Con `dragListener={false}` Motion non impone più `touch-action` da solo su NESSUN elemento
  // (né sul pannello, l'obiettivo di D9a, né sul grabber): il grabber è ora l'UNICO innesco
  // manuale del drag (`dragControls.start`), quindi deve dichiarare da sé `touch-action: none` —
  // altrimenti su touch il browser reclama il gesto (scroll/overscroll) prima che il pan session
  // parta (pattern documentato da Motion per gli elementi-innesco di `useDragControls`).
  it('il grabber dichiara touch-action:none (innesco manuale del drag — senza, il browser reclama il gesto prima del pan session)', () => {
    render(
      <Sheet aperto onChiudi={() => {}} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    const grabber = document.querySelector('.ds-sheet-grabber') as HTMLElement
    expect(grabber.style.touchAction).toBe('none')
  })

  it('ramo reduced-motion: il pannello NON è draggable (drag solo sul ramo animato, §8.4 — documentato in JSDoc)', () => {
    const ripristina = attivaReducedMotion()
    try {
      render(
        <Sheet aperto onChiudi={() => {}} titolo="Dettagli">
          <p>Contenuto</p>
        </Sheet>
      )
      const dialog = screen.getByRole('dialog')
      expect(dialog.style.touchAction).toBeFalsy()
    } finally {
      ripristina()
    }
  })

  it('scrim, Esc e LinkQuieto «Chiudi» restano wired invariati accanto al drag', () => {
    const onChiudi = vi.fn()
    render(
      <Sheet aperto onChiudi={onChiudi} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    fireEvent.click(screen.getByText('Chiudi'))
    expect(onChiudi).toHaveBeenCalledTimes(1)
  })
})

// D9a (FIX-F) — il grabber resta visivamente 36×4 (invariato, v. test "grabber 36×4 presente"
// sopra): l'area di PRESA (dove parte il drag) si allarga con un ::before invisibile in
// ds-v3.css, senza toccare il disegno. jsdom non fa layout reale: qui si verifica solo che la
// regola CSS esista e che la sua estensione dichiarata raggiunga i ≥44px di lato raccomandati
// (WCAG 2.5.5) — la geometria a schermo resta da confermare su device (v. report).
describe('Sheet — grabber, area di presa ≥44px (D9a FIX-F, §8.2.3)', () => {
  it('ds-v3.css dichiara un ::before sul grabber che estende l\'hit-area a ≥44px di lato', () => {
    const css = readFileSync(join(process.cwd(), 'src/app/ds-v3.css'), 'utf8')
    const blocco = css.match(/\.ds-sheet-grabber::before\s*\{([^}]*)\}/)
    expect(blocco).not.toBeNull()
    const corpo = blocco![1]
    const insetMatch = /inset:\s*(-?\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)px/.exec(corpo)
    expect(insetMatch).not.toBeNull()
    const [, verticaleStr, orizzontaleStr] = insetMatch!
    const verticale = Math.abs(Number(verticaleStr))
    const orizzontale = Math.abs(Number(orizzontaleStr))
    // Grabber visivo: 36×4 (righe 362-371 di Sheet.tsx). L'inset negativo espande simmetricamente
    // sopra/sotto e a sinistra/destra: altezza finale = 4 + 2·verticale, larghezza = 36 + 2·orizzontale.
    const altezzaFinale = 4 + 2 * verticale
    const larghezzaFinale = 36 + 2 * orizzontale
    expect(altezzaFinale).toBeGreaterThanOrEqual(44)
    expect(larghezzaFinale).toBeGreaterThanOrEqual(44)
  })

  // `touch-action` NON si eredita dagli pseudo-elementi: il `touchAction:'none'` inline sul
  // grabber (Sheet.tsx) copre SOLO la barra visibile 36×4. Senza questa regola sul `::before`, un
  // dito che atterra nel margine allargato (fuori dalla barra, dentro l'hit-area) lascerebbe il
  // browser reclamare lo scroll prima che `dragControls.start` prenda il pan session.
  it('il ::before dell\'hit-area dichiara touch-action:none (il margine allargato deve innescare il drag anche lì, non lo scroll)', () => {
    const css = readFileSync(join(process.cwd(), 'src/app/ds-v3.css'), 'utf8')
    const blocco = css.match(/\.ds-sheet-grabber::before\s*\{([^}]*)\}/)
    expect(blocco).not.toBeNull()
    expect(blocco![1]).toMatch(/touch-action:\s*none/)
  })
})

describe('DialogConferma — conferma distruttiva centrata (§5.17)', () => {
  const OGGETTO = 'Butto via il lavoro n.148 di Studio Bianchi?'

  beforeEach(() => {
    suonaMock.mockClear()
    vibraMock.mockClear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('aperto=false → nulla nel DOM', () => {
    render(
      <DialogConferma
        aperto={false}
        titolo="Sei sicuro?"
        testo={OGGETTO}
        etichettaDistruttiva="Sì, buttalo via"
        etichettaSicura="No, tienilo"
        onConferma={() => {}}
        onAnnulla={() => {}}
      />
    )
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByText(OGGETTO)).toBeNull()
  })

  it('aperto=true → titolo e testo (con oggetto esplicito) resi', () => {
    render(
      <DialogConferma
        aperto
        titolo="Sei sicuro?"
        testo={OGGETTO}
        etichettaDistruttiva="Sì, buttalo via"
        etichettaSicura="No, tienilo"
        onConferma={() => {}}
        onAnnulla={() => {}}
      />
    )
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Sei sicuro?')).toBeInTheDocument()
    expect(within(dialog).getByText(OGGETTO)).toBeInTheDocument()
  })

  it('ordine nel DOM: azione sicura (TastoSecondario) SOPRA, distruttiva (TastoPrimario) SOTTO', () => {
    render(
      <DialogConferma
        aperto
        titolo="Sei sicuro?"
        testo={OGGETTO}
        etichettaDistruttiva="Sì, buttalo via"
        etichettaSicura="No, tienilo"
        onConferma={() => {}}
        onAnnulla={() => {}}
      />
    )
    const dialog = screen.getByRole('dialog')
    const bottoni = within(dialog).getAllByRole('button')
    expect(bottoni.length).toBe(2)
    expect(bottoni[0]).toHaveTextContent('No, tienilo')
    expect(bottoni[1]).toHaveTextContent('Sì, buttalo via')
  })

  it('entrambe le etichette sono rese e cliccabili: onConferma/onAnnulla wired correttamente', () => {
    const onConferma = vi.fn()
    const onAnnulla = vi.fn()
    render(
      <DialogConferma
        aperto
        titolo="Sei sicuro?"
        testo={OGGETTO}
        etichettaDistruttiva="Sì, buttalo via"
        etichettaSicura="No, tienilo"
        onConferma={onConferma}
        onAnnulla={onAnnulla}
      />
    )
    fireEvent.click(screen.getByText('No, tienilo'))
    expect(onAnnulla).toHaveBeenCalledTimes(1)
    expect(onConferma).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('Sì, buttalo via'))
    expect(onConferma).toHaveBeenCalledTimes(1)
  })

  it('tap sullo scrim → onAnnulla (via di fuga sicura, mai la distruttiva)', () => {
    const onConferma = vi.fn()
    const onAnnulla = vi.fn()
    render(
      <DialogConferma
        aperto
        titolo="Sei sicuro?"
        testo={OGGETTO}
        etichettaDistruttiva="Sì, buttalo via"
        etichettaSicura="No, tienilo"
        onConferma={onConferma}
        onAnnulla={onAnnulla}
      />
    )
    const scrim = document.querySelector('.ds-dialog-scrim') as HTMLElement
    expect(scrim).not.toBeNull()
    fireEvent.pointerDown(scrim) // contratto R3: il tap-scrim reale nasce sullo scrim
    fireEvent.click(scrim)
    expect(onAnnulla).toHaveBeenCalledTimes(1)
    expect(onConferma).not.toHaveBeenCalled()
  })

  it('Esc → onAnnulla', () => {
    const onAnnulla = vi.fn()
    render(
      <DialogConferma
        aperto
        titolo="Sei sicuro?"
        testo={OGGETTO}
        etichettaDistruttiva="Sì, buttalo via"
        etichettaSicura="No, tienilo"
        onConferma={() => {}}
        onAnnulla={onAnnulla}
      />
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onAnnulla).toHaveBeenCalledTimes(1)
  })

  it('card centrata max 340', () => {
    render(
      <DialogConferma
        aperto
        titolo="Sei sicuro?"
        testo={OGGETTO}
        etichettaDistruttiva="Sì, buttalo via"
        etichettaSicura="No, tienilo"
        onConferma={() => {}}
        onAnnulla={() => {}}
      />
    )
    expect(screen.getByRole('dialog').style.maxWidth).toBe('340px')
  })

  it('nessun suono all\'apertura (il suono appartiene all\'esito, non a DialogConferma)', () => {
    render(
      <DialogConferma
        aperto
        titolo="Sei sicuro?"
        testo={OGGETTO}
        etichettaDistruttiva="Sì, buttalo via"
        etichettaSicura="No, tienilo"
        onConferma={() => {}}
        onAnnulla={() => {}}
      />
    )
    expect(suonaMock).not.toHaveBeenCalled()
  })

  it('i testi passano trovaParoleVietate', () => {
    render(
      <DialogConferma
        aperto
        titolo="Sei sicuro?"
        testo={OGGETTO}
        etichettaDistruttiva="Sì, buttalo via"
        etichettaSicura="No, tienilo"
        onConferma={() => {}}
        onAnnulla={() => {}}
      />
    )
    const testo = screen.getByRole('dialog').textContent ?? ''
    expect(trovaParoleVietate(testo)).toEqual([])
  })

  it('QA live Francesco round 2 — il wrapper del portale (data-ds="v3") è esplicitamente trasparente: solo lo scrim dipinge', () => {
    render(
      <DialogConferma
        aperto
        titolo="Sei sicuro?"
        testo={OGGETTO}
        etichettaDistruttiva="Sì, buttalo via"
        etichettaSicura="No, tienilo"
        onConferma={() => {}}
        onAnnulla={() => {}}
      />
    )
    const scrim = document.querySelector('.ds-dialog-scrim') as HTMLElement
    const wrapper = scrim.parentElement as HTMLElement
    expect(wrapper).toHaveAttribute('data-ds', 'v3')
    expect(wrapper.style.background).toBe('transparent')
  })
})

describe('Sheet · DialogConferma — reduced motion (§8.4)', () => {
  let ripristinaMatchMedia: () => void

  beforeEach(() => {
    suonaMock.mockClear()
    vibraMock.mockClear()
    ripristinaMatchMedia = attivaReducedMotion()
  })
  afterEach(() => {
    ripristinaMatchMedia()
    vi.restoreAllMocks()
    document.body.style.overflow = ''
  })

  it('Sheet: si apre in dissolvenza e raggiunge opacity 1 (SheetRidotto, rAF)', async () => {
    render(
      <Sheet aperto onChiudi={() => {}} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    // La transizione è la dissolvenza CSS pura (cssEase.generico), non la molla
    expect(dialog.style.transition).toContain('opacity')
    await flushFrame()
    expect(dialog.style.opacity).toBe('1')
    // Il contenuto e la via di fuga restano al loro posto
    expect(within(dialog).getByText('Contenuto')).toBeInTheDocument()
    expect(within(dialog).getByText('Chiudi')).toBeInTheDocument()
  })

  it('Sheet: la chiusura è ISTANTANEA — nulla nel DOM subito dopo aperto=false', async () => {
    const { rerender } = render(
      <Sheet aperto onChiudi={() => {}} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    await flushFrame()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    rerender(
      <Sheet aperto={false} onChiudi={() => {}} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    // Senza AnimatePresence nel ramo ridotto la rimozione è immediata: nessun waitFor
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByText('Contenuto')).toBeNull()
  })

  it('DialogConferma: il ramo ridotto renderizza e il tap sullo scrim chiama comunque onAnnulla', () => {
    const onConferma = vi.fn()
    const onAnnulla = vi.fn()
    render(
      <DialogConferma
        aperto
        titolo="Sei sicuro?"
        testo="Butto via il lavoro n.148 di Studio Bianchi?"
        etichettaDistruttiva="Sì, buttalo via"
        etichettaSicura="No, tienilo"
        onConferma={onConferma}
        onAnnulla={onAnnulla}
      />
    )
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Sei sicuro?')).toBeInTheDocument()
    expect(within(dialog).getByText('Butto via il lavoro n.148 di Studio Bianchi?')).toBeInTheDocument()
    const scrim = document.querySelector('.ds-dialog-scrim') as HTMLElement
    expect(scrim).not.toBeNull()
    fireEvent.pointerDown(scrim) // contratto R3: il tap-scrim reale nasce sullo scrim
    fireEvent.click(scrim)
    expect(onAnnulla).toHaveBeenCalledTimes(1)
    expect(onConferma).not.toHaveBeenCalled()
  })
})

describe('Sheet · DialogConferma — aria labelledby/describedby', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.style.overflow = ''
  })

  it('Sheet con titolo: aria-labelledby punta all\'id del titolo', () => {
    render(
      <Sheet aperto onChiudi={() => {}} titolo="Dettagli lavoro">
        <p>Contenuto</p>
      </Sheet>
    )
    const dialog = screen.getByRole('dialog')
    const labelledby = dialog.getAttribute('aria-labelledby')
    expect(labelledby).toBeTruthy()
    const titolo = document.getElementById(labelledby as string)
    expect(titolo).not.toBeNull()
    expect(titolo).toHaveTextContent('Dettagli lavoro')
    // Il nome accessibile del dialog È il titolo
    expect(screen.getByRole('dialog', { name: 'Dettagli lavoro' })).toBe(dialog)
  })

  it('Sheet senza titolo: nessun aria-labelledby appeso a un id inesistente', () => {
    render(
      <Sheet aperto onChiudi={() => {}}>
        <p>Contenuto</p>
      </Sheet>
    )
    expect(screen.getByRole('dialog').getAttribute('aria-labelledby')).toBeNull()
  })

  it('DialogConferma: aria-labelledby → titolo, aria-describedby → testo (l\'oggetto esplicito)', () => {
    render(
      <DialogConferma
        aperto
        titolo="Sei sicuro?"
        testo="Butto via il lavoro n.148 di Studio Bianchi?"
        etichettaDistruttiva="Sì, buttalo via"
        etichettaSicura="No, tienilo"
        onConferma={() => {}}
        onAnnulla={() => {}}
      />
    )
    const dialog = screen.getByRole('dialog')
    const labelledby = dialog.getAttribute('aria-labelledby')
    const describedby = dialog.getAttribute('aria-describedby')
    expect(labelledby).toBeTruthy()
    expect(describedby).toBeTruthy()
    expect(document.getElementById(labelledby as string)).toHaveTextContent('Sei sicuro?')
    expect(document.getElementById(describedby as string)).toHaveTextContent(
      'Butto via il lavoro n.148 di Studio Bianchi?'
    )
    expect(screen.getByRole('dialog', { name: 'Sei sicuro?' })).toBe(dialog)
  })
})

describe('dizionario sui testi del catalogo — sezione «Sheet · DialogConferma»', () => {
  it('i testi dimostrativi passano trovaParoleVietate', async () => {
    const CatalogoPage = (await import('../../../../src/app/ds-v3-catalogo/page')).default
    render(<CatalogoPage />)
    const testo = document.body.textContent ?? ''
    expect(trovaParoleVietate(testo)).toEqual([])
  })

  it('il catalogo mostra la sezione «Sheet · DialogConferma» con due bottoni demo', async () => {
    const CatalogoPage = (await import('../../../../src/app/ds-v3-catalogo/page')).default
    render(<CatalogoPage />)
    expect(screen.getByRole('heading', { name: /Sheet · DialogConferma/i })).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Collaudo R3 (P9, 22/07 notte) — ghost click di Chrome Android sullo scrim.
// Root cause PROVATA con touch CDP reali (scripts/tmp/repro-ghost-click.mjs):
// quando lo sheet viene aperto da un handler `pointerup` (tap della Cassetta),
// il click sintetico post-touchend viene RI-HIT-TESTATO sul DOM aggiornato e
// atterra sullo scrim appena montato → chiusura immediata. Il contratto nuovo:
// lo scrim chiude SOLO se il gesto è NATO sullo scrim (pointerdown sullo scrim
// stesso). Un click orfano — senza pointerdown corrispondente — è per
// definizione il ghost click e va ignorato. iOS non re-hit-testa: lì il tap
// scrim reale resta down+click sullo stesso nodo, invariato.
describe('Ghost click Android (Collaudo R3, P9) — lo scrim chiude solo se il gesto è nato lì', () => {
  it('Sheet: click sullo scrim SENZA pointerdown (ghost click) → onChiudi NON chiamato', () => {
    const onChiudi = vi.fn()
    render(
      <Sheet aperto onChiudi={onChiudi} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    const scrim = document.querySelector('.ds-sheet-scrim') as HTMLElement
    expect(scrim).not.toBeNull()
    fireEvent.click(scrim)
    expect(onChiudi).not.toHaveBeenCalled()
  })

  it('Sheet: pointerdown + click sullo scrim (tap reale) → onChiudi', () => {
    const onChiudi = vi.fn()
    render(
      <Sheet aperto onChiudi={onChiudi} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    const scrim = document.querySelector('.ds-sheet-scrim') as HTMLElement
    fireEvent.pointerDown(scrim)
    fireEvent.click(scrim)
    expect(onChiudi).toHaveBeenCalledTimes(1)
  })

  it('Sheet: pointerdown sul pannello, click che atterra sullo scrim → NON chiude', () => {
    const onChiudi = vi.fn()
    render(
      <Sheet aperto onChiudi={onChiudi} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    fireEvent.pointerDown(screen.getByRole('dialog'))
    const scrim = document.querySelector('.ds-sheet-scrim') as HTMLElement
    fireEvent.click(scrim)
    expect(onChiudi).not.toHaveBeenCalled()
  })

  it('Sheet: il consumo disarma — dopo un tap-scrim servito, un secondo click orfano NON richiude', () => {
    const onChiudi = vi.fn()
    render(
      <Sheet aperto onChiudi={onChiudi} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    const scrim = document.querySelector('.ds-sheet-scrim') as HTMLElement
    fireEvent.pointerDown(scrim)
    fireEvent.click(scrim)
    expect(onChiudi).toHaveBeenCalledTimes(1)
    fireEvent.click(scrim) // orfano: nessun pointerdown nuovo
    expect(onChiudi).toHaveBeenCalledTimes(1)
  })

  it('Sheet: alla riapertura lo scrim riparte disarmato (reset su aperto=false)', async () => {
    const onChiudi = vi.fn()
    const { rerender } = render(
      <Sheet aperto onChiudi={onChiudi} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    // Arma senza consumare (pointerdown sullo scrim, nessun click), poi chiudi e riapri.
    fireEvent.pointerDown(document.querySelector('.ds-sheet-scrim') as HTMLElement)
    rerender(
      <Sheet aperto={false} onChiudi={onChiudi} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    rerender(
      <Sheet aperto onChiudi={onChiudi} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    const scrimNuovo = document.querySelector('.ds-sheet-scrim') as HTMLElement
    expect(scrimNuovo).not.toBeNull()
    fireEvent.click(scrimNuovo) // ghost: senza pointerdown in QUESTA apertura
    expect(onChiudi).not.toHaveBeenCalled()
  })

  it('SheetRidotto (reduced motion): ghost click NON chiude, tap reale sì', async () => {
    const ripristina = attivaReducedMotion()
    try {
      const onChiudi = vi.fn()
      render(
        <Sheet aperto onChiudi={onChiudi} titolo="Dettagli">
          <p>Contenuto</p>
        </Sheet>
      )
      await flushFrame()
      const scrim = document.querySelector('.ds-sheet-scrim') as HTMLElement
      expect(scrim).not.toBeNull()
      fireEvent.click(scrim)
      expect(onChiudi).not.toHaveBeenCalled()
      fireEvent.pointerDown(scrim)
      fireEvent.click(scrim)
      expect(onChiudi).toHaveBeenCalledTimes(1)
    } finally {
      ripristina()
    }
  })

  it('DialogConferma: ghost click NON annulla, tap reale sì (mai la distruttiva)', () => {
    const onConferma = vi.fn()
    const onAnnulla = vi.fn()
    render(
      <DialogConferma
        aperto
        titolo="Sei sicuro?"
        testo="Butto via il lavoro n.148 di Studio Bianchi?"
        etichettaDistruttiva="Sì, buttalo via"
        etichettaSicura="No, tienilo"
        onConferma={onConferma}
        onAnnulla={onAnnulla}
      />
    )
    const scrim = document.querySelector('.ds-dialog-scrim') as HTMLElement
    expect(scrim).not.toBeNull()
    fireEvent.click(scrim)
    expect(onAnnulla).not.toHaveBeenCalled()
    fireEvent.pointerDown(scrim)
    fireEvent.click(scrim)
    expect(onAnnulla).toHaveBeenCalledTimes(1)
    expect(onConferma).not.toHaveBeenCalled()
  })

  it('review I-1: pointerdown sullo scrim A SHEET CHIUSO (uscita animata) non arma la riapertura', () => {
    // Harness diretto del hook: durante l'exit di AnimatePresence lo scrim resta montato con
    // aperto=false — un pointerdown lì NON deve armare; alla riapertura un click orfano (il
    // ghost della riapertura via pointerup) NON deve chiudere.
    const onChiudi = vi.fn()
    function Harness({ aperto }: { aperto: boolean }) {
      const tap = useTapScrim(aperto, onChiudi)
      return <div data-testid="scrim-harness" onPointerDown={tap.onPointerDown} onClick={tap.onClick} />
    }
    const { rerender } = render(<Harness aperto={false} />)
    const scrim = screen.getByTestId('scrim-harness')
    fireEvent.pointerDown(scrim) // gesto anomalo durante l'uscita
    rerender(<Harness aperto />) // riapertura
    fireEvent.click(scrim) // ghost click della riapertura
    expect(onChiudi).not.toHaveBeenCalled()
    // e il tap reale a sheet aperto continua a chiudere
    fireEvent.pointerDown(scrim)
    fireEvent.click(scrim)
    expect(onChiudi).toHaveBeenCalledTimes(1)
  })

  it('DialogConferma ridotto: ghost click NON annulla, tap reale sì', () => {
    const ripristina = attivaReducedMotion()
    try {
      const onConferma = vi.fn()
      const onAnnulla = vi.fn()
      render(
        <DialogConferma
          aperto
          titolo="Sei sicuro?"
          testo="Butto via il lavoro n.148 di Studio Bianchi?"
          etichettaDistruttiva="Sì, buttalo via"
          etichettaSicura="No, tienilo"
          onConferma={onConferma}
          onAnnulla={onAnnulla}
        />
      )
      const scrim = document.querySelector('.ds-dialog-scrim') as HTMLElement
      expect(scrim).not.toBeNull()
      fireEvent.click(scrim)
      expect(onAnnulla).not.toHaveBeenCalled()
      fireEvent.pointerDown(scrim)
      fireEvent.click(scrim)
      expect(onAnnulla).toHaveBeenCalledTimes(1)
      expect(onConferma).not.toHaveBeenCalled()
    } finally {
      ripristina()
    }
  })
})
