import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'

let mockPathname = '/dashboard'
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggle: vi.fn(), isDark: false }),
}))
vi.mock('@/lib/supabase/browser-anon', () => ({
  getBrowserClient: () => ({ auth: { signOut: vi.fn() } }),
}))

import { UserProfileSheet } from '../../src/components/layout/UserProfileSheet'

const PROPS_BASE = { nome: 'Francesco', cognome: 'Formicola', email: 'f@example.com', ruolo: 'titolare', labNome: 'Lab Test' }

// Ondata 1, review finale (item 4, avviso advisor ratificato 12/07): l'avatar
// (trigger del bottom sheet profilo) segue la stessa sorte della
// BottomNavPill sulle route migrate a v3 — sulla home v3 il ☰ TastoTondo È
// già l'accesso a «Tutto il resto», un secondo controllo fisso top-right
// (l'avatar) è ridondante e nel mockup home.html non esiste. Stesso predicato
// `isV3MigratedRoute` di `BottomNavPill.routes.test.tsx` — comportamento
// SPECULARE, confronto ESATTO (non prefix).
describe('UserProfileSheet — ritiro dalle route migrate a v3 (speculare a BottomNavPill P9)', () => {
  afterEach(() => {
    cleanup()
  })

  it('non si monta su /dashboard', () => {
    mockPathname = '/dashboard'
    const { container } = render(<UserProfileSheet {...PROPS_BASE} />)
    expect(container.firstChild).toBeNull()
  })

  it('non si monta su /tutto-il-resto', () => {
    mockPathname = '/tutto-il-resto'
    const { container } = render(<UserProfileSheet {...PROPS_BASE} />)
    expect(container.firstChild).toBeNull()
  })

  it('non si monta su /lavori (esatto)', () => {
    mockPathname = '/lavori'
    const { container } = render(<UserProfileSheet {...PROPS_BASE} />)
    expect(container.firstChild).toBeNull()
  })

  it('non si monta su /lavori/nuovo (v3 da Ondata 2, Task 8: wizard)', () => {
    mockPathname = '/lavori/nuovo'
    const { container } = render(<UserProfileSheet {...PROPS_BASE} />)
    expect(container.firstChild).toBeNull()
  })

  it('resta montato su /lavori/abc (v2.3, confronto NON-prefix)', () => {
    mockPathname = '/lavori/abc'
    const { getByRole } = render(<UserProfileSheet {...PROPS_BASE} />)
    expect(getByRole('button', { name: 'Apri profilo' })).toBeInTheDocument()
  })

  it('resta montato su /impostazioni (route v2.3 qualunque)', () => {
    mockPathname = '/impostazioni'
    const { getByRole } = render(<UserProfileSheet {...PROPS_BASE} />)
    expect(getByRole('button', { name: 'Apri profilo' })).toBeInTheDocument()
  })
})
