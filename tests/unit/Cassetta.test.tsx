// Task 10 — DS v3 §5.35 (spec 2026-07-21-parete-cassette-design.md). Test in
// tests/unit/ (risoluzione orchestratore 1): vitest.config.ts scopre solo qui,
// src/components/ds/__tests__/ sarebbe un RED finto.
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Cassetta, targaScura } from '@/components/ds/Cassetta'

const lavoroOccupato = { numero: '144', dentista: 'Bianchi', descrizione: 'corona zirconia', tipoDispositivo: 'protesi_fissa' }

describe('targaScura — regola di luminanza (§5.35, brief Task 10)', () => {
  it("slug 'bianca' → sempre scura", () => {
    expect(targaScura('bianca')).toBe(true)
  })
  it("hex chiaro '#FFEE00' (luminanza relativa > 0.55) → scura", () => {
    expect(targaScura('#FFEE00')).toBe(true)
  })
  it("hex scuro '#173A9C' (luminanza relativa < 0.55) → NON scura", () => {
    expect(targaScura('#173A9C')).toBe(false)
  })
  it("slug 'azzurra' → sempre scura (l'altra faccia standard chiara)", () => {
    expect(targaScura('azzurra')).toBe(true)
  })
  it("un altro slug standard (es. 'rossa') → NON scura", () => {
    expect(targaScura('rossa')).toBe(false)
  })
  it("hex '#C0C0C0' (luminanza relativa ≈ 0.527 < 0.55) → NON scura — discrimina dalla luminanza percepita (review M3)", () => {
    // Una luminanza percepita non linearizzata (es. media pesata diretta sui canali sRGB, senza
    // gamma correction) darebbe ≈0.75 su questo grigio → true: il caso prova che la formula usa
    // davvero la linearizzazione WCAG, non un'approssimazione che qui darebbe l'esito opposto.
    expect(targaScura('#C0C0C0')).toBe(false)
  })
})

describe('Cassetta — occupata (§5.35)', () => {
  it('aria-label verbatim dal brief: numero, dentista e descrizione del lavoro', () => {
    render(
      <Cassetta id="c1" nome="C12" colore="rossa" lavoro={lavoroOccupato} stato="normale" onTap={() => {}} />
    )
    expect(
      screen.getByRole('button', { name: 'Cassetta C12, occupata: lavoro n.144, Bianchi, corona zirconia' })
    ).toBeInTheDocument()
  })

  it("senza descrizione, l'aria-label omette quella parte — MAI lo slug macchina di tipoDispositivo (review M5)", () => {
    const senzaDescrizione = { numero: '160', dentista: 'Neri', descrizione: null, tipoDispositivo: 'protesi_fissa' }
    render(<Cassetta id="c1" nome="C1" colore="rossa" lavoro={senzaDescrizione} stato="normale" onTap={() => {}} />)
    const bottone = screen.getByRole('button')
    expect(bottone).toHaveAttribute('aria-label', 'Cassetta C1, occupata: lavoro n.160, Neri')
    expect(bottone.getAttribute('aria-label')).not.toMatch(/protesi_fissa/)
  })

  it('mostra la targa col nome e la riga "n.144 · Bianchi"', () => {
    render(
      <Cassetta id="c1" nome="C12" colore="rossa" lavoro={lavoroOccupato} stato="normale" onTap={() => {}} />
    )
    expect(screen.getByText('C12')).toBeInTheDocument()
    expect(screen.getByText('n.144 · Bianchi')).toBeInTheDocument()
  })

  it('un tap secco (senza attesa) chiama onTap, non onLongPressSheet', () => {
    const onTap = vi.fn()
    const onLongPressSheet = vi.fn()
    render(
      <Cassetta id="c1" nome="C12" colore="rossa" lavoro={lavoroOccupato} stato="normale" onTap={onTap} onLongPressSheet={onLongPressSheet} />
    )
    const bottone = screen.getByRole('button')
    fireEvent.pointerDown(bottone, { clientX: 10, clientY: 10 })
    fireEvent.pointerUp(bottone, { clientX: 10, clientY: 10 })
    expect(onTap).toHaveBeenCalledTimes(1)
    expect(onLongPressSheet).not.toHaveBeenCalled()
  })
})

