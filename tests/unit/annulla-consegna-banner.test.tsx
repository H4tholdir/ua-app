import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
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

  describe('rami scadenza/annullato (Bundle T)', () => {
    it('finestra già scaduta al mount → il banner non compare', () => {
      const { container } = render(
        <AnnullaConsegnaBanner lavoroId="lav-1" dataConsegnaEffettiva="2026-07-20T09:45:00.000Z" />,
      )
      expect(container).toBeEmptyDOMElement()
    })

    it('countdown che arriva a 0 → il banner scompare', () => {
      render(<AnnullaConsegnaBanner lavoroId="lav-1" dataConsegnaEffettiva="2026-07-20T09:50:02.000Z" />)
      expect(screen.getByRole('alert')).toBeInTheDocument()
      act(() => { vi.advanceTimersByTime(3000) })
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('annullo riuscito → banner scomparso', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))
      render(<AnnullaConsegnaBanner lavoroId="lav-1" dataConsegnaEffettiva="2026-07-20T09:59:00.000Z" />)
      fireEvent.click(screen.getByRole('button'))
      await act(async () => { await vi.advanceTimersByTimeAsync(0) })
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      vi.unstubAllGlobals()
    })

    it('annullo rifiutato dalla API → il banner resta con il messaggio di errore', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Finestra scaduta' }) }))
      render(<AnnullaConsegnaBanner lavoroId="lav-1" dataConsegnaEffettiva="2026-07-20T09:59:00.000Z" />)
      fireEvent.click(screen.getByRole('button'))
      await act(async () => { await vi.advanceTimersByTimeAsync(0) })
      expect(screen.getByText('Finestra scaduta')).toBeInTheDocument()
      vi.unstubAllGlobals()
    })
  })

  describe('Task 8 — riga quieta sulla riassegnazione cassetta (response additiva della route)', () => {
    it('annullo riuscito con cassetta riassegnata (riassegnata:true) → banner scompare comunque, nessuna riga quieta', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, messaggio: 'x', cassetta: { riassegnata: true, nome: 'C12' } }),
      }))
      render(<AnnullaConsegnaBanner lavoroId="lav-1" dataConsegnaEffettiva="2026-07-20T09:59:00.000Z" />)
      fireEvent.click(screen.getByRole('button'))
      await act(async () => { await vi.advanceTimersByTimeAsync(0) })
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.queryByText(/nel frattempo è occupata/)).not.toBeInTheDocument()
      vi.unstubAllGlobals()
    })

    it('annullo riuscito con cassetta occupata nel frattempo (riassegnata:false, nome) → riga quieta col nome, niente più bottone/alert', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, messaggio: 'x', cassetta: { riassegnata: false, nome: 'C7' } }),
      }))
      render(<AnnullaConsegnaBanner lavoroId="lav-1" dataConsegnaEffettiva="2026-07-20T09:59:00.000Z" />)
      fireEvent.click(screen.getByRole('button'))
      await act(async () => { await vi.advanceTimersByTimeAsync(0) })
      expect(screen.getByText('La C7 nel frattempo è occupata')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
      vi.unstubAllGlobals()
    })

    it('annullo riuscito con cassetta.riassegnata:false ma SENZA nome → nessuna riga quieta (dato incompleto, mai un messaggio a metà)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, messaggio: 'x', cassetta: { riassegnata: false } }),
      }))
      const { container } = render(<AnnullaConsegnaBanner lavoroId="lav-1" dataConsegnaEffettiva="2026-07-20T09:59:00.000Z" />)
      fireEvent.click(screen.getByRole('button'))
      await act(async () => { await vi.advanceTimersByTimeAsync(0) })
      expect(container).toBeEmptyDOMElement()
      vi.unstubAllGlobals()
    })

    it('annullo riuscito senza campo cassetta (esito niente_da_riassegnare, fail-soft) → banner scompare come prima del Task 8', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, messaggio: 'x' }) }))
      const { container } = render(<AnnullaConsegnaBanner lavoroId="lav-1" dataConsegnaEffettiva="2026-07-20T09:59:00.000Z" />)
      fireEvent.click(screen.getByRole('button'))
      await act(async () => { await vi.advanceTimersByTimeAsync(0) })
      expect(container).toBeEmptyDOMElement()
      vi.unstubAllGlobals()
    })
  })
})
