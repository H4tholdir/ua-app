import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CicloNuovoSheet } from '../../src/components/features/cicli/CicloNuovoSheet'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

describe('CicloNuovoSheet', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function fetchMock() {
    return fetch as unknown as ReturnType<typeof vi.fn>
  }

  function openCreate() {
    render(<CicloNuovoSheet mode="create" />)
    fireEvent.click(screen.getByRole('button', { name: 'Nuovo ciclo' }))
  }

  it('modalità create: submit senza nome mostra errore e non chiama fetch', async () => {
    openCreate()
    fireEvent.click(screen.getByRole('button', { name: 'Crea ciclo' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('nome')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('select tipo dispositivo espone le 6 opzioni canoniche', () => {
    openCreate()
    const select = screen.getByLabelText('Tipo dispositivo *') as HTMLSelectElement
    const values = Array.from(select.options).map(o => o.value)
    expect(values).toEqual([
      '', 'Protesi fissa', 'Protesi mobile', 'Protesi combinata',
      'Protesi provvisoria', 'Protesi scheletrica', 'Protesi ortodontica',
    ])
  })

  it('select classe di rischio espone le 4 opzioni + non specificata', () => {
    openCreate()
    const select = screen.getByLabelText('Classe di rischio') as HTMLSelectElement
    const values = Array.from(select.options).map(o => o.value)
    expect(values).toEqual(['', 'classe_i', 'classe_iia', 'classe_iib', 'classe_iii'])
  })

  it('modalità create: submit valido chiama POST /api/cicli con i campi nel body', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ciclo: { id: 'ciclo-nuovo', codice: 'C1', nome: 'Corona ceramica', tipo_dispositivo: 'Protesi fissa', classe_rischio: null } }),
    })
    openCreate()
    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Corona ceramica' } })
    fireEvent.change(screen.getByLabelText('Codice *'), { target: { value: 'C1' } })
    fireEvent.change(screen.getByLabelText('Tipo dispositivo *'), { target: { value: 'Protesi fissa' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crea ciclo' }))

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    const [url, options] = fetchMock().mock.calls[0]
    expect(url).toBe('/api/cicli')
    expect(options.method).toBe('POST')
    const body = JSON.parse(options.body as string)
    expect(body).toEqual({ nome: 'Corona ceramica', codice: 'C1', tipo_dispositivo: 'Protesi fissa', classe_rischio: null })
  })

  it('modalità edit: precompila i campi con initialValues e chiama PATCH /api/cicli/[id]', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ciclo: { id: 'ciclo-1', codice: 'C1', nome: 'Corona modificata', tipo_dispositivo: 'Protesi fissa', classe_rischio: null } }),
    })
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, reload: reloadMock } })

    render(
      <CicloNuovoSheet
        mode="edit"
        cicloId="ciclo-1"
        initialValues={{ codice: 'C1', nome: 'Corona ceramica', tipo_dispositivo: 'Protesi fissa', classe_rischio: null }}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Modifica' }))

    expect(screen.getByLabelText('Nome *')).toHaveValue('Corona ceramica')
    expect(screen.getByLabelText('Codice *')).toHaveValue('C1')

    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Corona modificata' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva modifiche' }))

    await waitFor(() => expect(reloadMock).toHaveBeenCalledTimes(1))
    const [url, options] = fetchMock().mock.calls[0]
    expect(url).toBe('/api/cicli/ciclo-1')
    expect(options.method).toBe('PATCH')
  })

  it('modalità edit: valore tipo_dispositivo fuori lista (es. dato storico) resta selezionato tra le opzioni', () => {
    render(
      <CicloNuovoSheet
        mode="edit"
        cicloId="ciclo-1"
        initialValues={{ codice: 'C1', nome: 'Ciclo storico', tipo_dispositivo: 'Riferimento', classe_rischio: null }}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Modifica' }))
    const select = screen.getByLabelText('Tipo dispositivo *') as HTMLSelectElement
    expect(select.value).toBe('Riferimento')
    expect(Array.from(select.options).map(o => o.value)).toContain('Riferimento')
  })

  it('errore server mostra messaggio inline e non chiude lo sheet', async () => {
    fetchMock().mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Esiste già un ciclo con questo codice in questo laboratorio' }) })
    openCreate()
    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'X' } })
    fireEvent.change(screen.getByLabelText('Codice *'), { target: { value: 'C1' } })
    fireEvent.change(screen.getByLabelText('Tipo dispositivo *'), { target: { value: 'Protesi fissa' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crea ciclo' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Esiste già un ciclo con questo codice in questo laboratorio')
    expect(screen.getByLabelText('Nome *')).toBeInTheDocument()
  })
})
