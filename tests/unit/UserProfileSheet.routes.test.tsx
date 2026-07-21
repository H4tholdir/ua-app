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
// BottomNavPill sulle route migrate a v3. Stesso predicato `isV3MigratedRoute`
// di `BottomNavPill.routes.test.tsx` — comportamento SPECULARE.
// Polish L1 (2026-07-14): /lavori/[id] e /lavori/[id]/modifica sono v3
// (Ondata 3a) → l'avatar si ritira anche lì; /lavori/[id]/consegna resta v2.3
// e lo conserva.
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

  // Ondata Parete, Task 11: /cassette nasce v3 (spec §5) — l'avatar fisso
  // top-right cadrebbe SOPRA il ☰ TastoTondo della parete.
  it('non si monta su /cassette (parete v3, ondata Parete)', () => {
    mockPathname = '/cassette'
    const { container } = render(<UserProfileSheet {...PROPS_BASE} />)
    expect(container.firstChild).toBeNull()
  })

  it('non si monta su /lavori/nuovo (v3 da Ondata 2, Task 8: wizard)', () => {
    mockPathname = '/lavori/nuovo'
    const { container } = render(<UserProfileSheet {...PROPS_BASE} />)
    expect(container.firstChild).toBeNull()
  })

  it('non si monta su /lavori/abc (scheda-vista v3, Ondata 3a)', () => {
    mockPathname = '/lavori/abc'
    const { container } = render(<UserProfileSheet {...PROPS_BASE} />)
    expect(container.firstChild).toBeNull()
  })

  it('non si monta su /lavori/abc/modifica (route-ponte v3)', () => {
    mockPathname = '/lavori/abc/modifica'
    const { container } = render(<UserProfileSheet {...PROPS_BASE} />)
    expect(container.firstChild).toBeNull()
  })

  it('resta montato su /lavori/abc/consegna (flusso consegna v2.3)', () => {
    mockPathname = '/lavori/abc/consegna'
    const { getByRole } = render(<UserProfileSheet {...PROPS_BASE} />)
    expect(getByRole('button', { name: 'Apri profilo' })).toBeInTheDocument()
  })

  it('resta montato su /impostazioni (route v2.3 qualunque)', () => {
    mockPathname = '/impostazioni'
    const { getByRole } = render(<UserProfileSheet {...PROPS_BASE} />)
    expect(getByRole('button', { name: 'Apri profilo' })).toBeInTheDocument()
  })
})
