// tests/unit/persone-v3.test.tsx — Task 11 (ondata A mini-triage): «Persone»
// v3 — pagina, righe, card cedolini. Fixture da task-11-brief.md §Step 1.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PersoneV3, type TecnicoRow } from '@/components/features/tecnici/PersoneV3'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const tecnici: TecnicoRow[] = [
  { id: 't1', nome: 'Ciro', cognome: 'Esposito', sigla: 'CE', qualifica: null, prrc: true, compenso_base: null, tipo_compenso: null },
]

describe('PersoneV3 (Task 11)', () => {
  it('card cedolini per il titolare, con mese dal server', () => {
    render(<PersoneV3 tecnici={tecnici} ruolo="titolare" meseLabel="Luglio 2026" />)
    expect(screen.getByText('I cedolini')).toBeInTheDocument()
    expect(screen.getByText('Luglio 2026')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Scarica \(CSV\)/ })).toBeInTheDocument()
  })

  it('niente card cedolini per il tecnico', () => {
    render(<PersoneV3 tecnici={tecnici} ruolo="tecnico" meseLabel="Luglio 2026" />)
    expect(screen.queryByText('I cedolini')).not.toBeInTheDocument()
  })

  it('riga persona: nome, dizionario Tecnico, PRRC ✓', () => {
    render(<PersoneV3 tecnici={tecnici} ruolo="titolare" meseLabel="Luglio 2026" />)
    expect(screen.getByText('Ciro Esposito')).toBeInTheDocument()
    expect(screen.getByText('Tecnico')).toBeInTheDocument()
    expect(screen.getByText(/PRRC/)).toBeInTheDocument()
  })

  it('empty state: nessun tecnico → Vuoto, niente card cedolini', () => {
    render(<PersoneV3 tecnici={[]} ruolo="titolare" meseLabel="Luglio 2026" />)
    expect(screen.getByText('Nessuna persona')).toBeInTheDocument()
    expect(screen.getByText('Invita un collaboratore per assegnargli i lavori.')).toBeInTheDocument()
    expect(screen.queryByText('I cedolini')).not.toBeInTheDocument()
  })

  it('riga persona è un button con aria "Apri {nome}" (sheet arriva al Task 12)', () => {
    render(<PersoneV3 tecnici={tecnici} ruolo="titolare" meseLabel="Luglio 2026" />)
    expect(screen.getByRole('button', { name: 'Apri Ciro Esposito' })).toBeInTheDocument()
  })

  it('back «‹» torna a /tutto-il-resto', () => {
    render(<PersoneV3 tecnici={tecnici} ruolo="titolare" meseLabel="Luglio 2026" />)
    screen.getByRole('button', { name: 'Indietro' }).click()
    expect(push).toHaveBeenCalledWith('/tutto-il-resto')
  })
})
