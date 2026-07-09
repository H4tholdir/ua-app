import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'

const suonaMock = vi.fn()
const vibraMock = vi.fn()
vi.mock('@/design-system/v3/sound', () => ({
  suona: (nome: string) => suonaMock(nome),
}))
vi.mock('@/design-system/v3/haptic', () => ({
  vibra: (tipo: string) => vibraMock(tipo),
}))

import { TastoPrimario } from '@/components/ds/TastoPrimario'

describe('TastoPrimario — il tasto fisico (§5.1)', () => {
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    suonaMock.mockClear()
    vibraMock.mockClear()
  })
  afterEach(() => {
    vi.stubEnv('NODE_ENV', originalEnv ?? 'test')
    vi.restoreAllMocks()
  })

  it('renderizza il testo passato come children', () => {
    render(<TastoPrimario onClick={() => {}}>Consegna</TastoPrimario>)
    expect(screen.getByText('Consegna')).toBeInTheDocument()
  })

  it('ha ruolo button', () => {
    render(<TastoPrimario onClick={() => {}}>Consegna</TastoPrimario>)
    expect(screen.getByRole('button', { name: 'Consegna' })).toBeInTheDocument()
  })

  it('click chiama onClick + suona("tap") + vibra("medium")', () => {
    const onClick = vi.fn()
    render(<TastoPrimario onClick={onClick}>Consegna</TastoPrimario>)
    fireEvent.click(screen.getByRole('button', { name: 'Consegna' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(suonaMock).toHaveBeenCalledWith('tap')
    expect(vibraMock).toHaveBeenCalledWith('medium')
  })

  it('anche il click da tastiera (evento click sintetico) attiva suono+vibrazione — feedback coerente', () => {
    const onClick = vi.fn()
    render(<TastoPrimario onClick={onClick}>Consegna</TastoPrimario>)
    const bottone = screen.getByRole('button', { name: 'Consegna' })
    bottone.focus()
    fireEvent.click(bottone)
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(suonaMock).toHaveBeenCalledWith('tap')
    expect(vibraMock).toHaveBeenCalledWith('medium')
  })

  it('disabled: non chiama onClick né suona/vibra, resta visibile', () => {
    const onClick = vi.fn()
    render(
      <TastoPrimario disabled motivoDisabilitato="Completa il controllo finale per consegnare" onClick={onClick}>
        Consegna
      </TastoPrimario>
    )
    const bottone = screen.getByRole('button', { name: 'Consegna' })
    expect(bottone).toBeVisible()
    fireEvent.click(bottone)
    expect(onClick).not.toHaveBeenCalled()
    expect(suonaMock).not.toHaveBeenCalled()
    expect(vibraMock).not.toHaveBeenCalled()
  })

  it('disabled: mostra la riga con motivoDisabilitato', () => {
    render(
      <TastoPrimario disabled motivoDisabilitato="Completa il controllo finale per consegnare">
        Consegna
      </TastoPrimario>
    )
    expect(screen.getByText('Completa il controllo finale per consegnare')).toBeInTheDocument()
  })

  it('disabled senza motivoDisabilitato: console.warn in dev, ma il bottone renderizza comunque', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<TastoPrimario disabled>Consegna</TastoPrimario>)
    expect(warnSpy).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Consegna' })).toBeInTheDocument()
  })

  it('disabled con motivoDisabilitato: nessun console.warn', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <TastoPrimario disabled motivoDisabilitato="Completa il controllo finale per consegnare">
        Consegna
      </TastoPrimario>
    )
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('anello focus-visible di legge (2px --blue, offset 2) è di proprietà del componente stesso', () => {
    const { container } = render(<TastoPrimario onClick={() => {}}>Consegna</TastoPrimario>)
    const regola = container.querySelector('style')?.textContent ?? ''
    expect(regola).toContain('outline: 2px solid var(--blue)')
    expect(regola).toContain('outline-offset: 2px')
  })

  it('type di default è "button"; supporta "submit"', () => {
    const { rerender } = render(<TastoPrimario onClick={() => {}}>Consegna</TastoPrimario>)
    expect(screen.getByRole('button', { name: 'Consegna' })).toHaveAttribute('type', 'button')
    rerender(
      <TastoPrimario type="submit" onClick={() => {}}>
        Consegna
      </TastoPrimario>
    )
    expect(screen.getByRole('button', { name: 'Consegna' })).toHaveAttribute('type', 'submit')
  })

  it('tutti i testi statici (default + disabled + motivoDisabilitato) passano trovaParoleVietate', () => {
    const { container: c1 } = render(<TastoPrimario onClick={() => {}}>Consegna</TastoPrimario>)
    expect(trovaParoleVietate(c1.textContent ?? '')).toEqual([])

    const { container: c2 } = render(
      <TastoPrimario disabled motivoDisabilitato="Completa il controllo finale per consegnare">
        Fatto
      </TastoPrimario>
    )
    expect(trovaParoleVietate(c2.textContent ?? '')).toEqual([])
  })
})
