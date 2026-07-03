import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MagazzinoAddSheet } from '../../src/components/features/magazzino/MagazzinoAddSheet'

describe('MagazzinoAddSheet', () => {
  const noop = () => {}

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function fetchMock() {
    return fetch as unknown as ReturnType<typeof vi.fn>
  }

  it('submit senza nome mostra errore e non chiama la POST', async () => {
    render(
      <MagazzinoAddSheet open categorieEsistenti={[]} fornitori={[]} onClose={noop} onArticoloCreato={noop} />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Salva articolo' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('nome')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('submit senza codice articolo mostra errore e non chiama la POST', async () => {
    render(
      <MagazzinoAddSheet open categorieEsistenti={[]} fornitori={[]} onClose={noop} onArticoloCreato={noop} />
    )

    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Gesso extra-duro' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva articolo' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('codice')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('attivare "dispositivo medico" sincronizza "traccia lotto" finché non viene toccato manualmente', () => {
    render(
      <MagazzinoAddSheet open categorieEsistenti={[]} fornitori={[]} onClose={noop} onArticoloCreato={noop} />
    )

    const dm = screen.getByLabelText('È un dispositivo medico') as HTMLInputElement
    const tl = screen.getByLabelText('Richiede tracciabilità lotto in lavorazione') as HTMLInputElement

    expect(tl.checked).toBe(false)
    fireEvent.click(dm)
    expect(tl.checked).toBe(true)
    fireEvent.click(dm)
    expect(tl.checked).toBe(false)
  })

  it('dopo un tocco manuale su "traccia lotto" non si sincronizza più con "dispositivo medico"', () => {
    render(
      <MagazzinoAddSheet open categorieEsistenti={[]} fornitori={[]} onClose={noop} onArticoloCreato={noop} />
    )

    const dm = screen.getByLabelText('È un dispositivo medico') as HTMLInputElement
    const tl = screen.getByLabelText('Richiede tracciabilità lotto in lavorazione') as HTMLInputElement

    fireEvent.click(tl)
    expect(tl.checked).toBe(true)
    fireEvent.click(dm)
    expect(tl.checked).toBe(true)
    fireEvent.click(dm)
    expect(tl.checked).toBe(true)
  })

  it('submit valido chiama POST /api/magazzino e notifica onArticoloCreato con i dati arricchiti', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ articolo: { id: 'art-1', codice_articolo: 'GES01', nome: 'Gesso extra-duro', scorta_attuale: 0, scorta_minima: 5 } }),
    })
    const onArticoloCreato = vi.fn()

    render(
      <MagazzinoAddSheet open categorieEsistenti={[]} fornitori={[]} onClose={noop} onArticoloCreato={onArticoloCreato} />
    )

    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Gesso extra-duro' } })
    fireEvent.change(screen.getByLabelText('Codice articolo *'), { target: { value: 'GES01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva articolo' }))

    await waitFor(() => expect(onArticoloCreato).toHaveBeenCalledTimes(1))
    expect(onArticoloCreato).toHaveBeenCalledWith({
      id: 'art-1',
      codice_articolo: 'GES01',
      nome: 'Gesso extra-duro',
      produttore: null,
      categoria: null,
      um_scarico: 'g',
      scorta_attuale: 0,
      scorta_minima: 5,
      dispositivo_medico: false,
    })

    const [url, options] = fetchMock().mock.calls[0]
    expect(url).toBe('/api/magazzino')
    const body = JSON.parse(options.body as string)
    expect(body.nome).toBe('Gesso extra-duro')
    expect(body.codice_articolo).toBe('GES01')
    expect(body.dispositivo_medico).toBe(false)
    expect(body.traccia_lotto).toBe(false)
  })

  it('errore server mostra messaggio inline e non chiude lo sheet', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'codice_articolo duplicato' }),
    })
    const onClose = vi.fn()

    render(
      <MagazzinoAddSheet open categorieEsistenti={[]} fornitori={[]} onClose={onClose} onArticoloCreato={vi.fn()} />
    )

    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Gesso extra-duro' } })
    fireEvent.change(screen.getByLabelText('Codice articolo *'), { target: { value: 'GES01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva articolo' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('codice_articolo duplicato')
    expect(onClose).not.toHaveBeenCalled()
  })
})
