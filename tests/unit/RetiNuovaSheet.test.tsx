import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RetiNuovaSheet } from '../../src/components/features/rete/RetiNuovaSheet'

describe('RetiNuovaSheet', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function fetchMock() {
    return fetch as unknown as ReturnType<typeof vi.fn>
  }

  function openSheet() {
    render(<RetiNuovaSheet />)
    fireEvent.click(screen.getByRole('button', { name: 'Crea rete' }))
  }

  it('submit senza nome mostra errore e non chiama la POST', async () => {
    openSheet()
    fireEvent.click(screen.getByRole('button', { name: 'Conferma creazione' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('nome')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('submit valido chiama POST /api/rete con { nome } nel body e ricarica la pagina', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ rete: { id: 'rete-1', nome: 'Rete Toscana', admin_laboratorio_id: 'lab-1' } }),
    })
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    })

    openSheet()
    fireEvent.change(screen.getByLabelText('Nome rete *'), { target: { value: 'Rete Toscana' } })
    fireEvent.click(screen.getByRole('button', { name: 'Conferma creazione' }))

    await waitFor(() => expect(reloadMock).toHaveBeenCalledTimes(1))

    const [url, options] = fetchMock().mock.calls[0]
    expect(url).toBe('/api/rete')
    const body = JSON.parse(options.body as string)
    expect(body).toEqual({ nome: 'Rete Toscana' })
  })

  it('errore 409 (lab già admin di una rete) mostra messaggio inline e non chiude lo sheet', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Il laboratorio amministra già una rete' }),
    })

    openSheet()
    fireEvent.change(screen.getByLabelText('Nome rete *'), { target: { value: 'Seconda rete' } })
    fireEvent.click(screen.getByRole('button', { name: 'Conferma creazione' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Il laboratorio amministra già una rete')
    expect(screen.getByLabelText('Nome rete *')).toBeInTheDocument()
  })

  it('errore 422 (nome mancante lato server) mostra messaggio inline', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Campo "nome" obbligatorio' }),
    })

    openSheet()
    fireEvent.change(screen.getByLabelText('Nome rete *'), { target: { value: '   a   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Conferma creazione' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Campo "nome" obbligatorio')
  })
})
