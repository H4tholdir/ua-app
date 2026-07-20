// tests/unit/invito-persona-sheet.test.tsx — Task 13 (ondata A mini-triage):
// InvitoPersonaSheet — UI invito rifatta v3 (API INTOCCABILE). Payload POST
// IDENTICO a InvitaCollaboratoreSheet.tsx:90-93 (legacy, ora eliminato —
// orfano dopo la migrazione, vedi corpo del commit). GET/DELETE ricalcano lo
// stesso componente legacy (righe 58 e 117). Mock set copiato da
// tests/unit/scheda-persona-sheet.test.tsx (Task 12) — stesso schema per
// suono/haptic/motion; nessun router qui (il componente non naviga né fa
// `router.refresh()`, «refresh» nel brief è la ri-fetch di GET /invite).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'

vi.mock('@/design-system/v3/sound', () => ({ suona: vi.fn() }))
vi.mock('@/design-system/v3/haptic', () => ({ vibra: vi.fn() }))
vi.mock('@/design-system/v3/motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/design-system/v3/motion')>()
  return { ...actual, useReducedMotion: () => true }
})

import { InvitoPersonaSheet } from '@/components/features/tecnici/InvitoPersonaSheet'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('InvitoPersonaSheet (Task 13)', () => {
  it('submit con email valida (ruolo default tecnico) → POST /api/tecnici/invite con body {email, ruolo}, poi messaggio verde + refresh lista', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      const method = (init as RequestInit | undefined)?.method ?? 'GET'
      if (url === '/api/tecnici/invite' && method === 'GET') {
        return Promise.resolve(jsonResponse({ inviti: [] }))
      }
      if (url === '/api/tecnici/invite' && method === 'POST') {
        return Promise.resolve(jsonResponse({ success: true, message: 'Invito creato per nuovo@esempio.it' }, 201))
      }
      return Promise.reject(new Error(`fetch inatteso: ${method} ${url}`))
    })

    render(<InvitoPersonaSheet aperto onChiudi={() => {}} />)

    // GET iniziale della lista pendenti all'apertura (pattern legacy riga 58).
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/tecnici/invite')
    )
    const chiamateGetIniziali = fetchMock.mock.calls.length

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nuovo@esempio.it' } })
    fireEvent.click(screen.getByRole('button', { name: 'Invita' }))

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([, init]) => (init as RequestInit | undefined)?.method === 'POST'
      )
      expect(postCall).toBeDefined()
    })
    const postCall = fetchMock.mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === 'POST'
    ) as [string, RequestInit]
    const [url, init] = postCall
    expect(url).toBe('/api/tecnici/invite')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(init.body as string)).toEqual({ email: 'nuovo@esempio.it', ruolo: 'tecnico' })

    // Messaggio verde inline.
    const successo = await screen.findByRole('status')
    expect(successo).toHaveTextContent('Invito creato per nuovo@esempio.it')

    // Refresh lista inviti: una nuova GET dopo il successo.
    await waitFor(() => {
      const getCalls = fetchMock.mock.calls.filter(
        ([reqUrl, reqInit]) =>
          String(reqUrl) === '/api/tecnici/invite' &&
          ((reqInit as RequestInit | undefined)?.method ?? 'GET') === 'GET'
      )
      expect(getCalls.length).toBeGreaterThan(1)
    })
    expect(chiamateGetIniziali).toBeGreaterThan(0)
  })

  it('selezione ruolo "Front desk" → payload ruolo: front_desk', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      const method = (init as RequestInit | undefined)?.method ?? 'GET'
      if (url === '/api/tecnici/invite' && method === 'GET') {
        return Promise.resolve(jsonResponse({ inviti: [] }))
      }
      if (url === '/api/tecnici/invite' && method === 'POST') {
        return Promise.resolve(jsonResponse({ success: true, message: 'ok' }, 201))
      }
      return Promise.reject(new Error(`fetch inatteso: ${method} ${url}`))
    })

    render(<InvitoPersonaSheet aperto onChiudi={() => {}} />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'front@esempio.it' } })
    fireEvent.click(screen.getByRole('button', { name: 'Front desk' }))
    fireEvent.click(screen.getByRole('button', { name: 'Invita' }))

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([, i]) => (i as RequestInit | undefined)?.method === 'POST'
      )
      expect(postCall).toBeDefined()
    })
    const [, init] = fetchMock.mock.calls.find(
      ([, i]) => (i as RequestInit | undefined)?.method === 'POST'
    ) as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toEqual({ email: 'front@esempio.it', ruolo: 'front_desk' })
  })

  it('email vuota → nessuna POST + messaggio di errore visibile', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      const method = (init as RequestInit | undefined)?.method ?? 'GET'
      if (url === '/api/tecnici/invite' && method === 'GET') {
        return Promise.resolve(jsonResponse({ inviti: [] }))
      }
      return Promise.reject(new Error(`fetch inatteso: ${method} ${url}`))
    })

    render(<InvitoPersonaSheet aperto onChiudi={() => {}} />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    fetchMock.mockClear()

    fireEvent.click(screen.getByRole('button', { name: 'Invita' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/email/i)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('errore server → messaggio role="alert" visibile, nessun refresh spurio', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      const method = (init as RequestInit | undefined)?.method ?? 'GET'
      if (url === '/api/tecnici/invite' && method === 'GET') {
        return Promise.resolve(jsonResponse({ inviti: [] }))
      }
      if (url === '/api/tecnici/invite' && method === 'POST') {
        return Promise.resolve(jsonResponse({ error: 'Invito già inviato' }, 409))
      }
      return Promise.reject(new Error(`fetch inatteso: ${method} ${url}`))
    })

    render(<InvitoPersonaSheet aperto onChiudi={() => {}} />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'gia@esempio.it' } })
    fireEvent.click(screen.getByRole('button', { name: 'Invita' }))

    const errore = await screen.findByRole('alert')
    expect(errore).toHaveTextContent('Invito già inviato')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('inviti pendenti renderizzati dal GET mockato + revoca chiama DELETE /api/tecnici/invite/{id}', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      const method = (init as RequestInit | undefined)?.method ?? 'GET'
      if (url === '/api/tecnici/invite' && method === 'GET') {
        return Promise.resolve(
          jsonResponse({
            inviti: [{ id: 'inv-1', email: 'mario.rossi@esempio.it', ruolo: 'tecnico' }],
          })
        )
      }
      if (url === '/api/tecnici/invite/inv-1' && method === 'DELETE') {
        return Promise.resolve(jsonResponse({ success: true }))
      }
      return Promise.reject(new Error(`fetch inatteso: ${method} ${url}`))
    })

    render(<InvitoPersonaSheet aperto onChiudi={() => {}} />)

    const riga = await screen.findByText('mario.rossi@esempio.it')
    const li = riga.closest('li') as HTMLLIElement
    expect(li).not.toBeNull()

    fireEvent.click(within(li).getByRole('button', { name: 'Revoca' }))

    await waitFor(() => {
      const deleteCall = fetchMock.mock.calls.find(
        ([, i]) => (i as RequestInit | undefined)?.method === 'DELETE'
      )
      expect(deleteCall).toBeDefined()
    })
    const [url, init] = fetchMock.mock.calls.find(
      ([, i]) => (i as RequestInit | undefined)?.method === 'DELETE'
    ) as [string, RequestInit]
    expect(url).toBe('/api/tecnici/invite/inv-1')
    expect(init.method).toBe('DELETE')

    await waitFor(() => expect(screen.queryByText('mario.rossi@esempio.it')).not.toBeInTheDocument())
  })

  it('revoca fallita (DELETE → 500) → alert visibile, invito ancora in lista (review finale 20/07)', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      const method = (init as RequestInit | undefined)?.method ?? 'GET'
      if (url === '/api/tecnici/invite' && method === 'GET') {
        return Promise.resolve(
          jsonResponse({
            inviti: [{ id: 'inv-1', email: 'mario.rossi@esempio.it', ruolo: 'tecnico' }],
          })
        )
      }
      if (url === '/api/tecnici/invite/inv-1' && method === 'DELETE') {
        return Promise.resolve(jsonResponse({ error: 'Errore del server' }, 500))
      }
      return Promise.reject(new Error(`fetch inatteso: ${method} ${url}`))
    })

    render(<InvitoPersonaSheet aperto onChiudi={() => {}} />)

    const riga = await screen.findByText('mario.rossi@esempio.it')
    const li = riga.closest('li') as HTMLLIElement
    expect(li).not.toBeNull()

    fireEvent.click(within(li).getByRole('button', { name: 'Revoca' }))

    const errore = await screen.findByRole('alert')
    expect(errore).toHaveTextContent('Errore del server')

    // L'invito NON è stato rimosso in modo ottimistico: resta in lista.
    expect(screen.getByText('mario.rossi@esempio.it')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/tecnici/invite/inv-1', { method: 'DELETE' })
  })

  it('aperto=false → Sheet non renderizza il dialog', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ inviti: [] }))
    render(<InvitoPersonaSheet aperto={false} onChiudi={() => {}} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
