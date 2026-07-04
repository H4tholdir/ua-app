import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ReteDettaglio } from '../../src/components/features/rete/ReteDettaglio'

const MEMBRO_ADMIN = {
  laboratorioId: 'lab-1',
  ruolo: 'admin_rete' as const,
  joinedAt: '2026-01-01T00:00:00Z',
  nome: 'Lab Admin',
  citta: 'Firenze',
  piano: 'studio',
}

const MEMBRO_NORMALE = {
  laboratorioId: 'lab-2',
  ruolo: 'membro' as const,
  joinedAt: '2026-02-01T00:00:00Z',
  nome: 'Lab Membro',
  citta: 'Pisa',
  piano: 'lab',
}

describe('ReteDettaglio', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function fetchMock() {
    return fetch as unknown as ReturnType<typeof vi.fn>
  }

  it('vista admin: mostra bottone Rimuovi sui membri normali ma non sul lab admin', () => {
    render(
      <ReteDettaglio
        reteId="rete-1"
        isAdminLab={true}
        adminLaboratorioId="lab-1"
        membriIniziali={[MEMBRO_ADMIN, MEMBRO_NORMALE]}
        invitiPendentiIniziali={[]}
      />
    )

    expect(screen.queryByLabelText('Rimuovi Lab Admin dalla rete')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Rimuovi Lab Membro dalla rete')).toBeInTheDocument()
  })

  it('vista membro (sola lettura): nessun bottone Rimuovi, nessuna sezione inviti', () => {
    render(
      <ReteDettaglio
        reteId="rete-1"
        isAdminLab={false}
        adminLaboratorioId="lab-1"
        membriIniziali={[MEMBRO_ADMIN, MEMBRO_NORMALE]}
        invitiPendentiIniziali={[]}
      />
    )

    expect(screen.queryByLabelText('Rimuovi Lab Membro dalla rete')).not.toBeInTheDocument()
    expect(screen.queryByText('Inviti in attesa')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+ Invita laboratorio' })).not.toBeInTheDocument()
  })

  it('rimuovere un membro chiama DELETE e ricarica la pagina', async () => {
    fetchMock().mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    })

    render(
      <ReteDettaglio
        reteId="rete-1"
        isAdminLab={true}
        adminLaboratorioId="lab-1"
        membriIniziali={[MEMBRO_ADMIN, MEMBRO_NORMALE]}
        invitiPendentiIniziali={[]}
      />
    )

    fireEvent.click(screen.getByLabelText('Rimuovi Lab Membro dalla rete'))

    await waitFor(() => expect(reloadMock).toHaveBeenCalledTimes(1))

    const [url, options] = fetchMock().mock.calls[0]
    expect(url).toBe('/api/rete/rete-1/membri/lab-2')
    expect(options.method).toBe('DELETE')
  })

  it('mostra gli inviti pendenti con bottone Revoca (vista admin)', () => {
    render(
      <ReteDettaglio
        reteId="rete-1"
        isAdminLab={true}
        adminLaboratorioId="lab-1"
        membriIniziali={[MEMBRO_ADMIN]}
        invitiPendentiIniziali={[{ id: 'invito-1', email: 'mario@lab.it', expiresAt: '2026-08-01T00:00:00Z' }]}
      />
    )

    expect(screen.getByText('mario@lab.it')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Revoca' })).toBeInTheDocument()
  })

  it('revocare un invito chiama DELETE e ricarica la pagina', async () => {
    fetchMock().mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    })

    render(
      <ReteDettaglio
        reteId="rete-1"
        isAdminLab={true}
        adminLaboratorioId="lab-1"
        membriIniziali={[MEMBRO_ADMIN]}
        invitiPendentiIniziali={[{ id: 'invito-1', email: 'mario@lab.it', expiresAt: '2026-08-01T00:00:00Z' }]}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Revoca' }))

    await waitFor(() => expect(reloadMock).toHaveBeenCalledTimes(1))

    const [url, options] = fetchMock().mock.calls[0]
    expect(url).toBe('/api/rete/rete-1/inviti/invito-1')
    expect(options.method).toBe('DELETE')
  })
})
