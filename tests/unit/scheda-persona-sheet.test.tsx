// tests/unit/scheda-persona-sheet.test.tsx — Task 12 (ondata A mini-triage):
// SchedaPersonaSheet — dettagli, modifica, disattiva. Fixture da
// task-12-brief.md §Step 1. Mock set copiato da
// tests/unit/tutto-il-resto-esci.test.tsx (LinkQuieto → DialogConferma →
// conferma, stesso shape del rito «Disattiva»), esteso con `refresh` (il
// componente chiama sia `push` per «Produttività» sia `refresh` dopo
// salvataggio/disattivazione).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'

const push = vi.fn()
const refresh = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }))
vi.mock('@/design-system/v3/sound', () => ({ suona: vi.fn() }))
vi.mock('@/design-system/v3/haptic', () => ({ vibra: vi.fn() }))
vi.mock('@/design-system/v3/motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/design-system/v3/motion')>()
  return { ...actual, useReducedMotion: () => true }
})

import { SchedaPersonaSheet } from '@/components/features/tecnici/SchedaPersonaSheet'
import type { TecnicoRow } from '@/components/features/tecnici/PersoneV3'

const persona: TecnicoRow = {
  id: 't1',
  nome: 'Ciro',
  cognome: 'Esposito',
  sigla: 'CE',
  qualifica: null,
  prrc: true,
  compenso_base: null,
  tipo_compenso: null,
}

beforeEach(() => {
  push.mockClear()
  refresh.mockClear()
})

describe('SchedaPersonaSheet (Task 12)', () => {
  it('render con persona → righe Qualifica (dizionario) e PRRC visibili', () => {
    render(
      <SchedaPersonaSheet aperto persona={persona} ruolo="titolare" onChiudi={() => {}} />
    )
    expect(screen.getByText('Qualifica')).toBeInTheDocument()
    expect(screen.getByText('Tecnico')).toBeInTheDocument()
    expect(screen.getByText('PRRC')).toBeInTheDocument()
    expect(screen.getByText('Sì ✓')).toBeInTheDocument()
  })

  it('ruolo tecnico → nessun bottone Modifica/Disattiva/Produttività', () => {
    render(
      <SchedaPersonaSheet aperto persona={persona} ruolo="tecnico" onChiudi={() => {}} />
    )
    expect(screen.queryByRole('button', { name: 'Modifica' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Disattiva' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Produttività' })).not.toBeInTheDocument()
  })

  it('click Disattiva → dialog → conferma → fetch POST /api/tecnici/t1/deactivate', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }))
    const onChiudi = vi.fn()

    render(
      <SchedaPersonaSheet aperto persona={persona} ruolo="titolare" onChiudi={onChiudi} />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Disattiva' }))

    // Sia lo Sheet sia DialogConferma portano `role="dialog"` — disambigua
    // per nome accessibile (il titolo della conferma, non quello dello sheet).
    const dialog = await screen.findByRole('dialog', { name: /Disattivi/ })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Disattiva' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/tecnici/t1/deactivate')
    expect((init as RequestInit).method).toBe('POST')

    await waitFor(() => expect(refresh).toHaveBeenCalled())
    await waitFor(() => expect(onChiudi).toHaveBeenCalled())
  })

  it('click Disattiva → dialog → conferma → 500 → errore visibile DENTRO il dialog (nota), dialog resta aperto, niente refresh', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Errore server' }), { status: 500 })
    )
    const onChiudi = vi.fn()

    render(
      <SchedaPersonaSheet aperto persona={persona} ruolo="titolare" onChiudi={onChiudi} />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Disattiva' }))

    const dialog = await screen.findByRole('dialog', { name: /Disattivi/ })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Disattiva' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    // Il messaggio d'errore deve essere visibile DENTRO il dialog ancora
    // aperto (prop `nota` di DialogConferma), non solo in un `role="alert"`
    // dello sheet che il dialog, montato dopo come portal allo stesso
    // zIndex, coprirebbe.
    const erroreNelDialog = await within(dialog).findByRole('alert')
    expect(erroreNelDialog).toHaveTextContent('Errore server')

    // Il dialog resta aperto — la conferma non deve sparire su fallimento.
    expect(screen.getByRole('dialog', { name: /Disattivi/ })).toBeInTheDocument()

    expect(refresh).not.toHaveBeenCalled()
    expect(onChiudi).not.toHaveBeenCalled()
  })

  it('fallimento → Annulla → riapri Disattiva → la nota stantia NON riappare finché non si riclicca', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Errore server' }), { status: 500 })
    )

    render(
      <SchedaPersonaSheet aperto persona={persona} ruolo="titolare" onChiudi={() => {}} />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Disattiva' }))
    const primoDialog = await screen.findByRole('dialog', { name: /Disattivi/ })
    fireEvent.click(within(primoDialog).getByRole('button', { name: 'Disattiva' }))
    await within(primoDialog).findByRole('alert')

    // Annulla: il dialog chiude, il backstop nello sheet mostra l'errore.
    fireEvent.click(within(primoDialog).getByRole('button', { name: 'Annulla' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Errore server')

    // Riapri: la `nota` stantia non deve ricomparire dentro il dialog appena
    // riaperto, prima che l'utente riclicchi «Disattiva».
    fireEvent.click(screen.getByRole('button', { name: 'Disattiva' }))
    const secondoDialog = await screen.findByRole('dialog', { name: /Disattivi/ })
    expect(within(secondoDialog).queryByRole('alert')).not.toBeInTheDocument()
  })
})
