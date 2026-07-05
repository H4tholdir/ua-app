import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ConsegnaButton } from '../../src/components/features/lavori/ConsegnaButton'

const CONSEGNA_RESULT_OK = {
  ok: true,
  lavoro_id: 'lav-1',
  numero_lavoro: 'LAV-2026-0001',
  ddc: { numero: 'DDC-2026-0001', url: 'https://x/ddc.pdf', signed_url: 'https://x/ddc.pdf' },
  buono: { numero: 'BUO-2026-0001', url: 'https://x/buono.pdf', signed_url: 'https://x/buono.pdf' },
  fattura: null,
  whatsapp_url: 'https://wa.me/?text=ciao',
  tempo_ms: 42,
}

describe('ConsegnaButton — invio WhatsApp post-consegna', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('dopo consegna riuscita mostra il bottone "Invia messaggio WhatsApp" con il link corretto', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, materiali_carenti: [], mdr_incompleto: false, mdr_campi_mancanti: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => CONSEGNA_RESULT_OK })

    render(<ConsegnaButton lavoroId="lav-1" />)

    fireEvent.click(screen.getByRole('button', { name: /CONSEGNA/i }))

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Invia messaggio WhatsApp/i })).toBeInTheDocument()
    })

    const link = screen.getByRole('link', { name: /Invia messaggio WhatsApp/i })
    expect(link).toHaveAttribute('href', 'https://wa.me/?text=ciao')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('non mostra il bottone WhatsApp prima della consegna', () => {
    render(<ConsegnaButton lavoroId="lav-1" />)
    expect(screen.queryByRole('link', { name: /Invia messaggio WhatsApp/i })).not.toBeInTheDocument()
  })
})
