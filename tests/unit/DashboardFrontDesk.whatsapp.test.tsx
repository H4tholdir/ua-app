import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DashboardFrontDesk } from '../../src/components/features/dashboard/DashboardFrontDesk'
import type { FrontDeskDashboard } from '../../src/types/domain'

const DATA: FrontDeskDashboard = {
  consegne_oggi: [
    {
      id: 'lav-1',
      numero_lavoro: 'LAV-2026-0001',
      stato: 'pronto',
      tipo_dispositivo: 'cad_cam',
      descrizione: 'Corona',
      data_consegna_prevista: '2026-07-05',
      ora_consegna: null,
      paziente_nome_snapshot: null,
      cliente_display: 'Studio Rossi',
      cliente_telefono: null,
    },
  ],
  ritiri_attesi_oggi: [],
  in_prova_rientro_oggi: [],
  da_contattare: [],
}

describe('DashboardFrontDesk — bottone WhatsApp esplicito post-consegna', () => {
  const originalOpen = window.open

  beforeEach(() => {
    global.fetch = vi.fn()
    window.open = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    window.open = originalOpen
  })

  it('dopo consegna riuscita mostra un bottone WhatsApp esplicito invece di aprire subito la tab', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, whatsapp_url: 'https://wa.me/?text=ciao' }),
    })

    render(<DashboardFrontDesk data={DATA} nomeUtente="Sara" labId="lab-1" />)

    fireEvent.click(screen.getByRole('button', { name: /consegna/i }))

    // Il bottone WhatsApp appare al posto di CONSEGNA — non deve aprirsi da solo
    await screen.findByRole('button', { name: /whatsapp/i })
    expect(window.open).not.toHaveBeenCalled()

    // Solo il click esplicito sul bottone WhatsApp apre la scheda e rimuove la riga
    fireEvent.click(screen.getByRole('button', { name: /whatsapp/i }))

    await waitFor(() => {
      expect(window.open).toHaveBeenCalledWith('https://wa.me/?text=ciao', '_blank', 'noopener,noreferrer')
    })
    expect(screen.queryByText('LAV-2026-0001')).not.toBeInTheDocument()
  })

  it('dopo consegna riuscita senza whatsapp_url rimuove subito la riga', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, whatsapp_url: null }),
    })

    render(<DashboardFrontDesk data={DATA} nomeUtente="Sara" labId="lab-1" />)

    fireEvent.click(screen.getByRole('button', { name: /consegna/i }))

    await waitFor(() => {
      expect(screen.queryByText('Studio Rossi')).not.toBeInTheDocument()
    })
    expect(window.open).not.toHaveBeenCalled()
  })
})
