import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { InvitaCollaboratoreSheet } from '../../src/components/features/tecnici/InvitaCollaboratoreSheet'

describe('InvitaCollaboratoreSheet', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function fetchMock() {
    return fetch as unknown as ReturnType<typeof vi.fn>
  }

  it('variant="header" mostra il pulsante "Invita collaboratore"', () => {
    render(<InvitaCollaboratoreSheet variant="header" />)
    expect(screen.getByRole('button', { name: 'Invita collaboratore' })).toBeTruthy()
  })

  it('variant="cta" mostra il pulsante "Invita collaboratori →"', () => {
    render(<InvitaCollaboratoreSheet variant="cta" />)
    expect(screen.getByRole('button', { name: /Invita collaboratori/ })).toBeTruthy()
  })

  it('click sul trigger apre il bottom sheet e carica gli inviti pendenti', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        inviti: [{ id: 'inv-1', email: 'mario@rossi.it', ruolo: 'tecnico', expires_at: new Date(Date.now() + 5 * 86400000).toISOString() }],
      }),
    })
    render(<InvitaCollaboratoreSheet variant="header" />)
    fireEvent.click(screen.getByRole('button', { name: 'Invita collaboratore' }))

    expect(screen.getByRole('dialog', { name: 'Invita collaboratore' })).toBeTruthy()
    await waitFor(() => expect(screen.getByText('mario@rossi.it')).toBeTruthy())
    expect(fetch).toHaveBeenCalledWith('/api/tecnici/invite')
  })

  it('submit valido chiama POST /api/tecnici/invite con email e ruolo', async () => {
    fetchMock()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ inviti: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, message: 'Invito creato per mario@rossi.it' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ inviti: [] }) })

    render(<InvitaCollaboratoreSheet variant="header" />)
    fireEvent.click(screen.getByRole('button', { name: 'Invita collaboratore' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))

    fireEvent.change(screen.getByPlaceholderText('nome@esempio.it'), { target: { value: 'mario@rossi.it' } })
    fireEvent.click(screen.getByRole('button', { name: 'Invia invito' }))

    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy())
    expect(fetch).toHaveBeenCalledWith('/api/tecnici/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'mario@rossi.it', ruolo: 'tecnico' }),
    })
  })

  it('submit con email vuota mostra errore senza chiamare la POST', async () => {
    fetchMock().mockResolvedValueOnce({ ok: true, json: async () => ({ inviti: [] }) })
    render(<InvitaCollaboratoreSheet variant="header" />)
    fireEvent.click(screen.getByRole('button', { name: 'Invita collaboratore' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: 'Invia invito' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('email valido')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('click su "Revoca" chiama DELETE e rimuove la riga dalla lista', async () => {
    fetchMock()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          inviti: [{ id: 'inv-1', email: 'mario@rossi.it', ruolo: 'tecnico', expires_at: new Date(Date.now() + 5 * 86400000).toISOString() }],
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) })

    render(<InvitaCollaboratoreSheet variant="header" />)
    fireEvent.click(screen.getByRole('button', { name: 'Invita collaboratore' }))
    await waitFor(() => expect(screen.getByText('mario@rossi.it')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Revoca invito a mario@rossi.it' }))

    await waitFor(() => expect(screen.queryByText('mario@rossi.it')).toBeNull())
    expect(fetch).toHaveBeenLastCalledWith('/api/tecnici/invite/inv-1', { method: 'DELETE' })
  })
})
