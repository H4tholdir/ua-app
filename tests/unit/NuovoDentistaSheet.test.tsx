import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AvvisiProvider } from '@/components/ds/Avviso'
import { NuovoDentistaSheet } from '@/components/features/wizard/NuovoDentistaSheet'

// Task 9 (A7): sheet «Nuovo dentista» a SOLO 4 campi — Nome, Cognome
// (obbligatori), Cellulare/WhatsApp, Studio (opzionali). NIENTE campi
// fiscali (A7, spec §2.1) — la DdC All. XIII chiede solo il nome del
// prescrittore, il fiscale diventa bloccante solo alla prima fattura.

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

  it('mostra SOLO i 4 campi A7: Nome, Cognome, Cellulare/WhatsApp, Studio — niente campi fiscali', () => {
    renderSheet()
    expect(screen.getByRole('dialog', { name: 'Nuovo dentista' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
    expect(screen.getByLabelText('Cognome')).toBeInTheDocument()
    expect(screen.getByLabelText('Cellulare/WhatsApp')).toBeInTheDocument()
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

  it('submit valido → POST /api/clienti con {nome, cognome, telefono, studio_nome} e credentials same-origin → onCreato({id, label=studio_nome})', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ cliente: { id: 'cli-1', nome: 'Mario', cognome: 'Rossi', studio_nome: 'Studio Rossi' } }),
    })

    const { onCreato } = renderSheet()
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Mario' } })
    fireEvent.change(screen.getByLabelText('Cognome'), { target: { value: 'Rossi' } })
    fireEvent.change(screen.getByLabelText('Cellulare/WhatsApp'), { target: { value: '333123456' } })
    fireEvent.change(screen.getByLabelText('Studio'), { target: { value: 'Studio Rossi' } })
    fireEvent.click(screen.getByRole('button', { name: /crea dentista/i }))

    await waitFor(() => expect(onCreato).toHaveBeenCalledWith({ id: 'cli-1', label: 'Studio Rossi' }))
    expect(fetch).toHaveBeenCalledWith('/api/clienti', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: 'Mario', cognome: 'Rossi', telefono: '333123456', studio_nome: 'Studio Rossi' }),
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

    await waitFor(() => expect(onCreato).toHaveBeenCalledWith({ id: 'cli-2', label: 'Dr. Bianchi' }))
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
