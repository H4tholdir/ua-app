import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AvvisiProvider } from '@/components/ds/Avviso'
import { NuovoDentistaSheet } from '@/components/features/wizard/NuovoDentistaSheet'

// Task 9 (A7) + P31/D184 (03/08/2026): sheet «Nuovo dentista» a CINQUE campi —
// Nome, Cognome (obbligatori — l'unico dato che la DdC All. XIII MDR chiede
// al prescrittore), Telefono dello studio, Cellulare WhatsApp e Studio
// (opzionali). Il vecchio campo unico «Cellulare/WhatsApp» si è sdoppiato in
// DUE campi con LO STESSO PESO (D184): «Telefono dello studio» (→ colonna
// `telefono`) e «Cellulare WhatsApp» (→ colonna `cellulare_whatsapp`, dove UÀ
// manda i messaggi di consegna) — il testo di aiuto sotto quest'ultimo è
// quello approvato in D186. NIENTE campi fiscali (A7, spec §2.1) — il
// fiscale diventa bloccante solo alla prima fattura.

function renderSheet(props?: Partial<Parameters<typeof NuovoDentistaSheet>[0]>) {
  const onChiudi = vi.fn()
  const onCreato = vi.fn()
  const utils = render(
    <AvvisiProvider>
      <NuovoDentistaSheet aperto onChiudi={onChiudi} onCreato={onCreato} {...props} />
    </AvvisiProvider>
  )
  return { ...utils, onChiudi, onCreato }
}

