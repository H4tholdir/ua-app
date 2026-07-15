import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const { mockRefresh } = vi.hoisted(() => ({ mockRefresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }))

import { InviaPecButton, STATO_SDI_LABEL } from '@/components/features/fatture/InviaPecButton'

const PROPS = { fatturaId: 'fat-1', numero: '2026-0007', statoSdi: 'generata', ruolo: 'titolare', pecConfigurata: true }

function fetchMock(status: number, body: unknown) {
  return vi.fn(async () => ({ ok: status < 400, status, json: async () => body })) as never
}

beforeEach(() => vi.clearAllMocks())

describe('InviaPecButton — visibilità', () => {
  it('generata + titolare → visibile', () => {
    render(<InviaPecButton {...PROPS} />)
    expect(screen.getByRole('button', { name: /invia a sdi/i })).toBeInTheDocument()
  })
  it('generata + front_desk → visibile', () => {
    render(<InviaPecButton {...PROPS} ruolo="front_desk" />)
    expect(screen.getByRole('button', { name: /invia a sdi/i })).toBeInTheDocument()
  })
  it('generata + tecnico → NON renderizzato', () => {
    const { container } = render(<InviaPecButton {...PROPS} ruolo="tecnico" />)
    expect(container).toBeEmptyDOMElement()
  })
  it('smtp_inviata + titolare → NON renderizzato', () => {
    const { container } = render(<InviaPecButton {...PROPS} statoSdi="smtp_inviata" />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('InviaPecButton — PEC non configurata', () => {
  it('bottone disabled + link a /impostazioni/pec', () => {
    render(<InviaPecButton {...PROPS} pecConfigurata={false} />)
    expect(screen.getByRole('button', { name: /invia a sdi/i })).toBeDisabled()
    expect(screen.getByRole('link', { name: /configura pec/i })).toHaveAttribute('href', '/impostazioni/pec')
  })
})

describe('InviaPecButton — conferma e invio', () => {
  it('tap → conferma col numero fattura, fetch NON ancora chiamata', () => {
    global.fetch = fetchMock(200, {})
    render(<InviaPecButton {...PROPS} />)
    fireEvent.click(screen.getByRole('button', { name: /invia a sdi/i }))
    expect(screen.getByRole('dialog')).toHaveTextContent('2026-0007')
    expect(global.fetch).not.toHaveBeenCalled()
  })
  it('Annulla → conferma chiusa, nessuna fetch', () => {
    global.fetch = fetchMock(200, {})
    render(<InviaPecButton {...PROPS} />)
    fireEvent.click(screen.getByRole('button', { name: /invia a sdi/i }))
    fireEvent.click(screen.getByRole('button', { name: /annulla/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })
  it('conferma → POST /api/fatture/fat-1/invia-pec e refresh su ok', async () => {
    global.fetch = fetchMock(200, { fattura: { stato_sdi: 'smtp_inviata' } })
    render(<InviaPecButton {...PROPS} />)
    fireEvent.click(screen.getByRole('button', { name: /invia a sdi/i }))
    fireEvent.click(screen.getByRole('button', { name: /^invia$/i }))
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
    expect(global.fetch).toHaveBeenCalledWith('/api/fatture/fat-1/invia-pec', { method: 'POST' })
  })
  it('409 → messaggio informativo (data-tipo=info) + refresh', async () => {
    global.fetch = fetchMock(409, { error: 'Invio già in corso o già effettuato' })
    render(<InviaPecButton {...PROPS} />)
    fireEvent.click(screen.getByRole('button', { name: /invia a sdi/i }))
    fireEvent.click(screen.getByRole('button', { name: /^invia$/i }))
    await waitFor(() => expect(screen.getByText(/già in corso/i)).toBeInTheDocument())
    expect(screen.getByText(/già in corso/i)).toHaveAttribute('data-tipo', 'info')
    expect(mockRefresh).toHaveBeenCalled()
  })
  it('502 → errore inline (data-tipo=errore), bottone riabilitato per retry', async () => {
    global.fetch = fetchMock(502, { error: 'Invio PEC fallito — riprova o verifica la configurazione PEC' })
    render(<InviaPecButton {...PROPS} />)
    fireEvent.click(screen.getByRole('button', { name: /invia a sdi/i }))
    fireEvent.click(screen.getByRole('button', { name: /^invia$/i }))
    await waitFor(() => expect(screen.getByText(/invio pec fallito/i)).toBeInTheDocument())
    expect(screen.getByText(/invio pec fallito/i)).toHaveAttribute('data-tipo', 'errore')
    expect(screen.getByRole('button', { name: /invia a sdi/i })).toBeEnabled()
    expect(mockRefresh).not.toHaveBeenCalled()
  })
})

describe('STATO_SDI_LABEL', () => {
  it('copre tutti gli 8 stati SDI', () => {
    expect(Object.keys(STATO_SDI_LABEL).sort()).toEqual(
      ['accettata', 'draft', 'generata', 'pec_consegnata', 'ricevuta_sdi', 'rifiutata', 'scaduta', 'smtp_inviata']
    )
  })
})
