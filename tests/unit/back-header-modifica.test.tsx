import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BackHeaderModifica } from '@/app/(app)/lavori/[id]/modifica/BackHeaderModifica'

const push = vi.fn()
const back = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, back }) }))

function conHistoryLength(n: number) {
  Object.defineProperty(window.history, 'length', { value: n, configurable: true })
}

describe('BackHeaderModifica — segue la direttiva permanente 22/07 (back = pagina precedente)', () => {
  afterEach(() => {
    push.mockClear()
    back.mockClear()
    conHistoryLength(1)
  })

  it('con storia di navigazione (pila → scheda → modifica) fa router.back(), NON push — evita il loop scheda↔modifica', async () => {
    conHistoryLength(3)
    render(<BackHeaderModifica lavoroId="l1" />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Torna indietro' }))
    expect(back).toHaveBeenCalledTimes(1)
    expect(push).not.toHaveBeenCalled()
  })

  it('senza storia (deep-link diretto a /modifica) va al fallback sulla scheda lavoro', async () => {
    conHistoryLength(1)
    render(<BackHeaderModifica lavoroId="l1" />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Torna indietro' }))
    expect(back).not.toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith('/lavori/l1')
  })
})
