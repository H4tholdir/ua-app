import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TabProve } from '../../src/components/features/lavori/TabProve'

// N12/Task 17 (spec P0-PERF R2): TabProve non aveva alcun caller vivo verso
// POST /api/lavori/[id]/prove — il body mancava `action` (400 "action non
// valida") e il rientro chiamava PATCH su una route inesistente
// (/prove/[provaId]/rientro). Questi test bloccano la regressione: entrambi
// i flussi devono POSTare su /api/lavori/[id]/prove col contratto reale
// letto da src/app/api/lavori/[id]/prove/route.ts.

const PROVA_PENDENTE = {
  id: 'prova-1',
  numero_prova: 1,
  data_uscita: '2026-07-10',
  data_rientro_prevista: '2026-07-15',
  data_rientro_effettiva: null,
  esito: null,
  note_dentista: null,
}

function fetchMock() {
  return fetch as unknown as ReturnType<typeof vi.fn>
}

// Task 17 review round 1: la GET /api/lavori/[id]/prove ritorna un ARRAY
// GREZZO (route.ts riga ~94: `return NextResponse.json(data)`, non
// `{ prove: data }`). Il mock deve rispecchiare questo contratto reale —
// wrapparlo in `{ prove }` nascondeva il bug del componente (che leggeva
// `json.prove ?? []`, sempre `[]` contro il payload vero).
function mockGetProve(prove: unknown[]) {
  fetchMock().mockResolvedValueOnce({ ok: true, json: async () => prove })
}

describe('TabProve', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('manda in prova: POST su /api/lavori/[id]/prove con action="manda_in_prova" e i campi del form', async () => {
    mockGetProve([])
    fetchMock().mockResolvedValueOnce({ ok: true, json: async () => ({ prova: { id: 'prova-1' }, stato: 'in_prova_esterna' }) })
    // reloadProve() dopo il successo rifà una GET: copriamola con un fallback
    // per evitare un fetch non mockato nell'effect (act()-warning/flakiness).
    // Array grezzo — stesso contratto reale della GET (v. commento su mockGetProve).
    fetchMock().mockResolvedValue({ ok: true, json: async () => [] })

    render(<TabProve lavoroId="lavoro-1" statoLavoro="in_lavorazione" />)

    await waitFor(() => expect(screen.getByRole('button', { name: /manda il lavoro in prova/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /manda il lavoro in prova/i }))

    fireEvent.change(screen.getByLabelText(/Data rientro prevista/i), { target: { value: '2026-07-20' } })
    fireEvent.change(screen.getByLabelText(/Istruzioni per il dentista/i), { target: { value: 'Verifica margine' } })
    fireEvent.click(screen.getByRole('button', { name: /Conferma — manda in prova/i }))

    await waitFor(() => expect(fetchMock().mock.calls.length).toBeGreaterThanOrEqual(2))

    const postCall = fetchMock().mock.calls.find(([, options]) => options?.method === 'POST')
    expect(postCall).toBeTruthy()
    const [url, options] = postCall!
    expect(url).toBe('/api/lavori/lavoro-1/prove')
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' })
    const body = JSON.parse(options.body as string)
    expect(body).toEqual({
      action: 'manda_in_prova',
      data_rientro_prevista: '2026-07-20',
      istruzioni: 'Verifica margine',
    })
  })

  it('registra rientro: POST (non PATCH) su /api/lavori/[id]/prove con action="registra_rientro", prova_id ed esito', async () => {
    mockGetProve([PROVA_PENDENTE])
    fetchMock().mockResolvedValueOnce({ ok: true, json: async () => ({ esito: 'ok', stato: 'in_lavorazione' }) })
    // reloadProve() dopo il successo rifà una GET: copriamola con un fallback
    // per evitare un fetch non mockato nell'effect (act()-warning/flakiness).
    // Array grezzo — stesso contratto reale della GET (v. commento su mockGetProve).
    fetchMock().mockResolvedValue({ ok: true, json: async () => [] })

    render(<TabProve lavoroId="lavoro-1" statoLavoro="in_prova_esterna" />)

    await waitFor(() => expect(screen.getByRole('group', { name: /esito prova/i })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /Approvato/i }))
    fireEvent.change(screen.getByLabelText(/Note dentista/i), { target: { value: 'Tutto ok' } })
    fireEvent.click(screen.getByRole('button', { name: /Conferma rientro/i }))

    await waitFor(() => expect(fetchMock().mock.calls.length).toBeGreaterThanOrEqual(2))

    const postCall = fetchMock().mock.calls.find(([, options]) => options?.method === 'POST')
    expect(postCall).toBeTruthy()
    const [url, options] = postCall!
    expect(url).toBe('/api/lavori/lavoro-1/prove')
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' })
    const body = JSON.parse(options.body as string)
    expect(body).toEqual({
      action: 'registra_rientro',
      prova_id: 'prova-1',
      esito: 'ok',
      note_dentista: 'Tutto ok',
    })
  })

  it('errore server (rientro non-ok) mostra "Errore <status>" e non richiama onRientroRegistrato', async () => {
    mockGetProve([PROVA_PENDENTE])
    fetchMock().mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ error: 'transizione non consentita' }) })
    const onRientroRegistrato = vi.fn()

    render(<TabProve lavoroId="lavoro-1" statoLavoro="in_prova_esterna" onRientroRegistrato={onRientroRegistrato} />)

    await waitFor(() => expect(screen.getByRole('group', { name: /esito prova/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Approvato/i }))
    fireEvent.click(screen.getByRole('button', { name: /Conferma rientro/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Errore 409')
    expect(onRientroRegistrato).not.toHaveBeenCalled()
  })
})
