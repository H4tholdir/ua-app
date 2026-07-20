// Task 8 (O1i-1) — voce «Esci» in fondo a «Tutto il resto» mobile v3 (lacuna
// spec §7.16 colmata). Firma NON tappabile «Sei {nome} · {labNome}» +
// LinkQuieto «Esci» → DialogConferma → sb.auth.signOut() + router.push
// (pattern IDENTICO a UserProfileSheet.tsx:76-80). Mock pattern copiato da
// tests/unit/consegna-v3/flusso-consegna.test.tsx.
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

import { TuttoIlResto } from '@/components/features/tutto-il-resto/TuttoIlResto'

beforeEach(() => {
  pushMock.mockClear()
  signOutMock.mockClear()
})

describe('TuttoIlResto — Esci (O1i-1)', () => {
  it('firma non tappabile + Esci con conferma → signOut e /login', async () => {
    render(<TuttoIlResto sezioni={[]} utenteNome="Francesco" labNome="Lab Formicola" />)

    expect(screen.getByText('Sei Francesco · Lab Formicola')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Esci' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Esci' }))

    await waitFor(() => expect(signOutMock).toHaveBeenCalled())
    expect(pushMock).toHaveBeenCalledWith('/login')
  })

  it('Resta chiude il dialog senza fare logout', async () => {
    render(<TuttoIlResto sezioni={[]} utenteNome="Francesco" labNome="Lab Formicola" />)

    fireEvent.click(screen.getByRole('button', { name: 'Esci' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Resta' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(signOutMock).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
  })
})
