// Task 14 — le pile e la scheda anteprima montano `FlussoConsegna` IN PLACE:
// due tocchi (TastoConsegnaInline/CONSEGNA → «Consegno?» → POST), MAI più la
// vecchia navigazione a `/lavori/{id}/consegna`. Il refresh nelle pile vive
// SOLO alla chiusura del frame (riserva arch #5): un refresh a 200 smonterebbe
// card+frame a metà countdown. Pattern fetch-mock per-URL copiato da
// `tests/unit/consegna-v3/flusso-consegna.test.tsx`.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PilaAperta } from '@/components/features/pile/PilaAperta'
import { SchedaAnteprima } from '@/components/features/pile/SchedaAnteprima'
import { HomeDesktop } from '@/components/features/home/HomeDesktop'
import type { LavoroPila, PileHome } from '@/lib/dashboard/pile-home'

const push = vi.fn()
const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh, back: vi.fn() }) }))
vi.mock('@/design-system/v3/sound', () => ({ suona: vi.fn() }))
vi.mock('@/design-system/v3/haptic', () => ({ vibra: vi.fn() }))
vi.mock('@/design-system/v3/motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/design-system/v3/motion')>()
  return { ...actual, useReducedMotion: () => true }
})

beforeEach(() => {
  push.mockClear()
  refresh.mockClear()
})

const lav = (numero: string, extra: Partial<LavoroPila> = {}): LavoroPila => ({
  id: `l${numero}`, numero, dentista: 'Dr. Esposito', paziente: 'PZ-0412', tipoLavoro: 'Corona zirconia',
  pill: { testo: 'OGGI · 16:00', famiglia: 'red' }, consegnabile: false, consegna: { data: '2026-07-09', ora: '16:00:00' }, rientro: null,
  fasi: [], tecnico: null, ...extra,
})

const OK_200 = {
  ok: true, lavoro_id: 'l144', numero_lavoro: '144',
  ddc: { numero: 'DDC-2026-0001', url: 'x', signed_url: 'https://s/x' },
  buono: { numero: 'BUO-2026-0001', url: 'y', signed_url: 'https://s/y' },
  fattura: null, whatsapp_url: 'https://wa.me/393331234567?text=x', tempo_ms: 900,
}

// fetch mockato PER URL (riserva test #d): mai per ordine di chiamata.
function mockFetch(mappa: Record<string, { status: number; json: unknown }>) {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    const match = Object.keys(mappa).find((k) => url.includes(k))
    if (!match) throw new Error(`fetch non mockata: ${url}`)
    const { status, json } = mappa[match]
    return { ok: status < 400, status, json: async () => json } as Response
  }) as unknown as typeof fetch
}

describe('PilaAperta — CONSEGNA in-place (Task 14, riserva arch #5)', () => {
  it('tap TastoConsegnaInline prima card consegnabile → «Consegno?» senza push; POST 200 → Consegnato!; chiusura frame → refresh UNA volta', async () => {
    mockFetch({
      '/api/lavori/l144/precheck-consegna': { status: 200, json: { consegnabile: true, bloccanti: [], warnings: [] } },
      '/api/lavori/l144/consegna': { status: 200, json: OK_200 },
    })
    render(<PilaAperta pila="rossa" sub="x" lista={[lav('144', { consegnabile: true }), lav('147', { consegnabile: true })]} />)

    const tasti = screen.getAllByRole('button', { name: 'CONSEGNA' })
    expect(tasti).toHaveLength(1)
    await userEvent.setup().click(tasti[0])

    expect(await screen.findByText(/Consegno\?/)).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()

    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Consegna' }))

    expect(await screen.findByText('Consegnato!')).toBeInTheDocument()
    expect(refresh).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(refresh).toHaveBeenCalledTimes(1)
  })
})

