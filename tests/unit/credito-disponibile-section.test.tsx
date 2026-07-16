// tests/unit/credito-disponibile-section.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CreditoDisponibileSection } from '@/components/features/scadenzario/CreditoDisponibileSection'

// CreditoDisponibileSection monta sempre <CreditoSheet> (anche a mode=null),
// che chiama useRouter() di next/navigation — fuori da un App Router serve il
// mock, come nelle altre suite di questa cartella (LavoroFormClient.*, ecc.)
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))

const base = { clienteId: 'c1', dovutiApplicabili: [] }

describe('CreditoDisponibileSection — saldo negativo (spec R1 §7)', () => {
  it('saldo negativo → alert visibile con importo e link riconciliazione', () => {
    render(<CreditoDisponibileSection {...base} disponibile={-60} />)
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText(/-60/)).toBeTruthy()
    expect(screen.getByRole('link', { name: /riconciliazion/i })).toBeTruthy()
  })
  it('saldo zero → nessuna sezione (comportamento attuale)', () => {
    const { container } = render(<CreditoDisponibileSection {...base} disponibile={0} />)
    expect(container.innerHTML).toBe('')
  })
  it('saldo positivo → sezione azioni attuale', () => {
    render(<CreditoDisponibileSection {...base} disponibile={50} />)
    expect(screen.getByText('Applica a un dovuto')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
