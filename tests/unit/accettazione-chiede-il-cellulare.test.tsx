// P31 D187 — quinto punto di montaggio del foglio condiviso
// `ChiediCellulareSheet`: la sezione 5 di TabAccettazione («Conferma ricezione
// al dentista» su WhatsApp) aveva lo STESSO gate degli altri quattro punti
// prima del compito 8 (`{clienteCellulare && (...)}` — l'intera sezione
// spariva). Stessa scelta di consegna/scadenzario: il tasto resta e CHIEDE il
// numero, lo SALVA in anagrafica, POI apre WhatsApp (D183/D185).
//
// Il salva→apri (D183) è già provato una volta sola in
// tests/unit/consegna-chiede-il-cellulare.test.tsx — la garanzia vive dentro
// il foglio condiviso, non va riprovata a ogni punto di montaggio; qui si
// riprova comunque l'ordine perché è il quinto punto e la sua stessa
// scoperta (il tasto spariva) è il motivo per cui D187 esiste.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/design-system/v3/sound', () => ({ suona: vi.fn() }))
vi.mock('@/design-system/v3/haptic', () => ({ vibra: vi.fn() }))

import { TabAccettazione } from '@/components/features/lavori/form/TabAccettazione'
import type { Lavoro } from '@/types/domain'

const dataBase: Partial<Lavoro> = {
  numero_cassetta: null,
}

function montaTab(clienteCellulare: string | null) {
  return render(
    <TabAccettazione
      data={dataBase}
      onChange={vi.fn()}
      clienteCellulare={clienteCellulare}
      clienteId="CLI-9"
      clienteNome="Studio Piegari"
      numeroLavoro="214"
    />
  )
}

describe('D187 — TabAccettazione, sezione 5: il tasto non sparisce senza cellulare', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('col cellulare presente: link diretto, nessun tasto che chiede', async () => {
    const user = userEvent.setup()
    montaTab('333 1234567')
    const link = screen.getByRole('link', { name: /apri whatsapp per confermare la ricezione al dentista/i })
    expect(link.getAttribute('href')).toContain('wa.me/393331234567')
    await user.click(link)
    expect(screen.queryByLabelText('Cellulare WhatsApp')).not.toBeInTheDocument()
  })

  it('senza cellulare: il tasto CI SIA LO STESSO (non un link) e apra il foglio', async () => {
    const user = userEvent.setup()
    montaTab(null)
    const tasto = screen.getByRole('button', { name: /apri whatsapp per confermare la ricezione al dentista/i })
    expect(tasto).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /apri whatsapp per confermare la ricezione al dentista/i })
    ).not.toBeInTheDocument()
    await user.click(tasto)
    expect(screen.getByLabelText('Cellulare WhatsApp')).toBeInTheDocument()
    // Riga di contesto (D187): il nome fra virgolette, non "per lo Studio…".
    expect(screen.getByText(/Studio Piegari/)).toBeInTheDocument()
  })

  // 🔑 IL VINCOLO DI D183, riverificato al quinto punto: si salva PRIMA di
  // aprire WhatsApp.
  it('salva il numero PRIMA di aprire WhatsApp', async () => {
    const user = userEvent.setup()
    const ordine: string[] = []
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async () => {
      ordine.push('salvato')
      return new Response('{}', { status: 200 })
    })
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => {
      ordine.push('whatsapp')
      return null
    })
    montaTab(null)
    await user.click(screen.getByRole('button', { name: /apri whatsapp per confermare la ricezione al dentista/i }))
    await user.type(screen.getByLabelText('Cellulare WhatsApp'), '333 1234567')
    await user.click(screen.getByRole('button', { name: /salva e apri whatsapp/i }))
    expect(ordine).toEqual(['salvato', 'whatsapp'])
    expect(fetchSpy.mock.calls[0][0]).toContain('/api/clienti/CLI-9')
    expect(openSpy).toHaveBeenCalledTimes(1)
  })

  // 🔑 IL VALORE CHE DEVE ESSERE RIFIUTATO: se il salvataggio fallisce,
  //    WhatsApp NON si apre.
  it('se il salvataggio fallisce, WhatsApp NON si apre e lo dice', async () => {
    const user = userEvent.setup()
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 500 }))
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    montaTab(null)
    await user.click(screen.getByRole('button', { name: /apri whatsapp per confermare la ricezione al dentista/i }))
    await user.type(screen.getByLabelText('Cellulare WhatsApp'), '333 1234567')
    await user.click(screen.getByRole('button', { name: /salva e apri whatsapp/i }))
    expect(openSpy).not.toHaveBeenCalled()
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
