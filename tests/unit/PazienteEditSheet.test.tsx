import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PazienteEditSheet } from '@/components/features/pazienti/PazienteEditSheet'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

const BASE = {
  id: 'pz-1',
  codice_paziente: 'PZ-0042',
  nome: null as string | null,
  cognome: null as string | null,
  note: null, anamnesi: null, asl: null, sesso: null, data_nascita: null,
}

beforeEach(() => { vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }))) })
afterEach(() => { vi.unstubAllGlobals() })

describe('PazienteEditSheet — correzione di nome e cognome (D9 parte paziente, G4)', () => {
  it('il pannello mostra le caselle Cognome e Nome', async () => {
    render(<PazienteEditSheet paziente={{ ...BASE, cognome: 'Bagheria', nome: 'Giuseppe' }} />)
    await userEvent.setup().click(screen.getByRole('button', { name: /modifica/i }))
    expect(screen.getByLabelText(/Cognome/i)).toHaveValue('Bagheria')
    expect(screen.getByLabelText(/^Nome/i)).toHaveValue('Giuseppe')
  })

  it('🛑 il «codice travestito» NON compare nella casella Cognome (inviterebbe a cancellarlo)', async () => {
    // I pazienti creati dal wizard senza nome hanno il CODICE dentro `cognome`.
    render(<PazienteEditSheet paziente={{ ...BASE, cognome: 'PZ-0042', nome: '' }} />)
    await userEvent.setup().click(screen.getByRole('button', { name: /modifica/i }))
    expect(screen.getByLabelText(/Cognome/i)).toHaveValue('')
  })

  it('salvare invia nome e cognome nella PATCH', async () => {
    render(<PazienteEditSheet paziente={{ ...BASE, cognome: 'Bagherra', nome: 'Giuseppe' }} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /modifica/i }))
    await user.clear(screen.getByLabelText(/Cognome/i))
    await user.type(screen.getByLabelText(/Cognome/i), 'Bagheria')
    await user.click(screen.getByRole('button', { name: /salva/i }))

    const [url, opt] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('/api/pazienti/pz-1')
    expect(opt.method).toBe('PATCH')
    expect(JSON.parse(opt.body)).toMatchObject({ cognome: 'Bagheria', nome: 'Giuseppe' })
  })
})
