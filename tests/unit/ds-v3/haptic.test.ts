// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => { vi.resetModules(); localStorage.clear() })

describe('haptic v3 (spec §9.3 — pattern di legge)', () => {
  it('pattern esatti su Android', async () => {
    const vibrate = vi.fn(() => true)
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    const { vibra } = await import('@/design-system/v3/haptic')
    vibra('selection'); expect(vibrate).toHaveBeenLastCalledWith(10)
    vibra('light');     expect(vibrate).toHaveBeenLastCalledWith(15)
    vibra('medium');    expect(vibrate).toHaveBeenLastCalledWith(30)
    vibra('success');   expect(vibrate).toHaveBeenLastCalledWith([15, 80, 25])
    vibra('error');     expect(vibrate).toHaveBeenLastCalledWith([40, 60, 40, 60, 40])
  })
  it('no-op sicuro dove vibrate non esiste (iOS Safari)', async () => {
    delete (navigator as unknown as Record<string, unknown>).vibrate
    const { vibra, hapticDisponibile } = await import('@/design-system/v3/haptic')
    expect(hapticDisponibile()).toBe(false)
    expect(() => vibra('success')).not.toThrow()
  })
  it('rispetta lo spegnimento utente', async () => {
    const vibrate = vi.fn(() => true)
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    localStorage.setItem('ua_haptic_v3', 'off')
    const { vibra } = await import('@/design-system/v3/haptic')
    vibra('medium')
    expect(vibrate).not.toHaveBeenCalled()
  })
})
