// P31 Compito 8 — D183/D185: quando il cellulare WhatsApp manca, il tasto
// «Invia messaggio WhatsApp» non sparisce: chiede il numero, lo SALVA in
// anagrafica (PRIMA di aprire WhatsApp), poi apre WhatsApp.
//
// Copie esatte verificate contro il mockup approvato (D186):
// docs/design/mockups/2026-08-03-p31-due-numeri.html + screenshot
// consegna-390-light.png — il brief (.superpowers/sdd/p31-compito-8-brief.md)
// portava ancora «Salva e invia»: qui si usa il testo REALE approvato,
// «Salva e apri WhatsApp», nomina entrambe le cose che succedono nell'ordine
// in cui succedono (D186).
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/design-system/v3/sound', () => ({ suona: vi.fn() }))
vi.mock('@/design-system/v3/haptic', () => ({ vibra: vi.fn() }))

import { FrameConsegnato } from '@/components/features/lavori/consegna-v3/FrameConsegnato'
import type { ConsegnaResult } from '@/types/domain'

const esitoBase: ConsegnaResult = {
  ok: true,
  lavoro_id: 'L1',
  cliente_id: 'CLI-1',
  numero_lavoro: '214',
  ddc: { numero: 'DDC-2026-0214', url: 'x', signed_url: 'https://s/x' },
  buono: { numero: 'BUO-2026-0214', url: 'y', signed_url: 'https://s/y' },
  fattura: null,
  whatsapp_url: 'https://wa.me/393331234567?text=ciao',
  tempo_ms: 900,
}

function montaFrame(esito: ConsegnaResult) {
  return render(
    <FrameConsegnato
      esito={esito}
      lavoroId={esito.lavoro_id}
      descrizione="Corona in disilicato di litio"
      dentista="Studio Piegari"
      onChiudi={vi.fn()}
    />
  )
}

