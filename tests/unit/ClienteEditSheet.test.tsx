import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ClienteEditSheet, type ClienteEditData } from '@/components/features/clienti/ClienteEditSheet'

// P31/Compito 7 — passo 3-bis/3-ter del brief.
//
// 🔑 Il pannello riceve `cliente` da una catena di QUATTRO anelli (select in
// `clienti/[id]/page.tsx`, tipo `ClienteDettaglio`, oggetto passato a
// `ClienteModificaButton`, select della GET singolo cliente): se anche uno
// solo di quegli anelli non porta `cellulare_whatsapp`, questo pannello lo
// riceve `null`/undefined, il form parte da stringa vuota, e SALVARE
// (`form.cellulare_whatsapp.trim() || null`, riga 133) CANCELLA un numero già
// scritto in banca dati — senza errore, senza avviso. La prova sotto è
// quella che discrimina questo caso: non basta che il campo si salvi quando
// lo si tocca, deve restare intatto quando NON lo si tocca.

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

const clienteBase: ClienteEditData = {
  id: 'cli-1',
  studio_nome: 'Studio Rossi',
  nome: 'Mario',
  cognome: 'Rossi',
  telefono: '02 1234567',
  cellulare_whatsapp: null,
  email: 'studio@esempio.it',
  indirizzo: null,
  cap: null,
  citta: null,
  provincia: null,
  partita_iva: null,
  codice_fiscale: null,
  codice_sdi: null,
  pec: null,
  listino_numero: 1,
  sconto_percentuale: 0,
  modalita_pagamento: null,
  note: null,
}

describe('ClienteEditSheet — i due numeri (P31, Compito 7)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function fetchMock() {
    return fetch as unknown as ReturnType<typeof vi.fn>
  }

  it('D184 — il pannello chiede ENTRAMBI i numeri, stesso peso visivo', () => {
    render(<ClienteEditSheet cliente={clienteBase} isOpen onClose={() => {}} />)
    expect(screen.getByLabelText('Telefono dello studio')).toBeInTheDocument()
    expect(screen.getByLabelText('Cellulare WhatsApp')).toBeInTheDocument()
  })

  it('cambiare il cellulare lo salva nel campo giusto (cellulare_whatsapp, non telefono)', async () => {
    fetchMock().mockResolvedValueOnce(new Response('{}', { status: 200 }))
    render(
      <ClienteEditSheet
        cliente={{ ...clienteBase, cellulare_whatsapp: null }}
        isOpen
        onClose={() => {}}
      />
    )

    await userEvent.type(screen.getByLabelText('Cellulare WhatsApp'), '333 1234567')
    await userEvent.click(screen.getByRole('button', { name: /salva/i }))

    await waitFor(() => expect(fetchMock()).toHaveBeenCalled())
    const body = JSON.parse((fetchMock().mock.calls[0][1] as RequestInit).body as string)
    expect(body.cellulare_whatsapp).toBe('333 1234567')
    expect(body.telefono).toBe('02 1234567') // invariato — i due campi non si mescolano
  })

  // 🔑 LA PROVA CHE VALE PIÙ DI TUTTE (passo 3-ter del brief): il caso
  // distruttivo non è "il campo non si salva", è "si salva un ALTRO campo e
  // questo sparisce". Senza questa prova, un pannello che dimenticasse
  // `cellulare_whatsapp` nel body di `handleSalva` passerebbe comunque il
  // test sopra (che TOCCA il campo) restando rosso solo qui.
  it('salvare senza toccare il cellulare NON lo cancella', async () => {
    fetchMock().mockResolvedValueOnce(new Response('{}', { status: 200 }))
    render(
      <ClienteEditSheet
        cliente={{ ...clienteBase, cellulare_whatsapp: '333 1234567' }}
        isOpen
        onClose={() => {}}
      />
    )

    await userEvent.clear(screen.getByLabelText('Email'))
    await userEvent.type(screen.getByLabelText('Email'), 'nuova@studio.it')
    await userEvent.click(screen.getByRole('button', { name: /salva/i }))

    await waitFor(() => expect(fetchMock()).toHaveBeenCalled())
    const body = JSON.parse((fetchMock().mock.calls[0][1] as RequestInit).body as string)
    expect(body.cellulare_whatsapp).toBe('333 1234567')
  })
})
