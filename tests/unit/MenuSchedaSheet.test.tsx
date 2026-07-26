import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
const push = vi.fn()
const replace = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace, refresh: vi.fn() }) }))
import { MenuSchedaSheet } from '../../src/components/features/lavori/scheda-v3/MenuSchedaSheet'

describe('MenuSchedaSheet', () => {
  // D-1 (collaudo browser 26/07/2026): questo sheet resta APERTO mentre si naviga — la sua
  // entry di history è in cima, quindi la destinazione deve SOSTITUIRLA (`replace`), non
  // impilarcisi sopra. Col vecchio `router.push` l'entry restava sepolta sotto `/modifica` e
  // tornare indietro costava DUE pressioni, la seconda immobile (misurato: `len` 4 → 5).
  it('Prezzi e lavorazioni naviga al ponte con tab lavorazioni, SOSTITUENDO l\'entry dello sheet', () => {
    render(<MenuSchedaSheet aperto lavoroId="lav" onChiudi={() => {}} onApriDocumenti={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /prezzi e lavorazioni/i }))
    expect(replace).toHaveBeenCalledWith('/lavori/lav/modifica?tab=lavorazioni')
    expect(push).not.toHaveBeenCalled()
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
