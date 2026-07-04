import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AccettaInvitoReteForm } from '../../src/components/features/rete/AccettaInvitoReteForm'

describe('AccettaInvitoReteForm', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function fetchMock() {
    return fetch as unknown as ReturnType<typeof vi.fn>
  }

  it('mostra il nome della rete nel messaggio di invito', () => {
    render(<AccettaInvitoReteForm token="tok-123" reteNome="Rete Toscana" />)

    expect(screen.getByText(/Rete Toscana/)).toBeInTheDocument()
  })

  it('accettazione riuscita chiama POST e naviga a /rete/[id]', async () => {
    fetchMock().mockResolvedValueOnce({ ok: true, json: async () => ({ rete_id: 'rete-9' }) })
    const hrefSetter = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: vi.fn(), set href(value: string) { hrefSetter(value) } },
    })

    render(<AccettaInvitoReteForm token="tok-123" reteNome="Rete Toscana" />)
    fireEvent.click(screen.getByRole('button', { name: 'Accetta' }))

    await waitFor(() => expect(hrefSetter).toHaveBeenCalledWith('/rete/rete-9'))

    const [url, options] = fetchMock().mock.calls[0]
    expect(url).toBe('/api/rete/inviti/tok-123/accept')
    expect(options.method).toBe('POST')
  })

  it('errore server mostra messaggio', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Il laboratorio è già in un'altra rete" }),
    })

    render(<AccettaInvitoReteForm token="tok-123" reteNome="Rete Toscana" />)
    fireEvent.click(screen.getByRole('button', { name: 'Accetta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('già in un')
  })
})
