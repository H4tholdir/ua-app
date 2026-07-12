import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SchedaAnteprima } from '@/components/features/pile/SchedaAnteprima'
import type { LavoroPila } from '@/lib/dashboard/pile-home'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const lavoro: LavoroPila = {
  id: 'l147', numero: '147', dentista: 'Dr. Esposito', paziente: 'PZ-0412', tipoLavoro: 'Corona zirconia',
  pill: { testo: 'OGGI · 16:00', famiglia: 'red' }, consegnabile: false,
  consegna: { data: '2026-07-09', ora: '16:00:00' }, rientro: null, tecnico: 'Ciro',
  fasi: [{ nome: 'Fresatura', fatta: true }, { nome: 'Sinterizzazione', fatta: true }, { nome: 'Glasatura', fatta: true }, { nome: 'Controllo finale', fatta: false }],
}

describe('SchedaAnteprima — pannello destro (mockup home.html 1280)', () => {
  it('CardInfo con le RigheDato + fasi + CONSEGNA disabled con callout (§5.1: MAI nascosto)', () => {
    render(<SchedaAnteprima lavoro={lavoro} />)
    expect(screen.getByText('PZ-0412')).toBeInTheDocument()
    expect(screen.getByText('Controllo finale')).toBeInTheDocument()
    const consegna = screen.getByRole('button', { name: /consegna/i })
    expect(consegna).toBeDisabled()
    expect(screen.getByText('Completa il controllo finale per consegnare')).toBeInTheDocument()
  })

  it('consegnabile → CONSEGNA attivo che naviga alla consegna (P3)', async () => {
    const user = (await import('@testing-library/user-event')).default.setup()
    render(<SchedaAnteprima lavoro={{ ...lavoro, consegnabile: true, fasi: lavoro.fasi.map((f) => ({ ...f, fatta: true })) }} />)
    const consegna = screen.getByRole('button', { name: /consegna/i })
    expect(consegna).toBeEnabled()
    await user.click(consegna)
    expect(push).toHaveBeenCalledWith('/lavori/l147/consegna')
  })
})
