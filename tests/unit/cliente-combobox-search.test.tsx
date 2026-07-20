import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup, screen, fireEvent, act } from '@testing-library/react'
import { ClienteComboBox } from '../../src/components/features/clienti/ClienteComboBox'

// O4a — la ricerca passa da GET /api/clienti (choke-point N13), non più da
// una query Supabase diretta del browser.

function clienti(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `cli-${i}`, nome: `Nome${i}`, cognome: `Cognome${i}`, studio_nome: i % 2 ? `Studio ${i}` : null,
  }))
}

describe('ClienteComboBox — ricerca via API (O4a)', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); cleanup() })

  it('dopo il debounce chiama GET /api/clienti?q=<query url-encoded>', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ clienti: clienti(3) }) })
    vi.stubGlobal('fetch', fetchMock)
    render(<ClienteComboBox value="" onChange={() => {}} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'rossi & c' } })
    await act(async () => { await vi.advanceTimersByTimeAsync(250) })
    expect(fetchMock).toHaveBeenCalledWith('/api/clienti?q=rossi%20%26%20c')
  })

  it('mostra al massimo 8 opzioni anche se la API ne restituisce di più', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ clienti: clienti(12) }) }))
    render(<ClienteComboBox value="" onChange={() => {}} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'cog' } })
    await act(async () => { await vi.advanceTimersByTimeAsync(250) })
    expect(screen.getAllByRole('option')).toHaveLength(8)
  })

  it('risposta non-ok (es. 403 lab sospeso): nessun dropdown, nessun crash', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({}) }))
    render(<ClienteComboBox value="" onChange={() => {}} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'x' } })
    await act(async () => { await vi.advanceTimersByTimeAsync(250) })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('rete giù (fetch reject): nessun crash, spinner spento', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    render(<ClienteComboBox value="" onChange={() => {}} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'x' } })
    await act(async () => { await vi.advanceTimersByTimeAsync(250) })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('selezione con click chiama onChange con id e label «Studio — Nome Cognome»', async () => {
    const onChange = vi.fn()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ clienti: [{ id: 'cli-9', nome: 'Aldo', cognome: 'Esposito', studio_nome: 'Studio Esposito' }] }),
    }))
    render(<ClienteComboBox value="" onChange={onChange} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'esp' } })
    await act(async () => { await vi.advanceTimersByTimeAsync(250) })
    fireEvent.mouseDown(screen.getByRole('option'))
    expect(onChange).toHaveBeenCalledWith('cli-9', 'Studio Esposito — Aldo Esposito')
  })
})
