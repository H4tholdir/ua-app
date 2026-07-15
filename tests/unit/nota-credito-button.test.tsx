import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { StatoSDI } from '../../src/types/domain'
import { NotaCreditoButton } from '../../src/components/features/fatture/NotaCreditoButton'

const refreshMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}))

type Overrides = Partial<Parameters<typeof NotaCreditoButton>[0]>

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
    ...overrides,
  }
  return render(<NotaCreditoButton {...props} />)
}

/** Apre il menu ⋯ e poi il foglio (step 1). */
function openSheet() {
  fireEvent.click(screen.getByRole('button', { name: /azioni documento/i }))
  fireEvent.click(screen.getByRole('menuitem', { name: /emetti nota di credito/i }))
}

describe('NotaCreditoButton — gate visibilità (variante B)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    refreshMock.mockClear()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('fattura stornabile (TD01, accettata, non stornata) → mostra il trigger ⋯', () => {
    renderButton()
    expect(screen.getByRole('button', { name: /azioni documento/i })).toBeInTheDocument()
  })

  it.each<StatoSDI>(['smtp_inviata', 'pec_consegnata', 'ricevuta_sdi', 'accettata', 'scaduta'])(
    'stato_sdi=%s (ammesso) → trigger visibile',
    (statoSdi) => {
      renderButton({ statoSdi })
      expect(screen.getByRole('button', { name: /azioni documento/i })).toBeInTheDocument()
    },
  )

  it.each<StatoSDI>(['draft', 'generata', 'rifiutata'])(
    'stato_sdi=%s (non ammesso) → nessun trigger',
    (statoSdi) => {
      renderButton({ statoSdi })
      expect(screen.queryByRole('button', { name: /azioni documento/i })).not.toBeInTheDocument()
    },
  )

  it('tipo_documento diverso da TD01 → nessun trigger', () => {
    renderButton({ tipoDocumento: 'TD04' })
    expect(screen.queryByRole('button', { name: /azioni documento/i })).not.toBeInTheDocument()
  })

  it('fattura già stornata (stornata_at valorizzato) → nessun trigger', () => {
    renderButton({ stornataAt: '2026-07-15T10:00:00Z' })
    expect(screen.queryByRole('button', { name: /azioni documento/i })).not.toBeInTheDocument()
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
    // foglio ancora aperto: la CTA di conferma è ancora nel DOM
    expect(screen.getByRole('button', { name: /emetti td04/i })).toBeInTheDocument()
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
