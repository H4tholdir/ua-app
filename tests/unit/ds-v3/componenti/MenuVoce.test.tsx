import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'
import { MenuVoce } from '@/components/ds/MenuVoce'

const ICONA = <path d="M12 2v20" />

describe('MenuVoce — voce del menu ⋯ (§5.34)', () => {
  it('voce standard: testo 17-ish bold ink, icona tonda neutra, chevron', () => {
    render(<MenuVoce icona={ICONA} testo="Prove" onTap={() => {}} />)
    const btn = screen.getByRole('button', { name: /prove/i })
    expect(btn.style.minHeight).toBe('56px')
    expect(btn.style.color).toBe('var(--ink)')
    expect(btn).toHaveTextContent('›')
  })

  it('variante butta: testo e icona rossi', () => {
    render(<MenuVoce icona={ICONA} testo="Annulla lavoro" butta disabled nota="Prossimamente" />)
    const btn = screen.getByRole('button', { name: /annulla lavoro/i })
    expect(btn.style.color).toBe('var(--red)')
    expect(btn).toBeDisabled()
    expect(btn).not.toHaveTextContent('›')
    expect(screen.getByText('Prossimamente')).toBeInTheDocument()
  })

  it('tap → onTap; NESSUN bordo proprio (separatori sul contenitore)', () => {
    const onTap = vi.fn()
    render(<MenuVoce icona={ICONA} testo="Foto" onTap={onTap} />)
    const btn = screen.getByRole('button', { name: /foto/i })
    fireEvent.click(btn)
    expect(onTap).toHaveBeenCalledTimes(1)
    expect(btn.style.borderTop).toBe('')
    expect(btn.style.borderBottom).toBe('')
  })

  it('testi passano il dizionario', () => {
    const { container } = render(<MenuVoce icona={ICONA} testo="Dati clinici" onTap={() => {}} />)
    expect(trovaParoleVietate(container.textContent ?? '')).toEqual([])
  })
})
