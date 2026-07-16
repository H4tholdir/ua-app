import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'

const suonaMock = vi.fn()
const vibraMock = vi.fn()
vi.mock('@/design-system/v3/sound', () => ({ suona: (n: string) => suonaMock(n) }))
vi.mock('@/design-system/v3/haptic', () => ({ vibra: (t: string) => vibraMock(t) }))

import { RigaBloccante } from '@/components/ds/RigaBloccante'

describe('RigaBloccante — bloccante consegna (§5.30)', () => {
  beforeEach(() => { suonaMock.mockClear(); vibraMock.mockClear() })

  it('è un button con «cosa» e «cosa fare»', () => {
    render(<RigaBloccante cosa="Manca la prescrizione del dentista" cosaFare="Aggiungila nei dati clinici" onTap={() => {}} />)
    const btn = screen.getByRole('button')
    expect(btn).toHaveTextContent('Manca la prescrizione del dentista')
    expect(btn).toHaveTextContent('Aggiungila nei dati clinici')
  })

  it('sfondo --amber-tint e «cosa fare» color famiglia --amber', () => {
    render(<RigaBloccante cosa="Manca il lotto" cosaFare="Registra il lotto" onTap={() => {}} />)
    const btn = screen.getByRole('button')
    expect(btn.style.background).toBe('var(--amber-tint)')
    expect(screen.getByText('Registra il lotto').style.color).toBe('var(--amber)')
  })

  it('tap → onTap + suona("tap") + vibra("medium")', () => {
    const onTap = vi.fn()
    render(<RigaBloccante cosa="Manca la firma" cosaFare="Vai alle Impostazioni" onTap={onTap} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onTap).toHaveBeenCalledTimes(1)
    expect(suonaMock).toHaveBeenCalledWith('tap')
    expect(vibraMock).toHaveBeenCalledWith('medium')
  })

  it('focus ring di legge + testi passano il dizionario', () => {
    const { container } = render(<RigaBloccante cosa="Manca la prescrizione" cosaFare="Aggiungila" onTap={() => {}} />)
    expect(container.querySelector('style')?.textContent ?? '').toContain('outline: 2px solid var(--blue)')
    expect(trovaParoleVietate(container.textContent ?? '')).toEqual([])
  })
})
