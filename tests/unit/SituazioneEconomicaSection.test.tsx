// tests/unit/SituazioneEconomicaSection.test.tsx
// Ondata 3 — sezione situazione economica del portale (montata in fase lista,
// sessione già validata dal padre). Testa: card saldo (credito solo se > 0),
// blocchi collassabili, stati errore/vuoto.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SituazioneEconomicaSection } from '@/components/features/portale/SituazioneEconomicaSection'

const datiBase = {
  studio: 'Studio Bianchi',
  saldo: { confermato: 680, potenziale: 322, disponibile: 0, totale: 1002 },
  dovuti: [
    { origine: 'fattura', numero: '2026-0002', data: '2026-05-01', totale: 632, residuo: 500, pagata: false, giorni_ritardo: 43 },
    { origine: 'lavoro_diretto', numero: '2026/0015', data: '2026-06-20', totale: 180, residuo: 180, pagata: false, giorni_ritardo: 0 },
    { origine: 'fattura', numero: '2026-0001', data: '2026-02-10', totale: 132, residuo: 0, pagata: true, giorni_ritardo: 120 },
  ],
  pagamenti: [
    { data: '2026-06-01', importo: 132, metodo: 'bonifico', destinazione: { tipo: 'fattura', numero: '2026-0001' } },
    { data: '2025-11-20', importo: 90, metodo: 'contanti', destinazione: { tipo: 'lavoro', numero: '2025/0102' } },
  ],
}

function stubFetch(payload: unknown, ok = true) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok, json: async () => payload })))
}

beforeEach(() => vi.stubGlobal('fetch', vi.fn()))
afterEach(() => vi.unstubAllGlobals())

describe('SituazioneEconomicaSection', () => {
  it('card saldo: mostra confermato, potenziale e totale; credito NASCOSTO se 0', async () => {
    stubFetch(datiBase)
    render(<SituazioneEconomicaSection token="tok-1" />)
    expect(await screen.findByText('Situazione economica')).toBeDefined()
    expect(screen.getByText('Da saldare')).toBeDefined()
    expect(screen.getByText('In attesa di tua decisione')).toBeDefined()
    expect(screen.getByText('Totale')).toBeDefined()
    expect(screen.queryByText('Tuo credito')).toBeNull()
  })

  it('card saldo: credito VISIBILE se > 0', async () => {
    stubFetch({ ...datiBase, saldo: { ...datiBase.saldo, disponibile: 45, totale: 957 } })
    render(<SituazioneEconomicaSection token="tok-1" />)
    expect(await screen.findByText('Tuo credito')).toBeDefined()
  })

  it('potenziale a 0 → riga "In attesa" nascosta', async () => {
    stubFetch({ ...datiBase, saldo: { ...datiBase.saldo, potenziale: 0, totale: 680 } })
    render(<SituazioneEconomicaSection token="tok-1" />)
    await screen.findByText('Situazione economica')
    expect(screen.queryByText('In attesa di tua decisione')).toBeNull()
  })

  it('blocco dovuti collassato di default, si espande al tap: righe con ritardo e saldata quieta', async () => {
    stubFetch(datiBase)
    render(<SituazioneEconomicaSection token="tok-1" />)
    await screen.findByText('Situazione economica')
    expect(screen.queryByText('Fattura 2026-0002')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /dettaglio dovuti/i }))
    expect(screen.getByText('Fattura 2026-0002')).toBeDefined()
    expect(screen.getByText(/in ritardo di 43/)).toBeDefined()
    expect(screen.getByText('Lavoro 2026/0015')).toBeDefined()
    expect(screen.getByText('Saldata')).toBeDefined()
  })

  it('blocco pagamenti si espande: righe con metodo e destinazione, gruppi per anno', async () => {
    stubFetch(datiBase)
    render(<SituazioneEconomicaSection token="tok-1" />)
    await screen.findByText('Situazione economica')
    await userEvent.click(screen.getByRole('button', { name: /pagamenti registrati/i }))
    expect(screen.getByText('Bonifico')).toBeDefined()
    expect(screen.getByText(/per Fattura 2026-0001/)).toBeDefined()
    expect(screen.getByText(/per Lavoro 2025\/0102/)).toBeDefined()
    expect(screen.getByText('2026')).toBeDefined()
    expect(screen.getByText('2025')).toBeDefined()
  })

  it('nessun movimento → stato vuoto', async () => {
    stubFetch({ studio: null, saldo: { confermato: 0, potenziale: 0, disponibile: 0, totale: 0 }, dovuti: [], pagamenti: [] })
    render(<SituazioneEconomicaSection token="tok-1" />)
    expect(await screen.findByText('Nessun movimento economico registrato.')).toBeDefined()
  })

  it('fetch fallita → avviso errore, mai crash', async () => {
    stubFetch({}, false)
    render(<SituazioneEconomicaSection token="tok-1" />)
    await waitFor(() => expect(screen.getByRole('alert')).toBeDefined())
  })
})

// Follow-up Ondata 3 (finding a11y review finale): l'header collassabile deve
// essere collegato al pannello via aria-controls/id (come nel mockup approvato).
describe('SituazioneEconomicaSection — a11y collassabili', () => {
  it('bottone con aria-controls che punta al pannello espanso', async () => {
    stubFetch(datiBase)
    render(<SituazioneEconomicaSection token="tok-1" />)
    await screen.findByText('Situazione economica')
    const bottone = screen.getByRole('button', { name: /dettaglio dovuti/i })
    const controlsId = bottone.getAttribute('aria-controls')
    expect(controlsId).toBeTruthy()
    expect(document.getElementById(controlsId!)).toBeNull() // collassato: pannello smontato
    await userEvent.click(bottone)
    const pannello = document.getElementById(controlsId!)
    expect(pannello).not.toBeNull()
    expect(pannello!.textContent).toContain('Fattura 2026-0002')
    // I due blocchi non devono condividere lo stesso id
    const bottonePag = screen.getByRole('button', { name: /pagamenti registrati/i })
    expect(bottonePag.getAttribute('aria-controls')).not.toBe(controlsId)
  })
})