describe('HomeDesktop — keydown globale disattivato con FlussoConsegna aperto (review Task 14)', () => {
  // Il listener globale di HomeDesktop è gated da matchMedia(min-width:1024px)
  // — il mock globale di tests/setup.ts risponde SEMPRE matches:false, che
  // renderebbe questo test vacuo (il handler uscirebbe comunque). Qui si
  // simula il desktop: matches SOLO per la query 1024.
  const matchMediaOriginale = window.matchMedia
  beforeEach(() => {
    window.matchMedia = vi.fn((query: string) => ({
      matches: query.includes('1024'), media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia
  })
  afterEach(() => { window.matchMedia = matchMediaOriginale })

  const pile: PileHome = {
    liste: { rossa: [lav('144', { consegnabile: true }), lav('147')], ambra: [], viola: [], blu: [] },
    sub: { rossa: '', ambra: '', viola: '', blu: '' },
    striscia: { ritardoPiuGrave: null, consegnaOggiNonPronta: null, provaRientroOggi: null, arrivoVecchio: null, fermo: null, consegneOggiTotali: 0, prossimaOra: null },
  }
  const segnale = { attenzione: false, forte: null, testo: '', azione: null }

  it('flusso aperto: Enter NON fa push, ArrowDown NON cambia selezione; a flusso chiuso le scorciatoie tornano vive', async () => {
    mockFetch({ '/api/lavori/l144/precheck-consegna': { status: 200, json: { consegnabile: true, bloccanti: [], warnings: [] } } })
    render(<HomeDesktop pile={pile} pilaSelezionata="rossa" lavoroSelezionato={null} segnale={segnale} />)

    // Sanity: PRIMA di aprire il flusso il listener è vivo (il test non è vacuo).
    fireEvent.keyDown(document.body, { key: 'ArrowDown' })
    expect(push).toHaveBeenCalledWith('/dashboard?pila=rossa&lavoro=l147')
    push.mockClear()

    // Apre il flusso dal CONSEGNA della SchedaAnteprima (schedaLavoro = l144).
    // `hidden: true`: jsdom applica la regola base `.ua-home-desk{display:none}`
    // dello <style> del componente (il breakpoint ≥1024 che la ribalta non
    // esiste in jsdom) → senza il flag le query per ruolo non vedono nulla.
    await userEvent.setup().click(screen.getByRole('button', { name: /consegna/i, hidden: true }))
    expect(await screen.findByText(/Consegno\?/)).toBeInTheDocument()
    push.mockClear() // il click non fa push, ma azzeriamo per isolare i keydown

    // (a) Enter su window → il handler globale NON naviga a /lavori/{id}.
    fireEvent.keyDown(document.body, { key: 'Enter' })
    // (b) ArrowDown → la selezione NON cambia (niente push = l'URL, che
    // POSSIEDE la selezione per ADR B6, resta fermo) e il pannello anteprima
    // resta sullo stesso lavoro.
    fireEvent.keyDown(document.body, { key: 'ArrowDown' })
    expect(push).not.toHaveBeenCalled()
    // Il pannello anteprima resta su n.144 (card in lista + header scheda).
    expect(screen.getAllByText('n.144')).toHaveLength(2)

    // Chiuso il flusso («Non ancora» → onChiudi), le scorciatoie tornano vive.
    // getAll…[0]: DialogConferma rende entrambe le varianti responsive in jsdom.
    fireEvent.click(screen.getAllByRole('button', { name: 'Non ancora' })[0])
    fireEvent.keyDown(document.body, { key: 'ArrowDown' })
    expect(push).toHaveBeenCalledWith('/dashboard?pila=rossa&lavoro=l147')
  })
})

describe('SchedaAnteprima — CONSEGNA in-place (Task 14)', () => {
  it('tap CONSEGNA → chiama onConsegna (l\'host possiede il flusso), MAI più router.push', async () => {
    const onConsegna = vi.fn()
    const lavoro = lav('147', { consegnabile: true })
    render(<SchedaAnteprima lavoro={lavoro} onConsegna={onConsegna} />)

    const consegna = screen.getByRole('button', { name: /consegna/i })
    expect(consegna).toBeEnabled()
    await userEvent.setup().click(consegna)

    expect(onConsegna).toHaveBeenCalledTimes(1)
    expect(push).not.toHaveBeenCalled()
  })
})
