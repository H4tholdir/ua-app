import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

const refreshMock = () => {}
import { vi } from 'vitest'
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => {}, refresh: refreshMock }),
}))

import { LavoriInAttesaSection } from '@/components/features/scadenzario/LavoriInAttesaSection'
import type { LavoroInAttesa } from '@/app/api/scadenzario/[cliente_id]/route'

function lavoro(overrides: Partial<LavoroInAttesa> = {}): LavoroInAttesa {
  return {
    id: 'l1',
    numero_lavoro: '2026/0001',
    prezzo_unitario: 112,
    data_consegna_prevista: '2026-07-01',
    proposta_dentista: null,
    proposta_at: null,
    divergente: false,
    ...overrides,
  }
}

describe('LavoriInAttesaSection — badge divergenza prezzo (Task 7b)', () => {
  it('mostra la pill "verifica prezzo" quando divergente è true', () => {
    render(<LavoriInAttesaSection lavori={[lavoro({ divergente: true })]} studioNome="Studio Rossi" />)
    expect(screen.getByText('verifica prezzo')).toBeInTheDocument()
  })

  it('NON mostra la pill quando divergente è false', () => {
    render(<LavoriInAttesaSection lavori={[lavoro({ divergente: false })]} studioNome="Studio Rossi" />)
    expect(screen.queryByText('verifica prezzo')).not.toBeInTheDocument()
  })
})
