import { describe, it, expect, vi } from 'vitest'
import { svuotaRicerca } from '@/lib/ui/svuota-ricerca'

describe('svuotaRicerca (P7)', () => {
  it('svuota e ri-focalizza il campo', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    const svuota = vi.fn()
    svuotaRicerca(input, svuota)
    expect(svuota).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(input)
  })
  it('con input null svuota comunque senza lanciare', () => {
    const svuota = vi.fn()
    expect(() => svuotaRicerca(null, svuota)).not.toThrow()
    expect(svuota).toHaveBeenCalledTimes(1)
  })
})
