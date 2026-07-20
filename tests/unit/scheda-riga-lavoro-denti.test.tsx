// Task 6 (A13) — RigaLavoroDenti: la riga «Lavoro» della scheda v3 mostra i
// denti FDI come chips sotto la descrizione quando `lavoro.denti_coinvolti`
// non è vuoto, e diventa un bottone che apre l'odontogramma
// (`/lavori/{id}/modifica?tab=clinica`). Zero denti → riga di sola lettura
// identica a oggi (nessuna regressione sulla RigaDato esistente).

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RigaLavoroDenti } from '@/components/features/lavori/scheda-v3/RigaLavoroDenti'

describe('RigaLavoroDenti (A13)', () => {
  it("con denti: bottone con label esplicita, chips e tap → onApri", () => {
    const onApri = vi.fn()
    render(<RigaLavoroDenti descrizione="Corona zirconia" denti={['13', '14']} onApri={onApri} />)
    const riga = screen.getByRole('button', { name: "Denti 13 e 14 — apri l'odontogramma" })
    expect(screen.getByText('13')).toBeInTheDocument()
    fireEvent.click(riga)
    expect(onApri).toHaveBeenCalled()
  })

  it('con un solo dente: label al singolare', () => {
    const onApri = vi.fn()
    render(<RigaLavoroDenti descrizione="Corona zirconia" denti={['13']} onApri={onApri} />)
    expect(screen.getByRole('button', { name: "Dente 13 — apri l'odontogramma" })).toBeInTheDocument()
  })

  it('oltre 4 denti: 4 chips + «+N»', () => {
    render(<RigaLavoroDenti descrizione="Scheletrato" denti={['11', '12', '13', '14', '15', '16']} onApri={() => {}} />)
    expect(screen.getByText('11')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('13')).toBeInTheDocument()
    expect(screen.getByText('14')).toBeInTheDocument()
    expect(screen.getByText('+2')).toBeInTheDocument()
    expect(screen.queryByText('15')).not.toBeInTheDocument()
    expect(screen.queryByText('16')).not.toBeInTheDocument()
  })

  it('zero denti: riga di sola lettura, nessun bottone', () => {
    render(<RigaLavoroDenti descrizione="Corona zirconia" denti={[]} onApri={() => {}} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText('Corona zirconia')).toBeInTheDocument()
    expect(screen.getByText('Lavoro')).toBeInTheDocument()
  })
})
