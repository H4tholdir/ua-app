// Task 9 (O1i-2) — riga identità + «Esci» nel footer del NavDesk (mockup
// blocco 2 variante A, ratificata). Sopra la StrisciaStato: Avatar Ø32 +
// nome/lab + bottone «Esci» → stesso DialogConferma + signOut del Task 8
// (O1i-1, tests/unit/tutto-il-resto-esci.test.tsx) — mock pattern identico.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'

const pushMock = vi.fn()
const signOutMock = vi.fn().mockResolvedValue({})

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }))
vi.mock('@/lib/supabase/browser-anon', () => ({
  getBrowserClient: () => ({ auth: { signOut: signOutMock } }),
}))
vi.mock('@/design-system/v3/sound', () => ({ suona: vi.fn() }))
vi.mock('@/design-system/v3/haptic', () => ({ vibra: vi.fn() }))
vi.mock('@/design-system/v3/motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/design-system/v3/motion')>()
  return { ...actual, useReducedMotion: () => true }
})

import { NavDesk } from '@/components/ds/NavDesk'

const SEGNALE = { attenzione: false, forte: 'Tutto a posto:', testo: 'nessuna consegna oggi', azione: null }
const CONTEGGI = { rossa: 2, ambra: 4, viola: 1, blu: 2 }

beforeEach(() => {
  pushMock.mockClear()
  signOutMock.mockClear()
})

describe('NavDesk — riga identità + Esci nel footer (O1i-2)', () => {
  it('con identita: avatar iniziali + nome + lab + Esci → conferma → signOut e /login', async () => {
    render(
      <NavDesk
        conteggi={CONTEGGI}
        pilaSelezionata="rossa"
        segnale={SEGNALE}
        identita={{ nome: 'Francesco', lab: 'Lab Formicola' }}
      />
    )

    expect(screen.getByText('F')).toBeInTheDocument()
    expect(screen.getByText('Francesco')).toBeInTheDocument()
    expect(screen.getByText('Lab Formicola')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Esci' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Esci' }))

    await waitFor(() => expect(signOutMock).toHaveBeenCalled())
    expect(pushMock).toHaveBeenCalledWith('/login')
  })

  it('Resta chiude il dialog senza fare logout', async () => {
    render(
      <NavDesk
        conteggi={CONTEGGI}
        pilaSelezionata="rossa"
        segnale={SEGNALE}
        identita={{ nome: 'Francesco', lab: 'Lab Formicola' }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Esci' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Resta' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(signOutMock).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('senza identita: nessun Esci, retro-compatibilità con footer di oggi', () => {
    render(<NavDesk conteggi={CONTEGGI} pilaSelezionata="rossa" segnale={SEGNALE} />)

    expect(screen.queryByText('Esci')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Esci' })).toBeNull()
  })
})
