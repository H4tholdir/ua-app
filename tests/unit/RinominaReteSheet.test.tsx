import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RinominaReteSheet } from '../../src/components/features/rete/RinominaReteSheet'

describe('RinominaReteSheet', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function fetchMock() {
    return fetch as unknown as ReturnType<typeof vi.fn>
  }

  it('apre lo sheet precompilato con il nome attuale', () => {
    render(<RinominaReteSheet reteId="rete-1" nomeIniziale="Rete Toscana" />)

    fireEvent.click(screen.getByRole('button', { name: 'Rinomina rete' }))

    expect(screen.getByLabelText('Nome rete *')).toHaveValue('Rete Toscana')
  })

  it('submit con nome vuoto mostra errore e non chiama PATCH', async () => {
    render(<RinominaReteSheet reteId="rete-1" nomeIniziale="Rete Toscana" />)

    fireEvent.click(screen.getByRole('button', { name: 'Rinomina rete' }))
    fireEvent.change(screen.getByLabelText('Nome rete *'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva nome' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('obbligatorio')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('submit valido chiama PATCH e ricarica la pagina', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ rete: { id: 'rete-1', nome: 'Rete Toscana Nuova' } }),
    })
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    })

    render(<RinominaReteSheet reteId="rete-1" nomeIniziale="Rete Toscana" />)
    fireEvent.click(screen.getByRole('button', { name: 'Rinomina rete' }))
    fireEvent.change(screen.getByLabelText('Nome rete *'), { target: { value: 'Rete Toscana Nuova' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva nome' }))

    await waitFor(() => expect(reloadMock).toHaveBeenCalledTimes(1))

    const [url, options] = fetchMock().mock.calls[0]
    expect(url).toBe('/api/rete/rete-1')
    expect(options.method).toBe('PATCH')
    expect(JSON.parse(options.body as string)).toEqual({ nome: 'Rete Toscana Nuova' })
  })

  it('errore server mostra messaggio', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Campo "nome" obbligatorio' }),
    })

    render(<RinominaReteSheet reteId="rete-1" nomeIniziale="Rete Toscana" />)
    fireEvent.click(screen.getByRole('button', { name: 'Rinomina rete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salva nome' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('obbligatorio')
  })
})
