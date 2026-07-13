// tests/unit/CardFasiV3.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CardFasiV3 } from '../../src/components/features/lavori/scheda-v3/CardFasiV3'
import type { LavoroFase } from '../../src/types/domain'

function fase(over: Partial<LavoroFase> & { id: string; nome: string }): LavoroFase {
  return {
    id: over.id, laboratorio_id: 'lab', lavoro_id: 'lav', fase_id: 'f-' + over.id,
    tecnico_id: over.tecnico_id ?? null, eseguita_at: over.eseguita_at ?? null,
    esito: over.esito ?? null,
    // join fase (PostgREST embed) — il nome umano della fase vive in
    // `descrizione` (tabella fasi_produzione), NON in `nome` (vedi
    // src/types/domain.ts LavoroFase.fase e database.types.ts fasi_produzione).
    fase: {
      codice_fase: 'F-' + over.id,
      descrizione: over.nome,
      ordine: 0,
      obbligatoria: true,
      misurazioni_da_rilevare: false,
    },
  } as LavoroFase
}

beforeEach(() => { vi.restoreAllMocks() })

describe('CardFasiV3', () => {
  const fasi = [
    fase({ id: '1', nome: 'Fresatura', eseguita_at: '2026-07-12T14:20:00Z' }),
    fase({ id: '2', nome: 'Controllo finale' }), // prossima
  ]

  it('mostra i nomi delle fasi e una sola PillFase FATTA sulla prossima', () => {
    render(<CardFasiV3 lavoroId="lav" fasi={fasi} onErrore={() => {}} />)
    expect(screen.getByText('Fresatura')).toBeInTheDocument()
    expect(screen.getByText('Controllo finale')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /FATTA/i })).toHaveLength(1)
  })

  it('tap su FATTA invia PATCH con eseguita_at', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    render(<CardFasiV3 lavoroId="lav" fasi={fasi} onErrore={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /FATTA/i }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/lavori/lav/fasi/2',
      expect.objectContaining({ method: 'PATCH' }),
    ))
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.eseguita_at).toBeTruthy()
  })

  it('su errore PATCH chiama onErrore e ripristina', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    vi.stubGlobal('fetch', fetchMock)
    const onErrore = vi.fn()
    render(<CardFasiV3 lavoroId="lav" fasi={fasi} onErrore={onErrore} />)
    fireEvent.click(screen.getByRole('button', { name: /FATTA/i }))
    await waitFor(() => expect(onErrore).toHaveBeenCalled())
    // la PillFase torna visibile (rollback)
    await waitFor(() => expect(screen.getAllByRole('button', { name: /FATTA/i })).toHaveLength(1))
  })
})
