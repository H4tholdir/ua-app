import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { StatoSDI } from '../../src/types/domain'
import { NotaCreditoButton } from '../../src/components/features/fatture/NotaCreditoButton'

const refreshMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}))

type Overrides = Partial<Parameters<typeof NotaCreditoButton>[0]>

const AZIONI_DOC = [
  { id: 'xml', etichetta: 'Scarica XML', icona: '⬇', href: 'https://x/fattura.xml' },
  { id: 'pdf', etichetta: 'Scarica PDF cortesia', icona: '📄', href: 'https://x/fattura.pdf' },
]

function renderButton(overrides: Overrides = {}) {
  const props = {
    fatturaId: 'fat-1',
    numero: '2026-0012',
    clienteNome: 'Studio Dott. Rossi',
    importo: 102,
    pagata: true,
    lavoroId: 'lav-1',
    statoSdi: 'accettata' as StatoSDI,
    tipoDocumento: 'TD01',
    stornataAt: null as string | null,
    azioni: AZIONI_DOC,
    ...overrides,
  }
  return render(<NotaCreditoButton {...props} />)
}

/** Apre il menu ⋯ e poi il foglio (step 1). */
function openSheet() {
  fireEvent.click(screen.getByRole('button', { name: /azioni documento/i }))
  fireEvent.click(screen.getByRole('menuitem', { name: /emetti nota di credito/i }))
}

describe('NotaCreditoButton — gate visibilità voce danger (variante B + decisione 15/07)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    refreshMock.mockClear()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  function apriMenu() {
    fireEvent.click(screen.getByRole('button', { name: /azioni documento/i }))
  }

  it('fattura stornabile (TD01, accettata, non stornata) → voce danger presente nel menu', () => {
    renderButton()
    apriMenu()
    expect(screen.getByRole('menuitem', { name: /emetti nota di credito/i })).toBeInTheDocument()
  })

  it.each<StatoSDI>(['smtp_inviata', 'pec_consegnata', 'ricevuta_sdi', 'accettata', 'scaduta'])(
    'stato_sdi=%s (ammesso) → voce danger presente',
    (statoSdi) => {
      renderButton({ statoSdi })
      apriMenu()
      expect(screen.getByRole('menuitem', { name: /emetti nota di credito/i })).toBeInTheDocument()
    },
  )

  it.each<StatoSDI>(['draft', 'generata', 'rifiutata'])(
    'stato_sdi=%s (non ammesso) → ⋯ visibile (azioni reali) ma voce danger ASSENTE',
    (statoSdi) => {
      renderButton({ statoSdi })
      apriMenu()
      expect(screen.getByRole('menuitem', { name: /scarica xml/i })).toBeInTheDocument()
      expect(screen.queryByRole('menuitem', { name: /emetti nota di credito/i })).not.toBeInTheDocument()
    },
  )

  it('tipo_documento diverso da TD01 → voce danger assente', () => {
    renderButton({ tipoDocumento: 'TD04' })
    apriMenu()
    expect(screen.queryByRole('menuitem', { name: /emetti nota di credito/i })).not.toBeInTheDocument()
  })

  it('fattura già stornata (stornata_at valorizzato) → voce danger assente', () => {
    renderButton({ stornataAt: '2026-07-15T10:00:00Z' })
    apriMenu()
    expect(screen.queryByRole('menuitem', { name: /emetti nota di credito/i })).not.toBeInTheDocument()
  })

  it('caso limite: nessuna azione E non stornabile → il ⋯ sparisce', () => {
    renderButton({ azioni: [], statoSdi: 'draft' })
    expect(screen.queryByRole('button', { name: /azioni documento/i })).not.toBeInTheDocument()
  })
})

describe('NotaCreditoButton — azioni documento reali nel menu (decisione Francesco 15/07)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    refreshMock.mockClear()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('voci neutre presenti come link con href reale', () => {
    renderButton()
    fireEvent.click(screen.getByRole('button', { name: /azioni documento/i }))
    const xml = screen.getByRole('menuitem', { name: /scarica xml/i })
    expect(xml).toHaveAttribute('href', 'https://x/fattura.xml')
    const pdf = screen.getByRole('menuitem', { name: /scarica pdf cortesia/i })
    expect(pdf).toHaveAttribute('href', 'https://x/fattura.pdf')
  })

  it('voce danger «Emetti nota di credito» è SEMPRE ultima', () => {
    renderButton()
    fireEvent.click(screen.getByRole('button', { name: /azioni documento/i }))
    const voci = screen.getAllByRole('menuitem')
    expect(voci.length).toBe(3)
    expect(voci[voci.length - 1]).toHaveTextContent(/emetti nota di credito/i)
  })

  it('⋯ visibile su fattura NON stornabile purché abbia azioni reali', () => {
    renderButton({ stornataAt: '2026-07-15T10:00:00Z' })
    expect(screen.getByRole('button', { name: /azioni documento/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /azioni documento/i }))
    expect(screen.getAllByRole('menuitem').length).toBe(2)
  })
})