describe('Cassetta — libera', () => {
  it('aria-label «Cassetta C4, libera» — verbatim dal brief', () => {
    render(<Cassetta id="c4" nome="C4" colore="grigia" lavoro={null} stato="normale" onTap={() => {}} />)
    expect(screen.getByRole('button', { name: 'Cassetta C4, libera' })).toBeInTheDocument()
  })

  it('la riga "cont" mostra "libera", non un numero di lavoro', () => {
    render(<Cassetta id="c4" nome="C4" colore="grigia" lavoro={null} stato="normale" onTap={() => {}} />)
    expect(screen.getByText('libera')).toBeInTheDocument()
    expect(screen.queryByText(/^n\./)).not.toBeInTheDocument()
  })
})

describe('Cassetta — stato "spenta" resta tappabile (non è inattività, è opacità)', () => {
  it('è un <button> NON disabled anche da spenta, e il tap funziona ancora', () => {
    const onTap = vi.fn()
    render(
      <Cassetta id="c1" nome="C12" colore="rossa" lavoro={lavoroOccupato} stato="spenta" onTap={onTap} />
    )
    const bottone = screen.getByRole('button')
    expect(bottone).not.toBeDisabled()
    fireEvent.pointerDown(bottone, { clientX: 0, clientY: 0 })
    fireEvent.pointerUp(bottone, { clientX: 0, clientY: 0 })
    expect(onTap).toHaveBeenCalledTimes(1)
  })
})

describe('Cassetta — stato "accesa" porta aria-current (mai solo colore, §12 spec)', () => {
  it('aria-current="true" SOLO quando accesa', () => {
    const { rerender } = render(
      <Cassetta id="c1" nome="C12" colore="rossa" lavoro={lavoroOccupato} stato="accesa" onTap={() => {}} />
    )
    expect(screen.getByRole('button')).toHaveAttribute('aria-current', 'true')

    rerender(<Cassetta id="c1" nome="C12" colore="rossa" lavoro={lavoroOccupato} stato="normale" onTap={() => {}} />)
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-current')
  })
})