describe('NuovoDentistaSheet (Task 9, A7)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function fetchMock() {
    return fetch as unknown as ReturnType<typeof vi.fn>
  }

  // P31/D184 — le tre nuove prove del brief (Passo 1): il campo unico si
  // sdoppia in due, con lo stesso peso, e ognuno scrive nella sua colonna.
  it('D184 — chiede ENTRAMBI i numeri', () => {
    renderSheet()
    expect(screen.getByLabelText('Telefono dello studio')).toBeInTheDocument()
    expect(screen.getByLabelText('Cellulare WhatsApp')).toBeInTheDocument()
  })

  it('D184 — sotto il cellulare è scritto a che cosa serve', () => {
    renderSheet()
    const input = screen.getByLabelText('Cellulare WhatsApp')
    const idAiuto = input.getAttribute('aria-describedby')
    expect(document.getElementById(idAiuto!)?.textContent).toMatch(/consegna/i)
  })

  // 🔑 La prova che i due campi finiscono in DUE posti diversi: senza questa,
  //    due campi che scrivono nella stessa colonna passerebbero.
  it('i due numeri partono in due campi distinti del corpo della richiesta', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ cliente: { id: 'x', nome: 'Mario', cognome: 'Rossi', studio_nome: null } }),
    })
    renderSheet()
    await userEvent.type(screen.getByLabelText('Nome'), 'Mario')
    await userEvent.type(screen.getByLabelText('Cognome'), 'Rossi')
    await userEvent.type(screen.getByLabelText('Telefono dello studio'), '02 1234567')
    await userEvent.type(screen.getByLabelText('Cellulare WhatsApp'), '333 1234567')
    await userEvent.click(screen.getByRole('button', { name: /crea dentista/i }))

    await waitFor(() => expect(fetchMock()).toHaveBeenCalled())
    const body = JSON.parse((fetchMock().mock.calls[0][1] as RequestInit).body as string)
    expect(body.telefono).toBe('02 1234567')
    expect(body.cellulare_whatsapp).toBe('333 1234567')
  })

  it('mostra SOLO i 5 campi D184: Nome, Cognome, Telefono dello studio, Cellulare WhatsApp, Studio — niente campi fiscali', () => {
    renderSheet()
    expect(screen.getByRole('dialog', { name: 'Nuovo dentista' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
    expect(screen.getByLabelText('Cognome')).toBeInTheDocument()
    expect(screen.getByLabelText('Telefono dello studio')).toBeInTheDocument()
    expect(screen.getByLabelText('Cellulare WhatsApp')).toBeInTheDocument()
    expect(screen.getByLabelText('Studio')).toBeInTheDocument()
    expect(screen.queryByLabelText(/partita iva/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/codice fiscale/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/pec/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/sdi/i)).not.toBeInTheDocument()
  })

  it('submit con nome/cognome vuoti NON chiama fetch e mostra il vincolo', async () => {
    const { onCreato } = renderSheet()
    fireEvent.click(screen.getByRole('button', { name: /crea dentista/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/nome.*cognome|obbligator/i)
    expect(fetch).not.toHaveBeenCalled()
    expect(onCreato).not.toHaveBeenCalled()
  })

  it('submit valido → POST /api/clienti con {nome, cognome, telefono, cellulare_whatsapp, studio_nome} e credentials same-origin → onCreato({id, label=studio_nome})', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ cliente: { id: 'cli-1', nome: 'Mario', cognome: 'Rossi', studio_nome: 'Studio Rossi' } }),
    })

    const { onCreato } = renderSheet()
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Mario' } })
    fireEvent.change(screen.getByLabelText('Cognome'), { target: { value: 'Rossi' } })
    fireEvent.change(screen.getByLabelText('Telefono dello studio'), { target: { value: '02 1234567' } })
    fireEvent.change(screen.getByLabelText('Cellulare WhatsApp'), { target: { value: '333123456' } })
    fireEvent.change(screen.getByLabelText('Studio'), { target: { value: 'Studio Rossi' } })
    fireEvent.click(screen.getByRole('button', { name: /crea dentista/i }))

    await waitFor(() =>
      expect(onCreato).toHaveBeenCalledWith({
        id: 'cli-1',
        label: 'Studio Rossi',
        nome: 'Mario',
        cognome: 'Rossi',
        studioNome: 'Studio Rossi',
      })
    )
    expect(fetch).toHaveBeenCalledWith('/api/clienti', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'Mario',
        cognome: 'Rossi',
        telefono: '02 1234567',
        cellulare_whatsapp: '333123456',
        studio_nome: 'Studio Rossi',
      }),
    })
  })

  it('label = Dr. {cognome} quando studio non è compilato (stessa regola del Task 7)', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ cliente: { id: 'cli-2', nome: 'Luca', cognome: 'Bianchi', studio_nome: null } }),
    })

    const { onCreato } = renderSheet()
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Luca' } })
    fireEvent.change(screen.getByLabelText('Cognome'), { target: { value: 'Bianchi' } })
    fireEvent.click(screen.getByRole('button', { name: /crea dentista/i }))

    await waitFor(() =>
      expect(onCreato).toHaveBeenCalledWith({
        id: 'cli-2',
        label: 'Dr. Bianchi',
        nome: 'Luca',
        cognome: 'Bianchi',
        studioNome: null,
      })
    )
    expect(fetch).toHaveBeenCalledWith('/api/clienti', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: 'Luca', cognome: 'Bianchi' }),
    })
  })

  it('errore rete/500 → Avviso.errore("Non sono riuscita a creare il dentista. Riprova.") e lo sheet resta aperto', async () => {
    fetchMock().mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'boom' }) })

    const { onChiudi, onCreato } = renderSheet()
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Mario' } })
    fireEvent.change(screen.getByLabelText('Cognome'), { target: { value: 'Rossi' } })
    fireEvent.click(screen.getByRole('button', { name: /crea dentista/i }))

    await waitFor(() => expect(screen.getByText('Non sono riuscita a creare il dentista. Riprova.')).toBeInTheDocument())
    expect(onCreato).not.toHaveBeenCalled()
    expect(onChiudi).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Nuovo dentista' })).toBeInTheDocument()
  })

  it('errore di rete (fetch throw) → stesso Avviso.errore e sheet resta aperto', async () => {
    fetchMock().mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const { onCreato } = renderSheet()
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Mario' } })
    fireEvent.change(screen.getByLabelText('Cognome'), { target: { value: 'Rossi' } })
    fireEvent.click(screen.getByRole('button', { name: /crea dentista/i }))

    await waitFor(() => expect(screen.getByText('Non sono riuscita a creare il dentista. Riprova.')).toBeInTheDocument())
    expect(onCreato).not.toHaveBeenCalled()
  })

  it('bottone disabled durante la chiamata (no doppio POST)', async () => {
    let risolviFetch: (v: unknown) => void = () => {}
    fetchMock().mockReturnValueOnce(
      new Promise((risolvi) => {
        risolviFetch = risolvi
      })
    )

    renderSheet()
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Mario' } })
    fireEvent.change(screen.getByLabelText('Cognome'), { target: { value: 'Rossi' } })
    const bottone = screen.getByRole('button', { name: /crea dentista/i })
    fireEvent.click(bottone)

    await waitFor(() => expect(bottone).toBeDisabled())
    fireEvent.click(bottone)
    expect(fetch).toHaveBeenCalledTimes(1)

    risolviFetch({ ok: true, status: 201, json: async () => ({ cliente: { id: 'x', nome: 'Mario', cognome: 'Rossi', studio_nome: null } }) })
  })
})
