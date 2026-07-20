import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { AnnullaConsegnaBanner } from '../../src/components/features/lavori/AnnullaConsegnaBanner'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

describe('AnnullaConsegnaBanner — countdown hydration-safe (A17-res)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-20T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('primo render sincrono (pre-effect, es. SSR) NON calcola il countdown da Date.now() — markup vuoto', () => {
    // dataConsegnaEffettiva 1 minuto fa: se il countdown fosse calcolato
    // nell'initializer di useState (bug A17), il markup SSR conterrebbe già "09:00".
    const dataConsegnaEffettiva = '2026-07-20T09:59:00.000Z'
    const html = renderToStaticMarkup(
      <AnnullaConsegnaBanner lavoroId="lav-1" dataConsegnaEffettiva={dataConsegnaEffettiva} />,
    )
    // renderToStaticMarkup non esegue gli effect: se il countdown viene
    // calcolato SOLO in useEffect, il primo render deve restituire null.
    expect(html).toBe('')
  })

  it('dopo il mount (effect eseguito) mostra il countdown mm:ss corretto', () => {
    const dataConsegnaEffettiva = '2026-07-20T09:59:00.000Z' // 1 min fa → 9:00 rimasti su 10:00
    render(<AnnullaConsegnaBanner lavoroId="lav-1" dataConsegnaEffettiva={dataConsegnaEffettiva} />)
    expect(screen.getByText(/09:00/)).toBeInTheDocument()
  })

  it('il countdown decrementa di un secondo ad ogni tick del timer', () => {
    const dataConsegnaEffettiva = '2026-07-20T09:59:00.000Z'
    render(<AnnullaConsegnaBanner lavoroId="lav-1" dataConsegnaEffettiva={dataConsegnaEffettiva} />)
    expect(screen.getByText(/09:00/)).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText(/08:59/)).toBeInTheDocument()
  })
})
