import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'

let mockPathname = '/dashboard'
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))

import { BottomNavPill } from '../../src/components/layout/BottomNavPill'

// P9 (Task 10, spec sp.3 §1): sulle pagine migrate a v3 la pill muore. Il
// confronto è ESATTO (non prefix) — /lavori/nuovo è v3 da Ondata 2 (Task 8:
// il wizard sostituisce il form v2.3) e perde la pill; /lavori/[id] resta
// v2.3 e la conserva.
describe('BottomNavPill — ritiro dalle route migrate a v3 (P9)', () => {
  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('non si monta su /dashboard', () => {
    mockPathname = '/dashboard'
    const { container } = render(<BottomNavPill />)
    expect(container.querySelector('.ua-bottom-nav')).toBeNull()
  })

  it('non si monta su /tutto-il-resto', () => {
    mockPathname = '/tutto-il-resto'
    const { container } = render(<BottomNavPill />)
    expect(container.querySelector('.ua-bottom-nav')).toBeNull()
  })

  it('non si monta su /lavori (esatto)', () => {
    mockPathname = '/lavori'
    const { container } = render(<BottomNavPill />)
    expect(container.querySelector('.ua-bottom-nav')).toBeNull()
  })

  it('non si monta su /lavori/nuovo (v3 da Ondata 2, Task 8: wizard)', () => {
    mockPathname = '/lavori/nuovo'
    const { container } = render(<BottomNavPill />)
    expect(container.querySelector('.ua-bottom-nav')).toBeNull()
  })

  it('resta montata su /lavori/abc123 (v2.3, confronto NON-prefix)', () => {
    mockPathname = '/lavori/abc123'
    const { container } = render(<BottomNavPill />)
    expect(container.querySelector('.ua-bottom-nav')).not.toBeNull()
  })

  it('resta montata su una route v2.3 qualunque (es. /clienti)', () => {
    mockPathname = '/clienti'
    const { container } = render(<BottomNavPill />)
    expect(container.querySelector('.ua-bottom-nav')).not.toBeNull()
  })
})
