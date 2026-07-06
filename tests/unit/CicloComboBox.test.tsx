import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CicloComboBox } from '../../src/components/features/lavori/CicloComboBox'

const originalFetch = global.fetch

describe('CicloComboBox', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.useRealTimers()
  })

  it('digitando, cerca via GET /api/cicli?q= e mostra i risultati con tipo_dispositivo come etichetta', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        cicli: [{ id: 'ciclo-1', codice: 'CNC.TitCer', nome: 'CNC Corona in titanio-ceramica', tipo_dispositivo: 'Protesi fissa' }],
      }),
    }) as unknown as typeof fetch

    const onChange = vi.fn()
    render(<CicloComboBox value="" onChange={onChange} />)

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'CNC' } })
    await vi.advanceTimersByTimeAsync(250)

    await waitFor(() => {
      expect(screen.getByText('CNC Corona in titanio-ceramica')).toBeInTheDocument()
      expect(screen.getByText('Protesi fissa')).toBeInTheDocument()
    })

    fireEvent.mouseDown(screen.getByText('CNC Corona in titanio-ceramica'))
    expect(onChange).toHaveBeenCalledWith('ciclo-1', 'CNC.TitCer — CNC Corona in titanio-ceramica')
  })

  it('dropdown risultati: boxShadow e transition hanno un fallback esplicito, non solo var() nudo', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        cicli: [{ id: 'ciclo-1', codice: 'CNC.TitCer', nome: 'CNC Corona in titanio-ceramica', tipo_dispositivo: 'Protesi fissa' }],
      }),
    }) as unknown as typeof fetch

    render(<CicloComboBox value="" onChange={vi.fn()} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'CNC' } })
    await vi.advanceTimersByTimeAsync(250)
    await waitFor(() => screen.getByRole('listbox'))

    const listbox = screen.getByRole('listbox')
    const option = screen.getByRole('option')

    expect(listbox.style.boxShadow).toMatch(/^var\(--sh-b,\s*.+\)$/)
    expect(option.style.transition).toMatch(/^background var\(--tr,\s*.+\)$/)
  })

  it('con un value non vuoto al mount, idrata selectedLabel facendo fetch del ciclo (GET /api/cicli?id=)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        cicli: [{ id: 'ciclo-1', codice: 'CNC.TitCer', nome: 'CNC Corona in titanio-ceramica', tipo_dispositivo: 'Protesi fissa' }],
      }),
    }) as unknown as typeof fetch

    render(<CicloComboBox value="ciclo-1" onChange={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveValue('CNC.TitCer — CNC Corona in titanio-ceramica')
    })

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/cicli?id=ciclo-1'))
  })

  it('non rifà il fetch di hydration se selectedLabel è già popolato (nessun doppio fetch dopo una selezione interattiva)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        cicli: [{ id: 'ciclo-1', codice: 'CNC.TitCer', nome: 'CNC Corona in titanio-ceramica', tipo_dispositivo: 'Protesi fissa' }],
      }),
    }) as unknown as typeof fetch

    const onChange = vi.fn()
    const { rerender } = render(<CicloComboBox value="" onChange={onChange} />)

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'CNC' } })
    await vi.advanceTimersByTimeAsync(250)
    await waitFor(() => screen.getByRole('option'))
    fireEvent.mouseDown(screen.getByText('CNC Corona in titanio-ceramica'))

    const callsAfterSelect = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length

    // Il genitore riceve onChange('ciclo-1', label) e passa value="ciclo-1" —
    // simuliamo il re-render risultante.
    rerender(<CicloComboBox value="ciclo-1" onChange={onChange} />)

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveValue('CNC.TitCer — CNC Corona in titanio-ceramica')
    })

    // Nessuna fetch aggiuntiva: selectedLabel era già valorizzato da handleSelect.
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callsAfterSelect)
  })
})
