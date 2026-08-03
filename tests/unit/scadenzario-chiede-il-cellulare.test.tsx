// P31 Compito 8 — D183/D185: allargato dalla consegna ai tre punti dello
// scadenzario che mandano un sollecito WhatsApp. Il compito 4 li aveva resi
// condizionati a `cellulare_whatsapp` (il tasto SPARISCE se manca); D185 dice
// che devono restare e CHIEDERE, come alla consegna — stessa scelta fra
// tasto-che-apre-WhatsApp e tasto-che-chiede-il-numero, stesso foglio
// condiviso `ChiediCellulareSheet`.
//
// Qui si prova solo il RAMO (cellulare presente → link; assente → tasto che
// apre il foglio): l'ordine salva→apri WhatsApp è già provato una volta sola
// in tests/unit/consegna-chiede-il-cellulare.test.tsx — la garanzia vive
// dentro il foglio condiviso, non va riprovata a ogni punto di montaggio.
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock('@/design-system/v3/sound', () => ({ suona: vi.fn() }))
vi.mock('@/design-system/v3/haptic', () => ({ vibra: vi.fn() }))

import { EstrattoContoView } from '@/components/features/scadenzario/EstrattoContoView'
import { ScadenzarioList } from '@/components/features/scadenzario/ScadenzarioList'
import type { EstrattoContoResponse } from '@/app/api/scadenzario/[cliente_id]/route'

function datiBase(cellulare: string | null): EstrattoContoResponse {
  return {
    cliente: {
      id: 'CLI-1',
      nome: 'Vincenzo',
      cognome: 'Telesca',
      studio_nome: 'Studio Piegari',
      telefono: '0976 74210',
      cellulare_whatsapp: cellulare,
      indirizzo: null,
      cap: null,
      citta: null,
    },
    dovuti: [
      { id: 'D1', origine: 'fattura', numero: 'FT-2026-0001', data: '2026-07-01', totale: 500, residuo: 500, pagata: false, giorni_ritardo: 20, stato_sdi: 'draft' },
    ],
    lavoriInAttesa: [],
    creditoCliente: { confermato: 500, potenziale: 0, disponibile: 0, totale: 500 },
  }
}

describe('EstrattoContoView — sollecito globale (D183/D185, punto ②)', () => {
  beforeEach(() => vi.restoreAllMocks())

  // Nota: la variante nella colonna laterale (`.estratto-col-sidebar`, solo
  // desktop) usa lo stesso `whatsappUrlGlobale`/stessa scelta link-o-tasto —
  // qui si prova la variante nella card-list («Sollecito totale — …»), che
  // jsdom non nasconde dietro il suo `@media` (limite noto dell'ambiente di
  // test, non del componente): stessa sorgente di verità, un solo punto
  // d'osservazione basta a coprire il ramo.
  it('col cellulare presente: link diretto, nessun tasto che chiede', () => {
    render(<EstrattoContoView dati={datiBase('333 1234567')} />)
    expect(screen.getByRole('link', { name: /sollecito totale/i })).toBeInTheDocument()
    expect(screen.queryByLabelText('Cellulare WhatsApp')).not.toBeInTheDocument()
  })

  it('senza cellulare: il tasto CI SIA LO STESSO (non un link) e apra il foglio', async () => {
    const user = userEvent.setup()
    render(<EstrattoContoView dati={datiBase(null)} />)
    const tasto = screen.getByRole('button', { name: /sollecito totale/i })
    expect(tasto).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /sollecito totale/i })).not.toBeInTheDocument()
    await user.click(tasto)
    expect(screen.getByLabelText('Cellulare WhatsApp')).toBeInTheDocument()
  })
})

describe('EstrattoContoView — sollecito sul singolo dovuto (D183/D185, punto ③, DovutoBottomSheet)', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('col cellulare presente: link diretto dentro il dettaglio del dovuto', async () => {
    const user = userEvent.setup()
    render(<EstrattoContoView dati={datiBase('333 1234567')} />)
    await user.click(screen.getByRole('button', { name: /FT-2026-0001/ }))
    const dialogo = await screen.findByRole('dialog', { name: /FT-2026-0001/ })
    expect(within(dialogo).getByRole('link', { name: /invia sollecito whatsapp/i })).toBeInTheDocument()
  })

  it('senza cellulare: il tasto nel dettaglio del dovuto CHIEDE il numero invece di sparire', async () => {
    const user = userEvent.setup()
    render(<EstrattoContoView dati={datiBase(null)} />)
    await user.click(screen.getByRole('button', { name: /FT-2026-0001/ }))
    const dialogo = await screen.findByRole('dialog', { name: /FT-2026-0001/ })
    const tasto = within(dialogo).getByRole('button', { name: /invia sollecito whatsapp/i })
    expect(within(dialogo).queryByRole('link', { name: /invia sollecito whatsapp/i })).not.toBeInTheDocument()
    await user.click(tasto)
    expect(screen.getByLabelText('Cellulare WhatsApp')).toBeInTheDocument()
  })
})

describe('ScadenzarioList — sollecito dall\'elenco (D183/D185, punto ④)', () => {
  beforeEach(() => vi.restoreAllMocks())

  function mockLista(cellulare: string | null) {
    const item = {
      cliente: { id: 'CLI-2', nome: 'Anna', cognome: 'Bianchi', studio_nome: 'Studio Bianchi', telefono: null, cellulare_whatsapp: cellulare },
      dovuti: [{ id: 'D2', origine: 'lavoro_diretto' as const, numero: 'L-0099', data: '2026-06-01', importo: 250, stato_sdi: null }],
      totale_insoluto: 250,
      giorni_max_ritardo: 45,
    }
    global.fetch = vi.fn(async () => new Response(JSON.stringify([item]), { status: 200 })) as unknown as typeof fetch
  }

  it('col cellulare presente: link diretto', async () => {
    const user = userEvent.setup()
    mockLista('333 1234567')
    render(<ScadenzarioList />)
    // Espande la card (nome esatto sulla riga sommario — NON il regex generico,
    // che matcherebbe anche l'aria-label "Invia sollecito WhatsApp a Studio
    // Bianchi" del tasto dentro il pannello espanso).
    const riga = await screen.findByText('Studio Bianchi')
    await user.click(riga)
    expect(screen.getByRole('link', { name: /invia sollecito whatsapp a studio bianchi/i })).toBeInTheDocument()
  })

  it('senza cellulare: il tasto CI SIA LO STESSO e apra il foglio', async () => {
    const user = userEvent.setup()
    mockLista(null)
    render(<ScadenzarioList />)
    const riga = await screen.findByText('Studio Bianchi')
    await user.click(riga)
    const tasto = screen.getByRole('button', { name: /invia sollecito whatsapp a studio bianchi/i })
    expect(screen.queryByRole('link', { name: /invia sollecito whatsapp a studio bianchi/i })).not.toBeInTheDocument()
    await user.click(tasto)
    expect(screen.getByLabelText('Cellulare WhatsApp')).toBeInTheDocument()
  })
})
