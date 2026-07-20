import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RichiestaClientForm } from '../../src/components/features/portale/RichiestaClientForm'

// A9: la schermata di successo NON deve più contraddirsi affermando sia che
// la richiesta è "ricevuta" sia che il laboratorio "contatterà per la
// conferma" — un solo paragrafo coerente.
describe('RichiestaClientForm — copy schermata successo (A9)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  async function submitForm() {
    render(
      <RichiestaClientForm
        token="tok-123"
        clienteId="cli-1"
        labNome="Odontolab Rossi"
        labLogoUrl={null}
        nomeCliente="Studio Bianchi"
      />
    )

    fireEvent.change(screen.getByLabelText('Tipo di lavoro'), { target: { value: 'protesi_fissa' } })
    fireEvent.change(screen.getByLabelText('Codice paziente'), { target: { value: 'MR-2026' } })
    fireEvent.change(screen.getByLabelText('Data consegna richiesta'), { target: { value: '2026-12-01' } })

    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ ok: true, numero_lavoro: '00042' }),
    })

    fireEvent.click(screen.getByRole('button', { name: /Invia richiesta al laboratorio/ }))

    await waitFor(() => expect(screen.getByText('Richiesta inviata!')).toBeTruthy())
  }

  it('mostra un solo paragrafo coerente senza contraddire "ricevuto" vs "conferma futura"', async () => {
    await submitForm()

    expect(screen.getByText((_, node) => node?.textContent === 'Il laboratorio Odontolab Rossi la esaminerà e ti contatterà per la conferma.')).toBeTruthy()
    expect(screen.queryByText(/ha ricevuto la tua richiesta/)).toBeNull()
    expect(screen.queryByText(/^Ti contatteranno per la conferma\.$/)).toBeNull()
  })

  // A7: dalla schermata di successo del form richiesta, il dentista deve poter
  // tornare al portale di stato lavori senza dover recuperare il secondo URL.
  it('mostra un link di ritorno al portale stato lavori (A7)', async () => {
    await submitForm()

    const link = screen.getByRole('link', { name: '← Torna allo stato lavori' })
    expect(link.getAttribute('href')).toBe('/portale/tok-123')
  })
})
