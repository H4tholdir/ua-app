// Task 8 (O1i-1) — voce «Esci» in fondo a «Tutto il resto» mobile v3 (lacuna
// spec §7.16 colmata). Firma NON tappabile «Sei {nome} · {labNome}» +
// LinkQuieto «Esci» → DialogConferma → sb.auth.signOut() + router.push
// (pattern IDENTICO a UserProfileSheet.tsx:76-80). Mock pattern copiato da
// tests/unit/consegna-v3/flusso-consegna.test.tsx.
// D-1 (collaudo browser 26/07/2026): il logout cambia pagina mentre il `DialogConferma` è
// ancora montato, quindi la sua entry di history è in cima — la destinazione deve
// SOSTITUIRLA (`replace`), non impilarcisi sopra. Col vecchio `router.push` l'entry restava
// sepolta sotto `/login` e tornare indietro costava una pressione MORTA.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'

const pushMock = vi.fn()
const replaceMock = vi.fn()
const signOutMock = vi.fn().mockResolvedValue({})

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock, replace: replaceMock }) }))
vi.mock('@/lib/supabase/browser-anon', () => ({
  getBrowserClient: () => ({ auth: { signOut: signOutMock } }),
}))
vi.mock('@/design-system/v3/sound', () => ({ suona: vi.fn(), initSuoni: vi.fn() }))
vi.mock('@/design-system/v3/haptic', () => ({ vibra: vi.fn() }))
vi.mock('@/design-system/v3/motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/design-system/v3/motion')>()
  return { ...actual, useReducedMotion: () => true }
})

import { TuttoIlResto } from '@/components/features/tutto-il-resto/TuttoIlResto'

beforeEach(() => {
  pushMock.mockClear()
  replaceMock.mockClear()
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
    // v. la nota su `replace` in testa a questo file
    expect(replaceMock).toHaveBeenCalledWith('/login')
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('Resta chiude il dialog senza fare logout', async () => {
    render(<TuttoIlResto sezioni={[]} utenteNome="Francesco" labNome="Lab Formicola" />)

    fireEvent.click(screen.getByRole('button', { name: 'Esci' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Resta' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(signOutMock).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
    expect(replaceMock).not.toHaveBeenCalled()
  })
})