describe('Cassetta — gesto long-press (§5.4/§5.35): hold 300ms senza spostamento = sheet', () => {
  it('hold ≥300ms fermo apre lo sheet (onLongPressSheet), NON il tap', () => {
    vi.useFakeTimers()
    try {
      const onTap = vi.fn()
      const onLongPressSheet = vi.fn()
      render(
        <Cassetta
          id="c1" nome="C12" colore="rossa" lavoro={lavoroOccupato} stato="normale"
          onTap={onTap} onLongPressSheet={onLongPressSheet}
        />
      )
      const bottone = screen.getByRole('button')
      fireEvent.pointerDown(bottone, { clientX: 0, clientY: 0 })
      vi.advanceTimersByTime(300)
      fireEvent.pointerUp(bottone, { clientX: 0, clientY: 0 })
      expect(onLongPressSheet).toHaveBeenCalledTimes(1)
      expect(onTap).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('uno spostamento oltre 8px prima del rilascio non chiama né onTap né onLongPressSheet (è un drag)', () => {
    vi.useFakeTimers()
    try {
      const onTap = vi.fn()
      const onLongPressSheet = vi.fn()
      render(
        <Cassetta
          id="c1" nome="C12" colore="rossa" lavoro={lavoroOccupato} stato="normale"
          onTap={onTap} onLongPressSheet={onLongPressSheet}
        />
      )
      const bottone = screen.getByRole('button')
      fireEvent.pointerDown(bottone, { clientX: 0, clientY: 0 })
      fireEvent.pointerMove(bottone, { clientX: 30, clientY: 0 })
      fireEvent.pointerUp(bottone, { clientX: 30, clientY: 0 })
      expect(onTap).not.toHaveBeenCalled()
      expect(onLongPressSheet).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('senza onLongPressSheet, un hold lungo fermo ricade comunque sul tap (nessuna azione persa)', () => {
    vi.useFakeTimers()
    try {
      const onTap = vi.fn()
      render(
        <Cassetta id="c1" nome="C12" colore="rossa" lavoro={lavoroOccupato} stato="normale" onTap={onTap} />
      )
      const bottone = screen.getByRole('button')
      fireEvent.pointerDown(bottone, { clientX: 0, clientY: 0 })
      vi.advanceTimersByTime(300)
      fireEvent.pointerUp(bottone, { clientX: 0, clientY: 0 })
      expect(onTap).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('Cassetta — pointerup "orfano" non deve chiamare onTap (review Important)', () => {
  it('un pointerup senza pointerdown corrispondente su QUESTO bottone non chiama onTap', () => {
    const onTap = vi.fn()
    render(<Cassetta id="c1" nome="C12" colore="rossa" lavoro={lavoroOccupato} stato="normale" onTap={onTap} />)
    const bottone = screen.getByRole('button')
    // Nessun pointerdown precedente: su mouse/penna è il caso di chi preme altrove (un'altra
    // cassetta o lo sfondo) e rilascia sopra questo bottone — un <button> nativo non farebbe
    // nulla (il click nativo richiede down E up sullo stesso elemento), ma senza la guardia
    // `inizio.current` questo componente chiamava onTap comunque.
    fireEvent.pointerUp(bottone, { clientX: 5, clientY: 5 })
    expect(onTap).not.toHaveBeenCalled()
  })

  it('pointerdown sulla cassetta A e pointerup sulla cassetta B non trasferisce il tap alla B (scenario esatto della review)', () => {
    const onTapA = vi.fn()
    const onTapB = vi.fn()
    render(
      <>
        <Cassetta id="a" nome="C1" colore="rossa" lavoro={null} stato="normale" onTap={onTapA} />
        <Cassetta id="b" nome="C2" colore="blu" lavoro={null} stato="normale" onTap={onTapB} />
      </>
    )
    const [bottoneA, bottoneB] = screen.getAllByRole('button')
    fireEvent.pointerDown(bottoneA, { clientX: 0, clientY: 0 })
    fireEvent.pointerUp(bottoneB, { clientX: 200, clientY: 0 })
    expect(onTapA).not.toHaveBeenCalled() // A non ha mai ricevuto il suo pointerup
    expect(onTapB).not.toHaveBeenCalled() // B non ha mai ricevuto il suo pointerdown
  })
})

// ─── Task 13 — estensione ADDITIVA per il drag (`onSollevata`) + i due difetti a11y ────────────
describe('Cassetta — sollevamento (Task 13, §2.4/§2.6 ricerca): Cassetta RICONOSCE, l\'hook insegue', () => {
  it('touch: hold 300ms fermo → `onSollevata` (il sollevamento), NON `onLongPressSheet` (lo apre il chiamante)', () => {
    vi.useFakeTimers()
    try {
      const onTap = vi.fn()
      const onSollevata = vi.fn()
      const onLongPressSheet = vi.fn()
      render(
        <Cassetta id="c1" nome="C12" colore="rossa" lavoro={lavoroOccupato} stato="normale"
          onTap={onTap} onSollevata={onSollevata} onLongPressSheet={onLongPressSheet} />
      )
      const bottone = screen.getByRole('button')
      fireEvent.pointerDown(bottone, { clientX: 0, clientY: 0, pointerType: 'touch', pointerId: 1 })
      vi.advanceTimersByTime(300)
      expect(onSollevata).toHaveBeenCalledTimes(1)
      // Rilascio fermo dopo il sollevamento: Cassetta NON apre lo sheet da sé (lo decide l'hook,
      // che possiede il gesto dal sollevamento in poi) e soprattutto NON ricade sul tap.
      fireEvent.pointerUp(bottone, { clientX: 0, clientY: 0, pointerType: 'touch', pointerId: 1 })
      expect(onLongPressSheet).not.toHaveBeenCalled()
      expect(onTap).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('mouse/pen: il drag si arma al superamento degli 8px SENZA attendere il timer (§2.4.1)', () => {
    const onSollevata = vi.fn()
    render(
      <Cassetta id="c1" nome="C12" colore="rossa" lavoro={lavoroOccupato} stato="normale"
        onTap={() => {}} onSollevata={onSollevata} />
    )
    const bottone = screen.getByRole('button')
    fireEvent.pointerDown(bottone, { clientX: 0, clientY: 0, pointerType: 'mouse', pointerId: 1 })
    fireEvent.pointerMove(bottone, { clientX: 20, clientY: 0, pointerType: 'mouse', pointerId: 1 })
    expect(onSollevata).toHaveBeenCalledTimes(1)
  })

  it('VIETA il tracking post-sollevamento (invariante del panel §3): dopo il sollevamento un pointermove sul bottone NON produce altre chiamate verso il chiamante', () => {
    // Test che NEGA, non che permette. Senza il guardia `sollevata`, il ramo mouse rifarebbe
    // `onSollevata` a ogni pointermove oltre soglia (seconda, terza chiamata): la macchina di
    // Cassetta continuerebbe a inseguire un gesto che ha già ceduto all'hook.
    const onTap = vi.fn()
    const onSollevata = vi.fn()
    const onLongPressSheet = vi.fn()
    render(
      <Cassetta id="c1" nome="C12" colore="rossa" lavoro={lavoroOccupato} stato="normale"
        onTap={onTap} onSollevata={onSollevata} onLongPressSheet={onLongPressSheet} />
    )
    const bottone = screen.getByRole('button')
    fireEvent.pointerDown(bottone, { clientX: 0, clientY: 0, pointerType: 'mouse', pointerId: 1 })
    fireEvent.pointerMove(bottone, { clientX: 20, clientY: 0, pointerType: 'mouse', pointerId: 1 }) // sollevamento
    fireEvent.pointerMove(bottone, { clientX: 120, clientY: 40, pointerType: 'mouse', pointerId: 1 }) // l'hook insegue, non Cassetta
    fireEvent.pointerMove(bottone, { clientX: 240, clientY: 80, pointerType: 'mouse', pointerId: 1 })
    fireEvent.pointerUp(bottone, { clientX: 240, clientY: 80, pointerType: 'mouse', pointerId: 1 })
    expect(onSollevata).toHaveBeenCalledTimes(1) // MAI più di una: dopo il lift, Cassetta tace
    expect(onTap).not.toHaveBeenCalled()
    expect(onLongPressSheet).not.toHaveBeenCalled()
  })

  it('touch: un movimento >8px PRIMA dei 300ms annulla l\'hold (lo scroll vince), niente sollevamento', () => {
    vi.useFakeTimers()
    try {
      const onSollevata = vi.fn()
      const onTap = vi.fn()
      render(
        <Cassetta id="c1" nome="C12" colore="rossa" lavoro={lavoroOccupato} stato="normale"
          onTap={onTap} onSollevata={onSollevata} />
      )
      const bottone = screen.getByRole('button')
      fireEvent.pointerDown(bottone, { clientX: 0, clientY: 0, pointerType: 'touch', pointerId: 1 })
      fireEvent.pointerMove(bottone, { clientX: 30, clientY: 0, pointerType: 'touch', pointerId: 1 })
      vi.advanceTimersByTime(300)
      fireEvent.pointerUp(bottone, { clientX: 30, clientY: 0, pointerType: 'touch', pointerId: 1 })
      expect(onSollevata).not.toHaveBeenCalled() // lo scroll ha vinto: nessun sollevamento
      expect(onTap).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('Cassetta — onClick per le AT (Task 13, difetto a11y n.2): il doppio-tap screen-reader emette un click', () => {
  it('un click «puro» (senza sequenza pointer, come il doppio-tap VoiceOver/TalkBack) chiama onTap', () => {
    const onTap = vi.fn()
    render(<Cassetta id="c1" nome="C12" colore="rossa" lavoro={lavoroOccupato} stato="normale" onTap={onTap} />)
    // Nessun pointerdown/up: la sola attivazione AT. Prima del fix, Cassetta non aveva `onClick`
    // e chi usa uno screen reader su touch poteva non ottenere NIENTE.
    fireEvent.click(screen.getByRole('button'))
    expect(onTap).toHaveBeenCalledTimes(1)
  })

  it('il click sintetico che segue un tap pointer NON raddoppia onTap (una sola azione per gesto)', () => {
    const onTap = vi.fn()
    render(<Cassetta id="c1" nome="C12" colore="rossa" lavoro={lavoroOccupato} stato="normale" onTap={onTap} />)
    const bottone = screen.getByRole('button')
    fireEvent.pointerDown(bottone, { clientX: 0, clientY: 0 })
    fireEvent.pointerUp(bottone, { clientX: 0, clientY: 0 })
    fireEvent.click(bottone) // il browser lo emette dopo un tap pointer genuino
    expect(onTap).toHaveBeenCalledTimes(1)
  })

  it('il click che il browser emette DOPO un drag viene ingoiato (guardia `spostato`/`sollevata`)', () => {
    const onTap = vi.fn()
    const onSollevata = vi.fn()
    render(
      <Cassetta id="c1" nome="C12" colore="rossa" lavoro={lavoroOccupato} stato="normale"
        onTap={onTap} onSollevata={onSollevata} />
    )
    const bottone = screen.getByRole('button')
    fireEvent.pointerDown(bottone, { clientX: 0, clientY: 0, pointerType: 'mouse', pointerId: 1 })
    fireEvent.pointerMove(bottone, { clientX: 40, clientY: 0, pointerType: 'mouse', pointerId: 1 })
    fireEvent.pointerUp(bottone, { clientX: 40, clientY: 0, pointerType: 'mouse', pointerId: 1 })
    fireEvent.click(bottone)
    expect(onTap).not.toHaveBeenCalled()
  })
})

describe('Cassetta — colore custom (hex) e i 6 slug standard', () => {
  it('accetta uno slug standard senza produrre background inline', () => {
    render(<Cassetta id="c1" nome="C12" colore="verde" lavoro={lavoroOccupato} stato="normale" onTap={() => {}} />)
    const bottone = screen.getByRole('button')
    expect(bottone.className).toContain('verde')
  })

  it('un hex custom genera il gradiente via color-mix, verbatim dalla formula del brief', () => {
    render(<Cassetta id="c9" nome="C9" colore="#F2836B" lavoro={lavoroOccupato} stato="normale" onTap={() => {}} />)
    const bottone = screen.getByRole('button')
    // jsdom (come i browser reali) riserializza gli hex riconosciuti in rgb() dentro
    // `style.background` — anche dentro color-mix(). #F2836B = rgb(242, 131, 107): l'asserzione
    // verifica la struttura del gradiente E che il colore sopravviva alla trasformazione,
    // non la stringa hex letterale (che qui sarebbe un artefatto di serializzazione, non
    // un'invariante del componente).
    expect(bottone.style.background).toBe(
      'linear-gradient(180deg, rgb(242, 131, 107), color-mix(in srgb, rgb(242, 131, 107) 72%, black))'
    )
  })
})

describe('P9 — tap Android con jitter (collaudo device 22/07)', () => {
  it('touch: movimento oltre soglia interna MA click naturale emesso → onTap DEVE scattare', () => {
    const onTap = vi.fn()
    render(
      <Cassetta id="c1" nome="C1" colore="bianca" lavoro={null} stato="normale"
        onTap={onTap} onSollevata={vi.fn()} onLongPressSheet={vi.fn()} />
    )
    const btn = screen.getByRole('button')
    fireEvent.pointerDown(btn, { pointerType: 'touch', clientX: 100, clientY: 100 })
    fireEvent.pointerMove(btn, { pointerType: 'touch', clientX: 111, clientY: 100 }) // 11px: per noi «spostato», per Chrome ancora tap
    fireEvent.pointerUp(btn, { pointerType: 'touch' })
    fireEvent.click(btn) // Chrome lo emette: il gesto ERA un tap
    expect(onTap).toHaveBeenCalledTimes(1)
  })

  it('touch: vero scroll (movimento, NESSUN click dal browser) → onTap NON scatta', () => {
    const onTap = vi.fn()
    render(
      <Cassetta id="c1" nome="C1" colore="bianca" lavoro={null} stato="normale"
        onTap={onTap} onSollevata={vi.fn()} onLongPressSheet={vi.fn()} />
    )
    const btn = screen.getByRole('button')
    fireEvent.pointerDown(btn, { pointerType: 'touch', clientX: 100, clientY: 100 })
    fireEvent.pointerMove(btn, { pointerType: 'touch', clientX: 100, clientY: 160 })
    fireEvent.pointerCancel(btn)
    expect(onTap).not.toHaveBeenCalled()
  })

  it('mouse: trascinamento con drag DISABILITATO resta ingoiato (comportamento invariato)', () => {
    const onTap = vi.fn()
    render(
      <Cassetta id="c1" nome="C1" colore="bianca" lavoro={null} stato="normale"
        onTap={onTap} onLongPressSheet={vi.fn()} />
    )
    const btn = screen.getByRole('button')
    fireEvent.pointerDown(btn, { pointerType: 'mouse', clientX: 100, clientY: 100 })
    fireEvent.pointerMove(btn, { pointerType: 'mouse', clientX: 130, clientY: 100 })
    fireEvent.pointerUp(btn, { pointerType: 'mouse' })
    fireEvent.click(btn) // il mouse emette click anche dopo un trascinamento
    expect(onTap).not.toHaveBeenCalled()
  })
})
