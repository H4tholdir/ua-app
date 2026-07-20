import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TuttoIlResto } from '@/components/features/tutto-il-resto/TuttoIlResto'
import type { Sezione } from '@/lib/dashboard/tutto-il-resto'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const sezione = (extra: Partial<Sezione> = {}): Sezione => ({
  chiave: 'dentisti', emoji: '🦷', nome: 'Dentisti', sub: 'Esposito, Bianchi e Russo', href: '/clienti', ...extra,
})

describe('TuttoIlResto — ☰ le 9 voci (§6.1/§6.2, Task 10 O1c)', () => {
  it('con sub presente → aria-label espone "<nome>. <sub>" (lo screen reader legge anche il sub, non solo il nome)', () => {
    render(<TuttoIlResto sezioni={[sezione({ nome: 'Dentisti', sub: 'Esposito, Bianchi e Russo' })]} />)
    expect(screen.getByRole('link', { name: 'Dentisti. Esposito, Bianchi e Russo' })).toBeInTheDocument()
  })

  it('senza sub (stringa vuota) → aria-label è SOLO il nome, niente punto finale spurio', () => {
    render(<TuttoIlResto sezioni={[sezione({ nome: 'Il mio laboratorio', sub: '' })]} />)
    expect(screen.getByRole('link', { name: 'Il mio laboratorio' })).toBeInTheDocument()
  })
})