describe('NotaCreditoButton — sheet 2 step', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    refreshMock.mockClear()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('click ⋯ → menu, click voce → apre il foglio con la textarea causale', () => {
    renderButton()
    fireEvent.click(screen.getByRole('button', { name: /azioni documento/i }))
    expect(screen.getByRole('menuitem', { name: /emetti nota di credito/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('menuitem', { name: /emetti nota di credito/i }))
    expect(screen.getByRole('textbox', { name: /causale/i })).toBeInTheDocument()
  })

  it('step 1→2 bloccato: «Continua» disabilitato se causale vuota o solo spazi', () => {
    renderButton()
    openSheet()
    const avanti = screen.getByRole('button', { name: /continua/i })
    expect(avanti).toBeDisabled()

    fireEvent.change(screen.getByRole('textbox', { name: /causale/i }), { target: { value: '   ' } })
    expect(avanti).toBeDisabled()

    fireEvent.change(screen.getByRole('textbox', { name: /causale/i }), {
      target: { value: 'Errore di fatturazione' },
    })
    expect(avanti).toBeEnabled()
  })

  it('submit valido → POST /api/fatture/[id]/nota-credito con {causale} trimmata, poi refresh', async () => {
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ td04_id: 'td04-1', numero: '2026-0003' }),
    })
    renderButton()
    openSheet()
    fireEvent.change(screen.getByRole('textbox', { name: /causale/i }), {
      target: { value: '  Storno su richiesta cliente  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /continua/i }))
    fireEvent.click(screen.getByRole('button', { name: /emetti td04/i }))

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    expect(fetch).toHaveBeenCalledWith(
      '/api/fatture/fat-1/nota-credito',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ causale: 'Storno su richiesta cliente' }),
      }),
    )
    await waitFor(() => expect(refreshMock).toHaveBeenCalled())
  })

  it('409 (non stornabile) → mostra errore e NON chiude il foglio', async () => {
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'Fattura non stornabile' }),
    })
    renderButton()
    openSheet()
    fireEvent.change(screen.getByRole('textbox', { name: /causale/i }), {
      target: { value: 'Storno' },
    })
    fireEvent.click(screen.getByRole('button', { name: /continua/i }))
    fireEvent.click(screen.getByRole('button', { name: /emetti td04/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    // foglio ancora aperto e riutilizzabile: la CTA torna «Emetti TD04»
    // (waitFor: l'alert può comparire mentre la transition è ancora pending
    // e la CTA legge «Emissione…»)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /emetti td04/i })).toBeEnabled(),
    )
    expect(refreshMock).not.toHaveBeenCalled()
  })

  it('errore di rete (fetch rejecta) → messaggio dedicato in-sheet, foglio aperto, nessun refresh', async () => {
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new TypeError('Failed to fetch'))
    renderButton()
    openSheet()
    fireEvent.change(screen.getByRole('textbox', { name: /causale/i }), {
      target: { value: 'Storno' },
    })
    fireEvent.click(screen.getByRole('button', { name: /continua/i }))
    fireEvent.click(screen.getByRole('button', { name: /emetti td04/i }))

    // Messaggio DEDICATO di rete (percorso catch: nessuna res.json()),
    // diverso dall'errore API generico
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/connessione assente/i),
    )
    // foglio ancora aperto e riutilizzabile: la CTA torna «Emetti TD04»
    // (waitFor: l'alert può comparire mentre la transition è ancora pending
    // e la CTA legge «Emissione…»)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /emetti td04/i })).toBeEnabled(),
    )
    expect(refreshMock).not.toHaveBeenCalled()
  })

  it('xml_pending → successo non-bloccante: chiude e fa refresh', async () => {
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ td04_id: 'td04-1', xml_pending: true }),
    })
    renderButton()
    openSheet()
    fireEvent.change(screen.getByRole('textbox', { name: /causale/i }), {
      target: { value: 'Storno' },
    })
    fireEvent.click(screen.getByRole('button', { name: /continua/i }))
    fireEvent.click(screen.getByRole('button', { name: /emetti td04/i }))

    await waitFor(() => expect(refreshMock).toHaveBeenCalled())
  })
})
