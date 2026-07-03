import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ListinoNuovoSheet } from '../../src/components/features/listino/ListinoNuovoSheet'

describe('ListinoNuovoSheet', () => {
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
    render(<ListinoNuovoSheet />)
    fireEvent.click(screen.getByRole('button', { name: 'Nuova voce listino' }))
  }

  it('submit senza nome mostra errore e non chiama la POST', async () => {
    openSheet()
    fireEvent.click(screen.getByRole('button', { name: 'Crea voce' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('nome')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('submit senza codice mostra errore e non chiama la POST', async () => {
    openSheet()
    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Corona in zirconia' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crea voce' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('codice')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('submit senza categoria mostra errore e non chiama la POST', async () => {
    openSheet()
    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Corona in zirconia' } })
    fireEvent.change(screen.getByLabelText('Codice *'), { target: { value: 'CAD010' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crea voce' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('categoria')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('select categoria espone le 9 opzioni previste dal CHECK constraint DB', () => {
    openSheet()
    const select = screen.getByLabelText('Categoria *') as HTMLSelectElement
    const values = Array.from(select.options).map(o => o.value)

    expect(values).toEqual([
      '', 'protesi_fissa', 'protesi_mobile', 'implantologia', 'cad_cam',
      'ortodonzia', 'scheletrato', 'riparazione', 'materiale', 'altro',
    ])
  })

  it('select classe di rischio espone le 4 opzioni MDR + non specificata', () => {
    openSheet()
    const select = screen.getByLabelText('Classe di rischio MDR') as HTMLSelectElement
    const values = Array.from(select.options).map(o => o.value)

    expect(values).toEqual(['', 'classe_i', 'classe_iia', 'classe_iib', 'classe_iii'])
  })

  it('submit valido chiama POST /api/listino con tutti i campi MDR nel body e ricarica la pagina', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ voce: { id: 'voce-1', codice: 'CAD010', nome: 'Corona in zirconia', categoria: 'cad_cam', prezzo_1: 120 } }),
    })
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    })

    openSheet()
    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Corona in zirconia' } })
    fireEvent.change(screen.getByLabelText('Codice *'), { target: { value: 'CAD010' } })
    fireEvent.change(screen.getByLabelText('Categoria *'), { target: { value: 'cad_cam' } })
    fireEvent.change(screen.getByLabelText('Tipo dispositivo MDR'), { target: { value: 'Corona in zirconia monolitica' } })
    fireEvent.change(screen.getByLabelText('Classe di rischio MDR'), { target: { value: 'classe_iia' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crea voce' }))

    await waitFor(() => expect(reloadMock).toHaveBeenCalledTimes(1))

    const [url, options] = fetchMock().mock.calls[0]
    expect(url).toBe('/api/listino')
    const body = JSON.parse(options.body as string)
    expect(body.nome).toBe('Corona in zirconia')
    expect(body.codice).toBe('CAD010')
    expect(body.categoria).toBe('cad_cam')
    expect(body.tipo_dispositivo_mdr).toBe('Corona in zirconia monolitica')
    expect(body.classe_rischio).toBe('classe_iia')
    expect(body.da_conformare).toBe(true)
  })

  it('errore server mostra messaggio inline e non chiude lo sheet', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Non autorizzato a creare voci di listino' }),
    })

    openSheet()
    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Corona in zirconia' } })
    fireEvent.change(screen.getByLabelText('Codice *'), { target: { value: 'CAD010' } })
    fireEvent.change(screen.getByLabelText('Categoria *'), { target: { value: 'cad_cam' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crea voce' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Non autorizzato a creare voci di listino')
    expect(screen.getByLabelText('Nome *')).toBeInTheDocument()
  })
})
