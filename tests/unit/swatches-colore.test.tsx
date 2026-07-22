import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SwatchesColore } from '@/components/features/cassette/SwatchesColore'

describe('SwatchesColore — P11a/P11b (collaudo device 22/07)', () => {
  it('l\'input color è CONTROLLATO sull\'hex della faccia corrente (mai il default #000000)', () => {
    render(<SwatchesColore valore="bianca" onScegli={vi.fn()} />)
    const input = screen.getByLabelText('Colore personalizzato') as HTMLInputElement
    expect(input.value).toBe('#fffefa') // il DOM normalizza lowercase
  })

  it('con un hex custom attivo l\'input riflette quell\'hex', () => {
    render(<SwatchesColore valore="#123456" onScegli={vi.fn()} />)
    const input = screen.getByLabelText('Colore personalizzato') as HTMLInputElement
    expect(input.value).toBe('#123456')
  })

  it('scegliere il nero al PRIMO giro emette onScegli (il bug era: value default = #000000 → nessun evento)', () => {
    const onScegli = vi.fn()
    render(<SwatchesColore valore="bianca" onScegli={onScegli} />)
    const input = screen.getByLabelText('Colore personalizzato') as HTMLInputElement
    fireEvent.change(input, { target: { value: '#000000' } })
    expect(onScegli).toHaveBeenCalledWith('#000000')
  })

  it('l\'input è il controllo REALE (niente click programmatico): è focusabile e non aria-hidden', () => {
    render(<SwatchesColore valore="bianca" onScegli={vi.fn()} />)
    const input = screen.getByLabelText('Colore personalizzato')
    expect(input).not.toHaveAttribute('aria-hidden')
    expect(input).not.toHaveAttribute('tabindex', '-1')
  })
})

describe('SwatchesColore — P11c rev: is-nera sullo swatch custom (ratifica 22/07 sera)', () => {
  it('con valore="#000000" lo swatch custom porta is-nera', () => {
    render(<SwatchesColore valore="#000000" onScegli={vi.fn()} />)
    const input = screen.getByLabelText('Colore personalizzato')
    const span = input.closest('.ds-swatch-custom') as HTMLElement
    expect(span.className).toContain('is-nera')
  })
  it('con valore="#88CCEE" (chiaro) lo swatch custom NON porta is-nera', () => {
    render(<SwatchesColore valore="#88CCEE" onScegli={vi.fn()} />)
    const input = screen.getByLabelText('Colore personalizzato')
    const span = input.closest('.ds-swatch-custom') as HTMLElement
    expect(span.className).not.toContain('is-nera')
  })
})
