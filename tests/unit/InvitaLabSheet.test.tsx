import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { InvitaLabSheet } from '../../src/components/features/rete/InvitaLabSheet'

describe('InvitaLabSheet', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function fetchMock() {
    return fetch as unknown as ReturnType<typeof vi.fn>
  }

  it('submit con email vuota mostra errore e non chiama POST', async () => {
    render(<InvitaLabSheet reteId="rete-1" />)

    fireEvent.click(screen.getByRole('button', { name: '+ Invita laboratorio' }))
    fireEvent.click(screen.getByRole('button', { name: 'Invia invito' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('obbligatorio')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('submit valido chiama POST /api/rete/[id]/inviti e ricarica', async () => {
    fetchMock().mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    })

    render(<InvitaLabSheet reteId="rete-1" />)
    fireEvent.click(screen.getByRole('button', { name: '+ Invita laboratorio' }))
    fireEvent.change(screen.getByLabelText('Email del titolare *'), { target: { value: 'mario@lab.it' } })
    fireEvent.click(screen.getByRole('button', { name: 'Invia invito' }))

    await waitFor(() => expect(reloadMock).toHaveBeenCalledTimes(1))

    const [url, options] = fetchMock().mock.calls[0]
    expect(url).toBe('/api/rete/rete-1/inviti')
    expect(JSON.parse(options.body as string)).toEqual({ email: 'mario@lab.it' })
  })

  it('422 dal server (email senza account) mostra messaggio specifico', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Nessun account trovato con questa email' }),
    })

    render(<InvitaLabSheet reteId="rete-1" />)
    fireEvent.click(screen.getByRole('button', { name: '+ Invita laboratorio' }))
    fireEvent.change(screen.getByLabelText('Email del titolare *'), { target: { value: 'sconosciuto@lab.it' } })
    fireEvent.click(screen.getByRole('button', { name: 'Invia invito' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Nessun account')
  })
})
