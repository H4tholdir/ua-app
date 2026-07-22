import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SceltaHome } from '@/components/features/impostazioni/SceltaHome'

// Riga «La tua home» (Task 17) — 3 radio v2.3 in /impostazioni → Aspetto.
// Al cambio: PATCH /api/impostazioni/preferenze {home}. La radio NON deve mai
// mentire sullo stato SALVATO: un PATCH non-ok riporta la selezione al valore
// precedente (constraint d'ondata #4).

const ETICHETTE = {
  due_stanze: 'Le due stanze — pile e parete',
  pile: 'Solo le pile — che cosa urge',
  parete: 'Solo la parete — dove stanno',
} as const

describe('SceltaHome — riga «La tua home» (Task 17)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('mostra le 3 opzioni e segna quella iniziale (default due_stanze)', () => {
    render(<SceltaHome iniziale="due_stanze" />)
    const due = screen.getByRole('radio', { name: ETICHETTE.due_stanze }) as HTMLInputElement
    const pile = screen.getByRole('radio', { name: ETICHETTE.pile }) as HTMLInputElement
    const parete = screen.getByRole('radio', { name: ETICHETTE.parete }) as HTMLInputElement
    expect(due.checked).toBe(true)
    expect(pile.checked).toBe(false)
    expect(parete.checked).toBe(false)
  })

  it('rispetta il valore iniziale letto server-side (pile)', () => {
    render(<SceltaHome iniziale="pile" />)
    expect((screen.getByRole('radio', { name: ETICHETTE.pile }) as HTMLInputElement).checked).toBe(true)
  })

  it('avvertenza quieta sotto la terza opzione: le pile restano raggiungibili da ☰ → I lavori', () => {
    render(<SceltaHome iniziale="due_stanze" />)
    expect(screen.getByText(/Le pile restano raggiungibili da ☰ → I lavori/)).toBeInTheDocument()
  })

  it('cambio riuscito: PATCH {home} corretto, valore aggiornato, feedback «Salvato»', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ esito: 'ok' }), { status: 200 })
    )
    render(<SceltaHome iniziale="due_stanze" />)
    fireEvent.click(screen.getByRole('radio', { name: ETICHETTE.parete }))

    await waitFor(() => expect(screen.getByText(/Salvato/)).toBeInTheDocument())
    expect((screen.getByRole('radio', { name: ETICHETTE.parete }) as HTMLInputElement).checked).toBe(true)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/impostazioni/preferenze')
    expect(init?.method).toBe('PATCH')
    expect(JSON.parse(init?.body as string)).toEqual({ home: 'parete' })
  })

  it('PATCH non-ok: la radio TORNA al valore precedente (non mente) + avviso d’errore', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ errore: 'preferenza_fallita' }), { status: 500 })
    )
    render(<SceltaHome iniziale="due_stanze" />)
    fireEvent.click(screen.getByRole('radio', { name: ETICHETTE.parete }))

    await waitFor(() =>
      expect((screen.getByRole('radio', { name: ETICHETTE.due_stanze }) as HTMLInputElement).checked).toBe(true)
    )
    expect((screen.getByRole('radio', { name: ETICHETTE.parete }) as HTMLInputElement).checked).toBe(false)
    expect(screen.getByText(/non .*salvat|riprova|errore/i)).toBeInTheDocument()
  })

  it('fetch che rigetta (rete giù): rollback + avviso, nessun crash', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))
    render(<SceltaHome iniziale="pile" />)
    fireEvent.click(screen.getByRole('radio', { name: ETICHETTE.parete }))

    await waitFor(() =>
      expect((screen.getByRole('radio', { name: ETICHETTE.pile }) as HTMLInputElement).checked).toBe(true)
    )
    expect((screen.getByRole('radio', { name: ETICHETTE.parete }) as HTMLInputElement).checked).toBe(false)
  })
})
