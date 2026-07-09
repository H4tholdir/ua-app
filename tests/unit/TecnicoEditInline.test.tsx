import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TecnicoEditInline } from '../../src/components/features/tecnici/TecnicoEditInline'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

describe('TecnicoEditInline — campi tipo_compenso e compenso_base', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function fetchMock() {
    return fetch as unknown as ReturnType<typeof vi.fn>
  }

  const TECNICO_BASE = {
    id: 'tec-1',
    nome: 'Mario',
    cognome: 'Rossi',
    sigla: null,
    qualifica: null,
    prrc: false,
    compenso_base: null,
    tipo_compenso: null,
  }

  function openEdit(overrides = {}) {
    render(<TecnicoEditInline tecnico={{ ...TECNICO_BASE, ...overrides }} />)
    fireEvent.click(screen.getByRole('button', { name: /Modifica/i }))
  }

  it('espone un select "Tipo compenso" con le 3 opzioni canoniche + non specificato', () => {
    openEdit()
    const select = screen.getByLabelText('Tipo compenso') as HTMLSelectElement
    const values = Array.from(select.options).map((o) => o.value)
    expect(values).toEqual(['', 'fisso', 'percentuale', 'per_lavorazione'])
  })

  it('espone un input numerico "Compenso base"', () => {
    openEdit()
    const input = screen.getByLabelText('Compenso base (€)') as HTMLInputElement
    expect(input.type).toBe('number')
  })

  it('precompila i campi con i valori esistenti del tecnico', () => {
    openEdit({ tipo_compenso: 'percentuale', compenso_base: 2500 })
    expect(screen.getByLabelText('Tipo compenso')).toHaveValue('percentuale')
    expect(screen.getByLabelText('Compenso base (€)')).toHaveValue(2500)
  })

  it('salvataggio invia tipo_compenso e compenso_base nel body PATCH', async () => {
    fetchMock().mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    openEdit()

    fireEvent.change(screen.getByLabelText('Tipo compenso'), { target: { value: 'fisso' } })
    fireEvent.change(screen.getByLabelText('Compenso base (€)'), { target: { value: '1800' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva' }))

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    const [url, options] = fetchMock().mock.calls[0]
    expect(url).toBe('/api/tecnici/tec-1')
    expect(options.method).toBe('PATCH')
    const body = JSON.parse(options.body as string)
    expect(body.tipo_compenso).toBe('fisso')
    expect(body.compenso_base).toBe(1800)
  })

  it('tipo compenso lasciato vuoto invia null (non classificato)', async () => {
    fetchMock().mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    openEdit({ tipo_compenso: 'fisso', compenso_base: 1800 })

    fireEvent.change(screen.getByLabelText('Tipo compenso'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva' }))

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    const [, options] = fetchMock().mock.calls[0]
    const body = JSON.parse(options.body as string)
    expect(body.tipo_compenso).toBeNull()
  })

  it('compenso base lasciato vuoto invia null', async () => {
    fetchMock().mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    openEdit({ tipo_compenso: 'fisso', compenso_base: 1800 })

    fireEvent.change(screen.getByLabelText('Compenso base (€)'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva' }))

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    const [, options] = fetchMock().mock.calls[0]
    const body = JSON.parse(options.body as string)
    expect(body.compenso_base).toBeNull()
  })
})
