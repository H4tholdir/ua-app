import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TuttoIlResto } from '@/components/features/tutto-il-resto/TuttoIlResto'
import type { Sezione } from '@/lib/dashboard/tutto-il-resto'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

// Review finding G1 (fix-list FIX-G) — «Tutto il resto» renderizza `TastoTondo`
// (`suona('tap')`) più `DialogConferma` (`TastoPrimario`, idem) senza che nulla a monte
// chiamasse mai `initSuoni()`: primo tap muto, stesso bug chiuso su /dashboard con
// `HomeV3.tsx`.
const { initSuoniSpy } = vi.hoisted(() => ({ initSuoniSpy: vi.fn() }))
vi.mock('@/design-system/v3/sound', async (importOriginal) => {
  const reale = await importOriginal<typeof import('@/design-system/v3/sound')>()
  return { ...reale, initSuoni: initSuoniSpy }
})

const sezione = (extra: Partial<Sezione> = {}): Sezione => ({
  chiave: 'dentisti', emoji: '🦷', nome: 'Dentisti', sub: 'Esposito, Bianchi e Russo', href: '/clienti', ...extra,
})

describe('TuttoIlResto — ☰ le 9 voci (§6.1/§6.2, Task 10 O1c)', () => {
  it('con sub presente → aria-label espone "<nome>. <sub>" (lo screen reader legge anche il sub, non solo il nome)', () => {
    render(<TuttoIlResto sezioni={[sezione({ nome: 'Dentisti', sub: 'Esposito, Bianchi e Russo' })]} utenteNome="Francesco" labNome="Lab Test" />)
    expect(screen.getByRole('link', { name: 'Dentisti. Esposito, Bianchi e Russo' })).toBeInTheDocument()
  })

  it('senza sub (stringa vuota) → aria-label è SOLO il nome, niente punto finale spurio', () => {
    render(<TuttoIlResto sezioni={[sezione({ nome: 'Il mio laboratorio', sub: '' })]} utenteNome="Francesco" labNome="Lab Test" />)
    expect(screen.getByRole('link', { name: 'Il mio laboratorio' })).toBeInTheDocument()
  })
})

describe('TuttoIlResto — motore audio al mount (G1, review FIX-G)', () => {
  beforeEach(() => { initSuoniSpy.mockClear() })

  it('chiama initSuoni() al mount — root client di /tutto-il-resto', () => {
    render(<TuttoIlResto sezioni={[sezione()]} utenteNome="Francesco" labNome="Lab Test" />)
    expect(initSuoniSpy).toHaveBeenCalledTimes(1)
  })
})
