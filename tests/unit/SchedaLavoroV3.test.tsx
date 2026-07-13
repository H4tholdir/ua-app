import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }))
import { SchedaLavoroV3 } from '../../src/components/features/lavori/scheda-v3/SchedaLavoroV3'
import type { LavoroDettaglio } from '../../src/types/domain'

function makeLavoro(over: Partial<LavoroDettaglio> = {}): LavoroDettaglio {
  return {
    id: 'lav', numero_lavoro: '2026-0147', stato: 'pronto',
    data_consegna_prevista: '2026-07-20', ora_consegna: '16:00',
    descrizione: 'Corona zirconia', paziente_nome_snapshot: null,
    cliente: { studio_nome: 'Studio Esposito', nome: 'Marco', cognome: 'Esposito' },
    paziente: null, tecnico: { nome: 'Ciro', cognome: 'B', sigla: 'CB' },
    fasi: [], immagini: [], lavorazioni: [], appuntamenti: [], materiali: [], ddc: null,
    laboratorio: { nome: 'Lab', telefono: null },
    ...over,
  } as unknown as LavoroDettaglio
}

describe('SchedaLavoroV3', () => {
  it('CONSEGNA abilitato su lavoro pronto → naviga a /consegna', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro({ stato: 'pronto' })} />)
    const btn = screen.getByRole('button', { name: /consegna/i })
    expect(btn).not.toBeDisabled()
  })
  it('CONSEGNA disabilitato su lavoro in_lavorazione con callout', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro({ stato: 'in_lavorazione' })} />)
    expect(screen.getByRole('button', { name: /consegna/i })).toBeDisabled()
    expect(screen.getByText(/completa il controllo finale/i)).toBeInTheDocument()
  })
  it('mostra numero e dati principali', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro()} />)
    expect(screen.getByText(/2026-0147/)).toBeInTheDocument()
    expect(screen.getByText('Corona zirconia')).toBeInTheDocument()
  })
})
