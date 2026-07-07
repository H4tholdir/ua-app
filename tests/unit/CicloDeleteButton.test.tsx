import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const pushMock = vi.fn()
const refreshMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}))

import { CicloDeleteButton } from '../../src/components/features/cicli/CicloDeleteButton'

describe('CicloDeleteButton', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    pushMock.mockClear()
    refreshMock.mockClear()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('conferma negata (window.confirm → false) → nessuna fetch', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<CicloDeleteButton cicloId="ciclo-1" cicloNome="CNC Corona" />)
    fireEvent.click(screen.getByRole('button', { name: /elimina ciclo/i }))
    expect(fetch).not.toHaveBeenCalled()
  })

  it('conferma accettata, 200 → DELETE /api/cicli/[id] e redirect a /cicli-produzione', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })

    render(<CicloDeleteButton cicloId="ciclo-1" cicloNome="CNC Corona" />)
    fireEvent.click(screen.getByRole('button', { name: /elimina ciclo/i }))

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/cicli-produzione'))
    expect(fetch).toHaveBeenCalledWith('/api/cicli/ciclo-1', { method: 'DELETE' })
    expect(refreshMock).toHaveBeenCalled()
  })

  it('409 (ciclo referenziato) → alert con il messaggio del server, nessun redirect', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Ciclo in uso da 2 lavori — impossibile eliminare. Disattivalo per nasconderlo dalle nuove assegnazioni.' }),
    })

    render(<CicloDeleteButton cicloId="ciclo-1" cicloNome="CNC Corona" />)
    fireEvent.click(screen.getByRole('button', { name: /elimina ciclo/i }))

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Ciclo in uso da 2 lavori — impossibile eliminare. Disattivalo per nasconderlo dalle nuove assegnazioni.'))
    expect(pushMock).not.toHaveBeenCalled()
  })
})
