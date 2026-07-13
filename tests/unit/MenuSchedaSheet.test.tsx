import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }))
import { MenuSchedaSheet } from '../../src/components/features/lavori/scheda-v3/MenuSchedaSheet'

describe('MenuSchedaSheet', () => {
  it('Prezzi e lavorazioni naviga al ponte con tab lavorazioni', () => {
    render(<MenuSchedaSheet aperto lavoroId="lav" onChiudi={() => {}} onApriDocumenti={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /prezzi e lavorazioni/i }))
    expect(push).toHaveBeenCalledWith('/lavori/lav/modifica?tab=lavorazioni')
  })
  it('Documenti chiama onApriDocumenti', () => {
    const onApriDocumenti = vi.fn()
    render(<MenuSchedaSheet aperto lavoroId="lav" onChiudi={() => {}} onApriDocumenti={onApriDocumenti} />)
    fireEvent.click(screen.getByRole('button', { name: /documenti/i }))
    expect(onApriDocumenti).toHaveBeenCalled()
  })
  it('Annulla lavoro è disabilitata', () => {
    render(<MenuSchedaSheet aperto lavoroId="lav" onChiudi={() => {}} onApriDocumenti={() => {}} />)
    expect(screen.getByRole('button', { name: /annulla lavoro/i })).toBeDisabled()
  })
})
