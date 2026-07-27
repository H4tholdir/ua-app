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

  // 🟠 ALTO 2 — il pannello aveva un `catch` vuoto: un salvataggio fallito
  // (il 500 del Critical, o un 422) non si vedeva da nessuna parte, l'utente
  // vedeva solo il pannello che non si chiudeva senza sapere perché.
  it('🟠 ALTO 2: quando la PATCH fallisce, il pannello resta aperto e mostra il messaggio della route', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: 'Non è stato possibile aggiornare il paziente' }),
    })))
    render(<PazienteEditSheet paziente={{ ...BASE, cognome: 'Bagheria', nome: 'Giuseppe' }} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /modifica/i }))
    await user.click(screen.getByRole('button', { name: /salva/i }))

    expect(await screen.findByText('Non è stato possibile aggiornare il paziente')).toBeInTheDocument()
    // Il pannello resta aperto: la casella Cognome è ancora visibile.
    expect(screen.getByLabelText(/Cognome/i)).toBeInTheDocument()
  })

  // 🔴 Regressione collaudo dal vivo (27/07/2026) — le due caselle Cognome/Nome
  // hanno reso il modulo più alto: a 1280×800 il tasto «Salva modifiche»
  // finiva sotto il bordo dello schermo perché stava DENTRO il contenitore
  // che scorre. La correzione: intestazione fissa, corpo scorrevole, piede
  // fisso — il tasto è fratello del corpo scorrevole, mai suo discendente.
  it('🔴 il tasto «Salva modifiche» non è mai dentro un contenitore che scorre — resta raggiungibile senza scroll', async () => {
    render(<PazienteEditSheet paziente={{ ...BASE, cognome: 'Bagheria', nome: 'Giuseppe' }} />)
    await userEvent.setup().click(screen.getByRole('button', { name: /modifica/i }))

    const salvaButton = screen.getByRole('button', { name: /salva modifiche/i })
    const cognomeInput = screen.getByLabelText(/Cognome/i)

    // Nessun antenato del tasto Salva scorre: se lo fosse, il tasto
    // scenderebbe insieme al contenuto del form (il difetto misurato).
    let ancestor: HTMLElement | null = salvaButton.parentElement
    let hasScrollingAncestor = false
    while (ancestor) {
      if (ancestor.style.overflowY === 'auto') {
        hasScrollingAncestor = true
        break
      }
      ancestor = ancestor.parentElement
    }
    expect(hasScrollingAncestor).toBe(false)

    // Il test non è vacuo: deve esistere DAVVERO un corpo scorrevole (altrimenti
    // basterebbe aver tolto lo scroll dal form per "passare" senza aver risolto
    // nulla), e la casella Cognome deve stare al suo interno.
    let scrollingContainer: HTMLElement | null = cognomeInput.parentElement
    let foundScrollingContainer = false
    while (scrollingContainer) {
      if (scrollingContainer.style.overflowY === 'auto') {
        foundScrollingContainer = true
        break
      }
      scrollingContainer = scrollingContainer.parentElement
    }
    expect(foundScrollingContainer).toBe(true)
  })
})
