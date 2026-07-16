import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { FotoStrip } from '@/components/ds/FotoStrip'

const FOTO = [
  { id: 'a', url: 'https://x.supabase.co/sign/1.jpg?token=t', alt: 'Impronta' },
  { id: 'b', url: 'https://x.supabase.co/sign/2.jpg?token=t' },
]

describe('FotoStrip — strip read-only (§5.33)', () => {
  it('renderizza una img per foto, alt esplicito o fallback', () => {
    render(<FotoStrip foto={FOTO} />)
    expect(screen.getByAltText('Impronta')).toBeInTheDocument()
    expect(screen.getByAltText('Foto del lavoro')).toBeInTheDocument()
  })

  it('misure di legge: 72×72, radius 12, objectFit cover, scroll orizzontale', () => {
    const { container } = render(<FotoStrip foto={FOTO} />)
    const strip = container.firstElementChild as HTMLElement
    expect(strip.style.overflowX).toBe('auto')
    const img = screen.getByAltText('Impronta')
    expect(img.style.width).toBe('72px')
    expect(img.style.height).toBe('72px')
    expect(img.style.borderRadius).toBe('12px')
    expect(img.style.objectFit).toBe('cover')
  })

  it('lista vuota: non renderizza nulla', () => {
    const { container } = render(<FotoStrip foto={[]} />)
    expect(container.firstElementChild).toBeNull()
  })
})
