import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'

// Il catalogo (page.tsx) monta ora anche NavDesk (§5.37), che chiama
// useRouter() per «+ Nuovo lavoro»: senza mock, il render fuori da un vero
// App Router lancia "invariant expected app router to be mounted" e fa
// cadere l'intero albero. Stesso pattern di NavDesk.test.tsx.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const suonaMock = vi.fn()
const vibraMock = vi.fn()
vi.mock('@/design-system/v3/sound', () => ({
  suona: (nome: string) => suonaMock(nome),
  initSuoni: () => {},
}))
vi.mock('@/design-system/v3/haptic', () => ({
  vibra: (tipo: string) => vibraMock(tipo),
}))

import { TastoSecondario } from '@/components/ds/TastoSecondario'
import { TastoTondo } from '@/components/ds/TastoTondo'
import { LinkQuieto } from '@/components/ds/LinkQuieto'

describe('TastoSecondario — azioni non primarie (§5.3)', () => {
  beforeEach(() => {
    suonaMock.mockClear()
    vibraMock.mockClear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renderizza il testo passato come children', () => {
    render(<TastoSecondario onClick={() => {}}>Apri il lavoro</TastoSecondario>)
    expect(screen.getByText('Apri il lavoro')).toBeInTheDocument()
  })

  it('ha ruolo button', () => {
    render(<TastoSecondario onClick={() => {}}>Apri il lavoro</TastoSecondario>)
    expect(screen.getByRole('button', { name: 'Apri il lavoro' })).toBeInTheDocument()
  })

  it('click chiama onClick + suona("tap") + vibra("light")', () => {
    const onClick = vi.fn()
    render(<TastoSecondario onClick={onClick}>Apri il lavoro</TastoSecondario>)
    fireEvent.click(screen.getByRole('button', { name: 'Apri il lavoro' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(suonaMock).toHaveBeenCalledWith('tap')
    expect(vibraMock).toHaveBeenCalledWith('light')
  })

  it('type di default è "button"; supporta "submit"', () => {
    const { rerender } = render(<TastoSecondario onClick={() => {}}>Apri</TastoSecondario>)
    expect(screen.getByRole('button', { name: 'Apri' })).toHaveAttribute('type', 'button')
    rerender(
      <TastoSecondario type="submit" onClick={() => {}}>
        Apri
      </TastoSecondario>
    )
    expect(screen.getByRole('button', { name: 'Apri' })).toHaveAttribute('type', 'submit')
  })

  it('disabled: visibile ma inerte — non chiama onClick né suona/vibra', () => {
    const onClick = vi.fn()
    render(
      <TastoSecondario disabled onClick={onClick}>
        Apri il lavoro
      </TastoSecondario>
    )
    const bottone = screen.getByRole('button', { name: 'Apri il lavoro' })
    expect(bottone).toBeVisible()
    fireEvent.click(bottone)
    expect(onClick).not.toHaveBeenCalled()
    expect(suonaMock).not.toHaveBeenCalled()
    expect(vibraMock).not.toHaveBeenCalled()
  })

  it('anello focus-visible di legge (2px --blue, offset 2) è di proprietà del componente stesso', () => {
    const { container } = render(<TastoSecondario onClick={() => {}}>Apri</TastoSecondario>)
    const regola = container.querySelector('style')?.textContent ?? ''
    expect(regola).toContain('outline: 2px solid var(--blue)')
    expect(regola).toContain('outline-offset: 2px')
  })

  it('il testo passa trovaParoleVietate', () => {
    const { container } = render(<TastoSecondario onClick={() => {}}>Apri il lavoro</TastoSecondario>)
    expect(trovaParoleVietate(container.textContent ?? '')).toEqual([])
  })

  // Emendamento §5.3 (20/07/2026, fix QA ondata A — light variante C, dark
  // variante A): faccia --elv + bordo --line in light; in dark il bordo pieno
  // sparisce e resta la hairline superiore. Il bordo DEVE vivere nel CSS di
  // componente (non inline), altrimenti l'override dark non può vincere.
  it('faccia --elv + bordo --line di componente; override dark a hairline in ds-v3.css (emendamento §5.3)', () => {
    const { container } = render(<TastoSecondario onClick={() => {}}>Apri</TastoSecondario>)
    const bottone = screen.getByRole('button', { name: 'Apri' })
    expect(bottone.style.background).toBe('var(--elv)')
    expect(bottone.style.border).toBe('') // mai inline sull'abilitato
    const regole = Array.from(container.querySelectorAll('style'))
      .map((s) => s.textContent ?? '')
      .join('')
    expect(regole).toContain('.ds-tasto-secondario:not(:disabled)')
    expect(regole).toContain('border: 1.5px solid var(--line)')
    // L'override dark (hairline) è LEGGE di ds-v3.css, non del componente:
    // il valore raw della hairline è ammesso solo lì (guard check-ds).
    const cssLegge = readFileSync(resolve(__dirname, '../../../../src/app/ds-v3.css'), 'utf8')
    expect(cssLegge).toContain('[data-theme="dark"] [data-ds="v3"] .ds-tasto-secondario:not(:disabled)')
    expect(cssLegge).toContain('border-top: 1px solid rgba(255,255,255,.06)')
  })

  it('disabled: faccia --bg-deep e nessun bordo (invariato)', () => {
    render(
      <TastoSecondario disabled onClick={() => {}}>
        Apri
      </TastoSecondario>
    )
    const bottone = screen.getByRole('button', { name: 'Apri' })
    expect(bottone.style.background).toBe('var(--bg-deep)')
    // jsdom serializza `border: 'none'` in modo non ovvio (width `medium`):
    // si asserisce lo style di bordo, che è ciò che conta.
    expect(bottone.style.borderStyle).toBe('none')
  })
})

describe('TastoTondo — back/menu (§5.6)', () => {
  beforeEach(() => {
    suonaMock.mockClear()
    vibraMock.mockClear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('ha aria-label obbligatoria tramite etichettaAria', () => {
    render(<TastoTondo glifo="‹" etichettaAria="Indietro" onClick={() => {}} />)
    expect(screen.getByRole('button', { name: 'Indietro' })).toBeInTheDocument()
  })

  it('renderizza il glifo passato', () => {
    render(<TastoTondo glifo="⋯" etichettaAria="Menu" onClick={() => {}} />)
    expect(screen.getByText('⋯')).toBeInTheDocument()
  })

  it('click chiama onClick + suona("tap") + vibra("light")', () => {
    const onClick = vi.fn()
    render(<TastoTondo glifo="‹" etichettaAria="Indietro" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Indietro' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(suonaMock).toHaveBeenCalledWith('tap')
    expect(vibraMock).toHaveBeenCalledWith('light')
  })

  it('anello focus-visible di legge (2px --blue, offset 2) è di proprietà del componente stesso', () => {
    const { container } = render(<TastoTondo glifo="‹" etichettaAria="Indietro" onClick={() => {}} />)
    const regola = container.querySelector('style')?.textContent ?? ''
    expect(regola).toContain('outline: 2px solid var(--blue)')
    expect(regola).toContain('outline-offset: 2px')
  })

  it("l'etichettaAria passa trovaParoleVietate", () => {
    expect(trovaParoleVietate('Indietro')).toEqual([])
    expect(trovaParoleVietate('Menu')).toEqual([])
  })
})

describe('LinkQuieto — via di fuga, L6 (§5.5)', () => {
  beforeEach(() => {
    suonaMock.mockClear()
    vibraMock.mockClear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('senza href renderizza un <button>', () => {
    render(<LinkQuieto onClick={() => {}}>Annulla</LinkQuieto>)
    const el = screen.getByText('Annulla')
    expect(el.tagName).toBe('BUTTON')
  })

  it('con href renderizza un <a>', () => {
    render(<LinkQuieto href="/impostazioni">Vai alle impostazioni</LinkQuieto>)
    const el = screen.getByText('Vai alle impostazioni')
    expect(el.tagName).toBe('A')
    expect(el).toHaveAttribute('href', '/impostazioni')
  })

  it('click chiama onClick ma NON suona MAI, né vibra', () => {
    const onClick = vi.fn()
    render(<LinkQuieto onClick={onClick}>Aspetta, annulla la consegna</LinkQuieto>)
    fireEvent.click(screen.getByText('Aspetta, annulla la consegna'))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(suonaMock).not.toHaveBeenCalled()
    expect(vibraMock).not.toHaveBeenCalled()
  })

  it('click su variante <a> chiama onClick ma NON suona MAI, né vibra', () => {
    const onClick = vi.fn()
    render(
      <LinkQuieto href="/impostazioni" onClick={onClick}>
        Vai alle impostazioni
      </LinkQuieto>
    )
    fireEvent.click(screen.getByText('Vai alle impostazioni'))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(suonaMock).not.toHaveBeenCalled()
    expect(vibraMock).not.toHaveBeenCalled()
  })

  it('il testo passa trovaParoleVietate', () => {
    const { container } = render(<LinkQuieto onClick={() => {}}>Aspetta, annulla la consegna</LinkQuieto>)
    expect(trovaParoleVietate(container.textContent ?? '')).toEqual([])
  })

  it('hit area ≥ 44px (constraint 10) su <button>: min-height 44 + padding verticale compensato da margin negativo', () => {
    render(<LinkQuieto onClick={() => {}}>Annulla</LinkQuieto>)
    const el = screen.getByText('Annulla')
    expect(el.style.minHeight).toBe('44px')
    expect(el.style.padding).toBe('13px 0px')
    expect(el.style.margin).toBe('-13px 0px')
    expect(el.style.display).toBe('inline-flex')
    expect(el.style.alignItems).toBe('center')
  })

  it('hit area ≥ 44px (constraint 10) anche sulla variante <a>', () => {
    render(<LinkQuieto href="/impostazioni">Vai alle impostazioni</LinkQuieto>)
    const el = screen.getByText('Vai alle impostazioni')
    expect(el.tagName).toBe('A')
    expect(el.style.minHeight).toBe('44px')
    expect(el.style.padding).toBe('13px 0px')
    expect(el.style.margin).toBe('-13px 0px')
    expect(el.style.display).toBe('inline-flex')
    expect(el.style.alignItems).toBe('center')
  })

  it('anello focus-visible di legge (2px --blue, offset 2) su entrambe le varianti <button> e <a>', () => {
    const { container: cButton } = render(<LinkQuieto onClick={() => {}}>Annulla</LinkQuieto>)
    const regolaButton = cButton.querySelector('style')?.textContent ?? ''
    expect(regolaButton).toContain('.ds-link-quieto:focus-visible')
    expect(regolaButton).toContain('outline: 2px solid var(--blue)')
    expect(regolaButton).toContain('outline-offset: 2px')
    expect(cButton.querySelector('button.ds-link-quieto')).not.toBeNull()

    const { container: cLink } = render(<LinkQuieto href="/impostazioni">Vai alle impostazioni</LinkQuieto>)
    const regolaLink = cLink.querySelector('style')?.textContent ?? ''
    expect(regolaLink).toContain('.ds-link-quieto:focus-visible')
    expect(regolaLink).toContain('outline: 2px solid var(--blue)')
    expect(regolaLink).toContain('outline-offset: 2px')
    expect(cLink.querySelector('a.ds-link-quieto')).not.toBeNull()
  })
})

describe('dizionario sui testi del catalogo — sezione «Tasti secondari e vie di fuga»', () => {
  it('i testi dimostrativi passano trovaParoleVietate', async () => {
    const CatalogoPage = (await import('../../../../src/app/ds-v3-catalogo/page')).default
    render(<CatalogoPage />)
    const testo = document.body.textContent ?? ''
    expect(trovaParoleVietate(testo)).toEqual([])
  })

  it('il catalogo mostra la sezione «Tasti secondari e vie di fuga» con TastoTondo back e menu', async () => {
    const CatalogoPage = (await import('../../../../src/app/ds-v3-catalogo/page')).default
    render(<CatalogoPage />)
    expect(screen.getByRole('heading', { name: /Tasti secondari e vie di fuga/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Indietro' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument()
  })
})
