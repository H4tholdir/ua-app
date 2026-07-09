import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'
import { tastoPiu } from '@/design-system/v3/tokens'

const suonaMock = vi.fn()
const vibraMock = vi.fn()
vi.mock('@/design-system/v3/sound', () => ({
  suona: (nome: string) => suonaMock(nome),
}))
vi.mock('@/design-system/v3/haptic', () => ({
  vibra: (tipo: string) => vibraMock(tipo),
}))

import { TastoPiu } from '@/components/ds/TastoPiu'

describe('TastoPiu — «il punto rosso» (§5.2 rev 2 — porting fedele del mockup .tpB)', () => {
  beforeEach(() => {
    suonaMock.mockClear()
    vibraMock.mockClear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('etichetta di default "Nuovo lavoro" quando la prop non è passata', () => {
    render(<TastoPiu onClick={() => {}} />)
    expect(screen.getByRole('button', { name: 'Nuovo lavoro' })).toBeInTheDocument()
  })

  it('aria-label = etichetta passata', () => {
    render(<TastoPiu onClick={() => {}} etichetta="Nuova scheda" />)
    expect(screen.getByRole('button', { name: 'Nuova scheda' })).toBeInTheDocument()
  })

  it('click chiama onClick + suona("tap") + vibra("medium")', () => {
    const onClick = vi.fn()
    render(<TastoPiu onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Nuovo lavoro' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(suonaMock).toHaveBeenCalledWith('tap')
    expect(vibraMock).toHaveBeenCalledWith('medium')
  })

  it('hit area del bottone è Ø 110 (style inline)', () => {
    render(<TastoPiu onClick={() => {}} />)
    const bottone = screen.getByRole('button', { name: 'Nuovo lavoro' })
    expect(bottone.style.width).toBe('110px')
    expect(bottone.style.height).toBe('110px')
  })

  it('la ghiera (base) è Ø 92, distinta dalla hit area di 110', () => {
    const { container } = render(<TastoPiu onClick={() => {}} />)
    const ghiera = container.querySelector('[data-parte="ghiera"]') as HTMLElement | null
    expect(ghiera).not.toBeNull()
    expect(ghiera!.style.width).toBe('92px')
    expect(ghiera!.style.height).toBe('92px')
  })

  it('il solco è l\'anello a inset 11 nella ghiera (Ø 70, come il mockup)', () => {
    const { container } = render(<TastoPiu onClick={() => {}} />)
    const solco = container.querySelector('[data-parte="solco"]') as HTMLElement | null
    expect(solco).not.toBeNull()
    expect(solco!.style.top).toBe('11px')
    expect(solco!.style.left).toBe('11px')
    expect(solco!.style.width).toBe('70px')
    expect(solco!.style.height).toBe('70px')
  })

  it('il cappello (parte che si preme) è a inset 14 (Ø 64, come il mockup)', () => {
    const { container } = render(<TastoPiu onClick={() => {}} />)
    const cappello = container.querySelector('[data-parte="cappello"]') as HTMLElement | null
    expect(cappello).not.toBeNull()
    expect(cappello!.style.top).toBe('14px')
    expect(cappello!.style.left).toBe('14px')
    expect(cappello!.style.width).toBe('64px')
    expect(cappello!.style.height).toBe('64px')
  })

  it('il glifo + è la firma: 42px, peso 350, correzione ottica PJS -8.5px', () => {
    const { container } = render(<TastoPiu onClick={() => {}} />)
    const piu = container.querySelector('[data-parte="piu"]') as HTMLElement | null
    expect(piu).not.toBeNull()
    expect(piu!.textContent).toBe('+')
    expect(piu!.style.fontSize).toBe('42px')
    expect(piu!.style.fontWeight).toBe('350')
    // -1px del mockup era la correzione per il SUO font di fallback; con Plus
    // Jakarta Sans la stessa posizione di inchiostro si ottiene a -8.5px
    // (verifica pixel Playwright nel report r4).
    expect(piu!.style.transform).toBe('translateY(-8.5px)')
  })

  it('materia dal mockup via classi scoped: ghiera/solco/cappello + glifo var(--red)', () => {
    const { container } = render(<TastoPiu onClick={() => {}} />)
    const regole = container.querySelector('style')?.textContent ?? ''
    // light
    expect(regole).toContain(`background: ${tastoPiu.ghiera}`)
    expect(regole).toContain(`box-shadow: ${tastoPiu.ghieraOmbra}`)
    expect(regole).toContain(`background: ${tastoPiu.solco}`)
    expect(regole).toContain(`background: ${tastoPiu.cappello}`)
    // il + rosso: var(--red) a riposo, var(--red-dark) al pressed (light)
    expect(regole).toContain('color: var(--red)')
    expect(regole).toContain('color: var(--red-dark)')
    expect(regole).toContain(`text-shadow: ${tastoPiu.piuOmbra}`)
    // pressed: gradiente e affondo del cappello, ghiera che si assesta
    expect(regole).toContain(`background: ${tastoPiu.cappelloPressed}`)
    expect(regole).toContain(`box-shadow: ${tastoPiu.cappelloOmbraPressed}`)
    expect(regole).toContain(`box-shadow: ${tastoPiu.ghieraOmbraPressed}`)
  })

  it('dark: regole scoped [data-theme="dark"] [data-ds="v3"] con i valori .notte .tpB', () => {
    const { container } = render(<TastoPiu onClick={() => {}} />)
    const regole = container.querySelector('style')?.textContent ?? ''
    expect(regole).toContain('[data-theme="dark"] [data-ds="v3"] .ds-tastopiu-ghiera')
    expect(regole).toContain(`background: ${tastoPiu.ghieraNotte}`)
    expect(regole).toContain(`background: ${tastoPiu.solcoNotte}`)
    expect(regole).toContain(`background: ${tastoPiu.cappelloNotte}`)
    expect(regole).toContain(`box-shadow: ${tastoPiu.cappelloOmbraPressedNotte}`)
    // pressed dark del glifo: #E8323B del mockup, non var(--red-dark)
    expect(regole).toContain(`color: ${tastoPiu.piuPressedNotte}`)
    // in dark il + non è inciso: text-shadow spento
    expect(regole).toContain('text-shadow: none')
  })

  it('pressed: pointerdown attiva la classe --premuto, pointerup la spegne', async () => {
    render(<TastoPiu onClick={() => {}} />)
    const bottone = screen.getByRole('button', { name: 'Nuovo lavoro' })
    // Il gesture press di Motion consegna onTapStart/onTap via frame.postRender:
    // le asserzioni aspettano il frame successivo (waitFor), mai sincrone.
    fireEvent.pointerDown(bottone, { pointerType: 'mouse', button: 0, isPrimary: true })
    await waitFor(() => expect(bottone.classList.contains('ds-tastopiu--premuto')).toBe(true))
    fireEvent.pointerUp(bottone, { pointerType: 'mouse', button: 0, isPrimary: true })
    await waitFor(() => expect(bottone.classList.contains('ds-tastopiu--premuto')).toBe(false))
  })

  it('etichetta visibile sotto al tasto (oltre all\'aria-label sul button)', () => {
    render(<TastoPiu onClick={() => {}} etichetta="Nuova scheda" />)
    // aria-label non è un nodo testo: getAllByText trova solo lo <span> visibile sotto.
    expect(screen.getAllByText('Nuova scheda').length).toBeGreaterThanOrEqual(1)
  })

  it('anello focus-visible di legge (2px --blue, offset 2) è di proprietà del componente stesso', () => {
    const { container } = render(<TastoPiu onClick={() => {}} />)
    const regola = container.querySelector('style')?.textContent ?? ''
    expect(regola).toContain('outline: 2px solid var(--blue)')
    expect(regola).toContain('outline-offset: 2px')
  })

  it('etichetta di default e personalizzata passano trovaParoleVietate', () => {
    const { container: c1 } = render(<TastoPiu onClick={() => {}} />)
    expect(trovaParoleVietate(c1.textContent ?? '')).toEqual([])

    const { container: c2 } = render(<TastoPiu onClick={() => {}} etichetta="Nuova scheda" />)
    expect(trovaParoleVietate(c2.textContent ?? '')).toEqual([])
  })
})
