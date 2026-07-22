import { describe, it, expect, vi, afterEach } from 'vitest'
import { tornaIndietro } from '@/lib/nav/torna-indietro'

function conHistoryLength(n: number) {
  Object.defineProperty(window.history, 'length', { value: n, configurable: true })
}

describe('tornaIndietro (direttiva permanente 22/07: back = pagina precedente)', () => {
  afterEach(() => conHistoryLength(1))

  it('con storia di navigazione fa router.back()', () => {
    conHistoryLength(3)
    const router = { back: vi.fn(), push: vi.fn() }
    tornaIndietro(router)
    expect(router.back).toHaveBeenCalledTimes(1)
    expect(router.push).not.toHaveBeenCalled()
  })

  it('senza storia (deep-link, PWA appena aperta) va al fallback', () => {
    conHistoryLength(1)
    const router = { back: vi.fn(), push: vi.fn() }
    tornaIndietro(router)
    expect(router.back).not.toHaveBeenCalled()
    expect(router.push).toHaveBeenCalledWith('/dashboard')
  })

  it('fallback personalizzato', () => {
    conHistoryLength(1)
    const router = { back: vi.fn(), push: vi.fn() }
    tornaIndietro(router, '/tutto-il-resto')
    expect(router.push).toHaveBeenCalledWith('/tutto-il-resto')
  })
})