describe('D183 — se il cellulare manca, il tasto lo chiede e lo salva', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('col cellulare presente il tasto apre WhatsApp e NON chiede niente', async () => {
    const user = userEvent.setup()
    montaFrame({ ...esitoBase, whatsapp_url: 'https://wa.me/393331234567?text=x' })
    const link = screen.getByRole('link', { name: /invia messaggio whatsapp/i })
    expect(link).toHaveAttribute('href', 'https://wa.me/393331234567?text=x')
    await user.click(link)
    expect(screen.queryByLabelText('Cellulare WhatsApp')).not.toBeInTheDocument()
  })

  it('senza cellulare il tasto CI SIA LO STESSO e apra il foglio', async () => {
    const user = userEvent.setup()
    montaFrame({ ...esitoBase, whatsapp_url: 'https://wa.me/?text=x' })
    const tasto = screen.getByRole('button', { name: /invia messaggio whatsapp/i })
    expect(tasto).toBeInTheDocument()
    await user.click(tasto)
    expect(screen.getByLabelText('Cellulare WhatsApp')).toBeInTheDocument()
  })

  // 🔑 IL VINCOLO DI D183: si salva PRIMA di aprire WhatsApp.
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
    montaFrame({ ...esitoBase, whatsapp_url: 'https://wa.me/?text=x' })
    await user.click(screen.getByRole('button', { name: /invia messaggio whatsapp/i }))
    await user.type(screen.getByLabelText('Cellulare WhatsApp'), '333 1234567')
    await user.click(screen.getByRole('button', { name: /salva e apri whatsapp/i }))
    expect(ordine).toEqual(['salvato', 'whatsapp'])
    expect(fetchSpy.mock.calls[0][0]).toContain(`/api/clienti/${esitoBase.cliente_id}`)
    expect(openSpy).toHaveBeenCalledTimes(1)
  })

  // 🔑 IL VALORE CHE DEVE ESSERE RIFIUTATO: se il salvataggio fallisce,
  //    WhatsApp NON si apre — o si separano i due fatti.
  it('se il salvataggio fallisce, WhatsApp NON si apre e lo dice', async () => {
    const user = userEvent.setup()
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 500 }))
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    montaFrame({ ...esitoBase, whatsapp_url: 'https://wa.me/?text=x' })
    await user.click(screen.getByRole('button', { name: /invia messaggio whatsapp/i }))
    await user.type(screen.getByLabelText('Cellulare WhatsApp'), '333 1234567')
    await user.click(screen.getByRole('button', { name: /salva e apri whatsapp/i }))
    expect(openSpy).not.toHaveBeenCalled()
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  // 🔴 R1 (revisione finale ramo, 03/08/2026) — DISCRIMINANTE.
  // `ChiediCellulareSheet` è montato INCONDIZIONATAMENTE da `FrameConsegnato`
  // (qui sotto: `chiediAperto` cambia, il componente no) — il suo stato
  // sopravvive alla chiusura. Prima del fix, `setInvio(false)` viveva SOLO
  // nei due rami di errore: dopo un salvataggio RIUSCITO restava `true` per
  // sempre, e il campo non veniva mai azzerato. Riaprendo lo stesso foglio il
  // tasto restava disabilitato con «Un attimo…» a vita, col numero della
  // volta prima già scritto — nessuna via d'uscita se non lasciare la
  // schermata.
  // Prova A — LA PROVA DI R1 in senso stretto: il tasto deve tornare
  // premibile. Riscrive SUBITO il numero dopo la riapertura (senza
  // assumere che il campo sia vuoto: quella è la prova B, sotto, separata
  // apposta perché non deve nascondere questa) e verifica che il tasto non
  // resti bloccato su «Un attimo…».
  it('dopo un salvataggio riuscito, riaperto il foglio il tasto torna DAVVERO premibile (non resta bloccato da un salvataggio precedente)', async () => {
    const user = userEvent.setup()
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }))
    vi.spyOn(window, 'open').mockImplementation(() => null)
    montaFrame({ ...esitoBase, whatsapp_url: 'https://wa.me/?text=x' })

    // Primo giro: apre, scrive, salva con successo → il foglio si chiude.
    await user.click(screen.getByRole('button', { name: /invia messaggio whatsapp/i }))
    await user.type(screen.getByLabelText('Cellulare WhatsApp'), '333 1234567')
    await user.click(screen.getByRole('button', { name: /salva e apri whatsapp/i }))
    await waitFor(() => expect(screen.queryByLabelText('Cellulare WhatsApp')).not.toBeInTheDocument())

    // Secondo giro: riapre lo STESSO foglio (mai smontato dal genitore) e
    // riscrive un numero — indipendentemente da cosa contenesse già il
    // campo (`user.clear` lo garantisce, senza asserire nulla sul suo
    // valore: quello è compito della prova B).
    await user.click(screen.getByRole('button', { name: /invia messaggio whatsapp/i }))
    const campo = screen.getByLabelText('Cellulare WhatsApp') as HTMLInputElement
    await user.clear(campo)
    await user.type(campo, '333 7654321')

    // 🔑 Con del testo nel campo, il tasto deve essere disabilitato SOLO se
    // `invio` fosse davvero in corso — qui non lo è. Prima del fix restava
    // bloccato su «Un attimo…» per sempre, perché `setInvio(false)` non
    // veniva mai richiamato sul percorso di successo.
    expect(screen.queryByText('Un attimo…')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /salva e apri whatsapp/i })).not.toBeDisabled()
  })

  // Prova B — il difetto IN PIÙ che la strada scelta copre: il campo non
  // deve ripresentarsi già scritto dalla volta precedente.
  it('dopo un salvataggio riuscito, riaperto il foglio il campo NON si ripresenta già scritto dalla volta precedente', async () => {
    const user = userEvent.setup()
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }))
    vi.spyOn(window, 'open').mockImplementation(() => null)
    montaFrame({ ...esitoBase, whatsapp_url: 'https://wa.me/?text=x' })

    await user.click(screen.getByRole('button', { name: /invia messaggio whatsapp/i }))
    await user.type(screen.getByLabelText('Cellulare WhatsApp'), '333 1234567')
    await user.click(screen.getByRole('button', { name: /salva e apri whatsapp/i }))
    await waitFor(() => expect(screen.queryByLabelText('Cellulare WhatsApp')).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /invia messaggio whatsapp/i }))
    const campo = screen.getByLabelText('Cellulare WhatsApp') as HTMLInputElement
    expect(campo.value).toBe('')
    expect(screen.getByText('Scrivi il cellulare')).toBeInTheDocument()
  })
})
