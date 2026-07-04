import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CicloFasiEditor } from '../../src/components/features/cicli/CicloFasiEditor'

const originalFetch = global.fetch

describe('CicloFasiEditor', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => {
    global.fetch = originalFetch
    vi.useRealTimers()
  })

  it('nessuna fase iniziale → messaggio "nessuna fase" e bottone aggiungi', () => {
    render(<CicloFasiEditor cicloId="ciclo-1" nomeCiclo="CNC Corona" fasiIniziali={[]} ultimaModificaLabel={null} />)
    expect(screen.getByText(/nessuna fase/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /\+ Aggiungi fase/i })).toBeInTheDocument()
  })

  it('"+ Aggiungi fase" aggiunge una riga vuota compilabile', () => {
    render(<CicloFasiEditor cicloId="ciclo-1" nomeCiclo="CNC Corona" fasiIniziali={[]} ultimaModificaLabel={null} />)
    fireEvent.click(screen.getByRole('button', { name: /\+ Aggiungi fase/i }))
    expect(screen.getByLabelText(/Fase 1 — Codice/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Fase 1 — Descrizione/i)).toBeInTheDocument()
  })

  it('cerca in libreria → seleziona un risultato → precompila una nuova riga', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ fasi: [{ codice_fase: 'OL10', descrizione: 'Disegno modelli progettazione', attrezzatura: null, controllo_misura: null, esito_atteso: null, materiali_nota: null, obbligatoria: true }] }),
    }) as unknown as typeof fetch

    render(<CicloFasiEditor cicloId="ciclo-1" nomeCiclo="CNC Corona" fasiIniziali={[]} ultimaModificaLabel={null} />)

    fireEvent.change(screen.getByPlaceholderText(/Cerca nella libreria/i), { target: { value: 'disegno' } })
    await vi.advanceTimersByTimeAsync(250)

    await waitFor(() => expect(screen.getByText('Disegno modelli progettazione')).toBeInTheDocument())
    fireEvent.mouseDown(screen.getByText('Disegno modelli progettazione'))

    expect(screen.getByDisplayValue('OL10')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Disegno modelli progettazione')).toBeInTheDocument()
  })

  it('rimuovi fase → la rimuove dalla lista locale', () => {
    render(
      <CicloFasiEditor
        cicloId="ciclo-1"
        nomeCiclo="CNC Corona"
        fasiIniziali={[{ id: 'fase-1', codice_fase: 'OL10', descrizione: 'Disegno modelli', obbligatoria: true, attrezzatura: null, controllo_misura: null, esito_atteso: null, materiali_nota: null }]}
        ultimaModificaLabel="Francesco Formicola il 04/07/2026"
      />
    )
    expect(screen.getByText(/Francesco Formicola/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Rimuovi fase 1/i }))
    expect(screen.queryByLabelText(/Fase 1 — Codice/i)).not.toBeInTheDocument()
  })

  it('Salva → chiama PATCH /api/cicli/:id/fasi col body corretto', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    global.fetch = fetchSpy as unknown as typeof fetch

    const reload = vi.fn()
    Object.defineProperty(window, 'location', { value: { reload }, writable: true })

    render(
      <CicloFasiEditor
        cicloId="ciclo-1"
        nomeCiclo="CNC Corona"
        fasiIniziali={[{ id: 'fase-1', codice_fase: 'OL10', descrizione: 'Disegno modelli', obbligatoria: true, attrezzatura: null, controllo_misura: null, esito_atteso: null, materiali_nota: null }]}
        ultimaModificaLabel={null}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Salva modifiche/i }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith(
      '/api/cicli/ciclo-1/fasi',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ fasi: [{ id: 'fase-1', codice_fase: 'OL10', descrizione: 'Disegno modelli', obbligatoria: true, attrezzatura: null, controllo_misura: null, esito_atteso: null, materiali_nota: null }] }),
      })
    ))
  })
})
