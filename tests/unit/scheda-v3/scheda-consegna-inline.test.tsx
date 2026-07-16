// Task 13 — SchedaLavoroV3 apre FlussoConsegna IN PLACE (niente più navigazione
// verso la vecchia pagina `/consegna`, che muore al Task 15) + deep-link
// `?consegna=1` (prop `apriConsegna`, letta da page.tsx). Fixture riusata da
// `tests/unit/SchedaLavoroV3.test.tsx`; mock fetch per-URL riusato da
// `tests/unit/consegna-v3/flusso-consegna.test.tsx` (mai per ordine di chiamata).

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const push = vi.fn()
const refresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
  usePathname: () => '/lavori/lav',
}))

import { SchedaLavoroV3 } from '@/components/features/lavori/scheda-v3/SchedaLavoroV3'
import type { LavoroDettaglio } from '@/types/domain'

function makeLavoro(over: Partial<LavoroDettaglio> = {}): LavoroDettaglio {
  return {
    id: 'lav', numero_lavoro: '2026-0147', stato: 'pronto',
    data_consegna_prevista: '2026-07-20', ora_consegna: '16:00',
    descrizione: 'Corona zirconia', paziente_nome_snapshot: null,
    cliente: { studio_nome: 'Studio Esposito', nome: 'Marco', cognome: 'Esposito' },
    paziente: null, tecnico: { nome: 'Ciro', cognome: 'B', sigla: 'CB' },
    fasi: [], immagini: [], lavorazioni: [], appuntamenti: [], materiali: [], ddc: null,
    laboratorio: { nome: 'Lab', telefono: null },
    ...over,
  } as unknown as LavoroDettaglio
}

const GET_URL = '/api/lavori/lav/precheck-consegna'

// fetch mockato PER URL (riserva test #d), come in flusso-consegna.test.tsx.
function mockFetch(mappa: Record<string, { status: number; json: unknown }>) {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    const match = Object.keys(mappa).find((k) => url.includes(k))
    if (!match) throw new Error(`fetch non mockata: ${url}`)
    const { status, json } = mappa[match]
    return { ok: status < 400, status, json: async () => json } as Response
  }) as unknown as typeof fetch
}

describe('SchedaLavoroV3 — entry point FlussoConsegna in place (Task 13)', () => {
  it('tap CONSEGNA (lavoro consegnabile) → «Consegno?» senza navigazione (push non chiamato)', async () => {
    mockFetch({ [GET_URL]: { status: 200, json: { consegnabile: true, bloccanti: [], warnings: [] } } })
    render(<SchedaLavoroV3 lavoro={makeLavoro({ stato: 'pronto' })} />)

    fireEvent.click(screen.getByRole('button', { name: 'Consegna' }))

    expect(await screen.findByText(/Consegno\?/)).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it('apriConsegna=true → «Consegno?» già visibile al mount (deep-link ?consegna=1)', async () => {
    mockFetch({ [GET_URL]: { status: 200, json: { consegnabile: true, bloccanti: [], warnings: [] } } })
    render(<SchedaLavoroV3 lavoro={makeLavoro({ stato: 'pronto' })} apriConsegna />)

    expect(await screen.findByText(/Consegno\?/)).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it('lavoro non consegnabile → tasto CONSEGNA disabled, tap non apre nulla (comportamento invariato)', () => {
    render(<SchedaLavoroV3 lavoro={makeLavoro({ stato: 'in_lavorazione' })} />)

    const btn = screen.getByRole('button', { name: 'Consegna' })
    expect(btn).toBeDisabled()

    fireEvent.click(btn)

    expect(screen.queryByText(/Consegno\?/)).not.toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  // Fix review finale (finding IMPORTANTE): un bookmark/deep-link
  // `?consegna=1` su un lavoro NON consegnabile (es. già `consegnato`) non
  // deve auto-aprire il rito «Consegno?» — solo il 422 del POST salvava
  // l'utente prima del fix, il gate ora vive già lato client.
  //
  // Discriminante reale (non un `queryByText` sincrono, che sarebbe vero
  // ANCHE col bug: il dialog «Consegno?» compare solo dopo l'`await` del
  // precheck nell'effect di mount di FlussoConsegna, quindi è assente subito
  // dopo `render()` a prescindere dal gate): col bug `consegnaAperta` parte
  // `true` → l'effect di FlussoConsegna chiama SINCRONAMENTE
  // `fetch(precheck-consegna)` prima di ogni `await`. Il fetch mai chiamato è
  // la prova che il flusso non si è aperto.
  it('apriConsegna=true + lavoro NON consegnabile (es. già consegnato) → il flusso non si apre (nessun fetch precheck, «Consegno?» assente)', async () => {
    const fetchSpy = vi.fn()
    global.fetch = fetchSpy as unknown as typeof fetch

    render(
      <SchedaLavoroV3
        lavoro={makeLavoro({ stato: 'consegnato', data_consegna_effettiva: '2026-07-10T00:00:00Z' })}
        apriConsegna
      />
    )

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(screen.queryByText(/Consegno\?/)).not.toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })
})
