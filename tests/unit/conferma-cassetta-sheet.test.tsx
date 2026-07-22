import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ConfermaCassettaSheet } from '@/components/features/pile/ConfermaCassettaSheet'

// Lo sheet ora chiama useRouter().refresh() per ricaricare le chip dopo un 409
// (refetch delle suggerite, servite dal server component /lavori). Fuori da un
// App Router reale useRouter() lancia un invariant error → va mockato.
const refreshMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}))

const lavoro = { id: 'l1', numero: '151', tipoLavoro: 'Protesi totale', dentista: 'Dr. Esposito' }
// Chip con id DIVERSO dal nome: così l'asserzione sul body ({cassetta_id:'cass-7'})
// non può passare per sbaglio leggendo l'etichetta 'C7' (discriminante reale).
const suggerite = [
  { id: 'cass-7', nome: 'C7' },
  { id: 'cass-15', nome: 'C15' },
]

describe('ConfermaCassettaSheet', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    refreshMock.mockClear()
  })

  it('CTA disabilitata senza scelta; chip la abilita col nome', () => {
    render(<ConfermaCassettaSheet aperto onChiudi={() => {}} lavoro={lavoro} suggerite={suggerite} onConfermato={() => {}} />)
    expect(screen.getByRole('button', { name: /^Conferma$/ })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /C7/ }))
    expect(screen.getByRole('button', { name: 'Conferma in C7' })).toBeEnabled()
  })

  it('conferma con chip → POST /cassetta {cassetta_id} e onConfermato', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ esito: 'ok', nome: 'C7' }), { status: 200 })
    )
    const onConfermato = vi.fn()
    render(<ConfermaCassettaSheet aperto onChiudi={() => {}} lavoro={lavoro} suggerite={suggerite} onConfermato={onConfermato} />)
    fireEvent.click(screen.getByRole('button', { name: /C7/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Conferma in C7' }))
    await waitFor(() => expect(onConfermato).toHaveBeenCalledWith('l1'))
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/lavori/l1/cassetta')
    expect((init as RequestInit).method).toBe('POST')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ cassetta_id: 'cass-7' })
  })

  it('conferma con campo libero → POST /cassetta {nome} (trim), MAI cassetta_id', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ esito: 'ok', nome: 'C99' }), { status: 200 })
    )
    const onConfermato = vi.fn()
    render(<ConfermaCassettaSheet aperto onChiudi={() => {}} lavoro={lavoro} suggerite={suggerite} onConfermato={onConfermato} />)
    fireEvent.change(screen.getByLabelText('O scrivine una nuova'), { target: { value: '  C99  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Conferma in C99' }))
    await waitFor(() => expect(onConfermato).toHaveBeenCalledWith('l1'))
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/lavori/l1/cassetta')
    expect((init as RequestInit).method).toBe('POST')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ nome: 'C99' })
  })

  it('«Conferma senza cassetta» → nessuna chiamata all\'endpoint cassetta, onConfermato subito', () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const onConfermato = vi.fn()
    render(<ConfermaCassettaSheet aperto onChiudi={() => {}} lavoro={lavoro} suggerite={[]} onConfermato={onConfermato} />)
    fireEvent.click(screen.getByRole('button', { name: 'Conferma senza cassetta' }))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(onConfermato).toHaveBeenCalledWith('l1')
  })

  it('409 occupata → riga bloccante «La {nome} è appena stata occupata» + refresh delle chip, NIENTE onConfermato', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ errore: 'occupata', nome: 'C7' }), { status: 409 })
    )
    const onConfermato = vi.fn()
    render(<ConfermaCassettaSheet aperto onChiudi={() => {}} lavoro={lavoro} suggerite={suggerite} onConfermato={onConfermato} />)
    fireEvent.click(screen.getByRole('button', { name: /C7/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Conferma in C7' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('La C7 è appena stata occupata'))
    expect(refreshMock).toHaveBeenCalled()
    expect(onConfermato).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('errore generico (500) → messaggio di errore, NIENTE onConfermato, NIENTE refresh', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'boom' }), { status: 500 })
    )
    const onConfermato = vi.fn()
    render(<ConfermaCassettaSheet aperto onChiudi={() => {}} lavoro={lavoro} suggerite={suggerite} onConfermato={onConfermato} />)
    fireEvent.click(screen.getByRole('button', { name: /C7/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Conferma in C7' }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(onConfermato).not.toHaveBeenCalled()
    expect(refreshMock).not.toHaveBeenCalled()
  })

  it('durante il salvataggio, «Conferma senza cassetta» e le chip sono guardate — niente doppio input (review finale 20/07)', async () => {
    let risolviFetch: (value: Response) => void = () => {}
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => new Promise((resolve) => { risolviFetch = resolve })
    )
    const onConfermato = vi.fn()
    render(<ConfermaCassettaSheet aperto onChiudi={() => {}} lavoro={lavoro} suggerite={suggerite} onConfermato={onConfermato} />)

    fireEvent.click(screen.getByRole('button', { name: /C7/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Conferma in C7' })) // avvia il POST → salvando=true, fetch sospesa

    // Mentre il POST è in volo: la via di fuga e un tap su un'altra chip non
    // devono fare nulla — prima del fix mancava il guard `salvando` su entrambi.
    fireEvent.click(screen.getByRole('button', { name: 'Conferma senza cassetta' }))
    fireEvent.click(screen.getByRole('button', { name: /C15/ }))

    expect(onConfermato).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Conferma in C7' })).toBeInTheDocument() // selezione invariata

    risolviFetch(new Response(JSON.stringify({ esito: 'ok', nome: 'C7' }), { status: 200 }))
    await waitFor(() => expect(onConfermato).toHaveBeenCalledWith('l1'))
    expect(onConfermato).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('reset chiavato su lavoro.id: un host che rirenda con un NUOVO oggetto letterale ma stesso id non perde la selezione; un cambio di id invece resetta', () => {
    const { rerender } = render(
      <ConfermaCassettaSheet aperto onChiudi={() => {}} lavoro={{ ...lavoro }} suggerite={suggerite} onConfermato={() => {}} />
    )
    fireEvent.click(screen.getByRole('button', { name: /C7/ }))
    expect(screen.getByRole('button', { name: 'Conferma in C7' })).toBeEnabled()

    rerender(
      <ConfermaCassettaSheet aperto onChiudi={() => {}} lavoro={{ ...lavoro }} suggerite={suggerite} onConfermato={() => {}} />
    )
    expect(screen.getByRole('button', { name: 'Conferma in C7' })).toBeEnabled()

    rerender(
      <ConfermaCassettaSheet
        aperto
        onChiudi={() => {}}
        lavoro={{ id: 'l2', numero: '152', tipoLavoro: 'Corona', dentista: 'Dr. Russo' }}
        suggerite={suggerite}
        onConfermato={() => {}}
      />
    )
    expect(screen.getByRole('button', { name: /^Conferma$/ })).toBeDisabled()
  })
})
