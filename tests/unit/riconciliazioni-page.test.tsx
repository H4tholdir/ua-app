// tests/unit/riconciliazioni-page.test.tsx
// Task 16: pagina /fatture/riconciliazioni («Da sistemare», variante A
// approvata — docs/design/decisions/2026-07-16-riconciliazioni.md).
// Copre RiconciliazioniClient (5 gruppi + conteggi + empty state + gate
// ruolo front_desk) e i sotto-fogli (OverrideStatoSheet, UploadRicevutaSheet,
// SbloccaClaimSheet). Pattern mock ricalcato da nota-credito-button.test.tsx.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import {
  RiconciliazioniClient,
  type PendenzeRiconciliazioneClient,
} from '../../src/components/features/fatture/RiconciliazioniClient'
import { OverrideStatoSheet } from '../../src/components/features/fatture/OverrideStatoSheet'
import { UploadRicevutaSheet } from '../../src/components/features/fatture/UploadRicevutaSheet'
import { SbloccaClaimSheet } from '../../src/components/features/fatture/SbloccaClaimSheet'

const pushMock = vi.fn()
const refreshMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}))

const PENDENZE_PIENE: PendenzeRiconciliazioneClient = {
  stornateConTd04Rifiutato: [{ id: 'fat-orig-1', numero: '2026-0027', td04_numero: '2026-0006' }],
  saldiNegativi: [{ cliente_id: 'cli-1', cliente_nome: 'Studio Rossi', saldo: -60 }],
  eventiParcheggiati: [
    { id: 'evt-1', nome_file_ricevuta: 'ricevuta_firma.xml', esito_verifica_firma: 'fallita', esito_committente: null, created_at: '2026-07-16T09:00:00Z' },
    { id: 'evt-2', nome_file_ricevuta: 'ricevuta_ec02.xml', esito_verifica_firma: 'valida', esito_committente: 'EC02', created_at: '2026-07-14T09:00:00Z' },
  ],
  claimOrfani: [{ id: 'fat-orf-1', numero: '2026-0031', smtp_inviata_at: new Date(Date.now() - 2 * 86400000).toISOString() }],
  smtpStagnanti: [{ id: 'fat-stag-1', numero: '2026-0019', smtp_inviata_at: new Date(Date.now() - 13 * 86400000).toISOString() }],
}

const PENDENZE_VUOTE: PendenzeRiconciliazioneClient = {
  stornateConTd04Rifiutato: [],
  saldiNegativi: [],
  eventiParcheggiati: [],
  claimOrfani: [],
  smtpStagnanti: [],
}

function openGroup(nome: RegExp) {
  fireEvent.click(screen.getByRole('button', { name: nome }))
}

describe('RiconciliazioniClient — 5 gruppi + conteggi', () => {
  it('renderizza i 5 gruppi con etichette e conteggi corretti', () => {
    render(<RiconciliazioniClient pendenze={PENDENZE_PIENE} ruolo="titolare" />)

    expect(screen.getByText('Cose da sistemare')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument() // totale = 1+1+2+1+1

    const gruppi: Array<[RegExp, string]> = [
      [/note di credito rifiutate dallo stato/i, '1'],
      [/conti clienti da sistemare/i, '1'],
      [/ricevute da controllare a mano/i, '2'],
      [/segnate come inviate, ma l'invio non risulta/i, '1'],
      [/in attesa di risposta da troppo tempo/i, '1'],
    ]
    for (const [label, count] of gruppi) {
      const header = screen.getByRole('button', { name: label })
      expect(within(header).getByText(count)).toBeInTheDocument()
    }
  })

  it('gruppo con 0 elementi non viene renderizzato', () => {
    render(
      <RiconciliazioniClient
        pendenze={{ ...PENDENZE_VUOTE, saldiNegativi: [{ cliente_id: 'c1', cliente_nome: 'X', saldo: -1 }] }}
        ruolo="titolare"
      />
    )
    expect(screen.getByRole('button', { name: /conti clienti da sistemare/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /note di credito rifiutate/i })).not.toBeInTheDocument()
  })

  it('click sull\'header apre il gruppo e mostra le righe', () => {
    render(<RiconciliazioniClient pendenze={PENDENZE_PIENE} ruolo="titolare" />)
    openGroup(/conti clienti da sistemare/i)
    expect(screen.getByText('Studio Rossi')).toBeInTheDocument()
    expect(screen.getByText(/60,00/)).toBeInTheDocument() // saldo formattato in euro (locale it-IT)
  })
})

describe('RiconciliazioniClient — empty state', () => {
  it('con 0 pendenze mostra «Tutto a posto ✓» e nessun gruppo', () => {
    render(<RiconciliazioniClient pendenze={PENDENZE_VUOTE} ruolo="titolare" />)
    expect(screen.getByText('Tutto a posto ✓')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /note di credito/i })).not.toBeInTheDocument()
  })
})

describe('RiconciliazioniClient — gate ruolo front_desk', () => {
  it('front_desk: azioni titolare-only ASSENTI (Riprova lo storno, Sblocca e reinvia, Controlla e conferma, Ho verificato sul portale)', () => {
    render(<RiconciliazioniClient pendenze={PENDENZE_PIENE} ruolo="front_desk" />)
    openGroup(/note di credito rifiutate dallo stato/i)
    openGroup(/segnate come inviate/i)
    openGroup(/ricevute da controllare a mano/i)
    openGroup(/in attesa di risposta da troppo tempo/i)

    expect(screen.queryByRole('button', { name: /riprova lo storno/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /sblocca e reinvia/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /controlla e conferma/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ho verificato sul portale/i })).not.toBeInTheDocument()
  })

  it('front_desk: azioni condivise PRESENTI (Carica ricevuta PEC, Conferma ricevuta, Vedi il conto)', () => {
    render(<RiconciliazioniClient pendenze={PENDENZE_PIENE} ruolo="front_desk" />)
    openGroup(/in attesa di risposta da troppo tempo/i)
    openGroup(/ricevute da controllare a mano/i)
    openGroup(/conti clienti da sistemare/i)

    expect(screen.getByRole('button', { name: /carica ricevuta pec/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /conferma ricevuta/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /vedi il conto/i })).toBeInTheDocument()
  })

  it('titolare: tutte le azioni riservate sono presenti', () => {
    render(<RiconciliazioniClient pendenze={PENDENZE_PIENE} ruolo="titolare" />)
    openGroup(/note di credito rifiutate dallo stato/i)
    openGroup(/segnate come inviate/i)
    openGroup(/ricevute da controllare a mano/i)
    openGroup(/in attesa di risposta da troppo tempo/i)

    expect(screen.getByRole('button', { name: /riprova lo storno/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sblocca e reinvia/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /controlla e conferma/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ho verificato sul portale/i })).toBeInTheDocument()
  })
})

describe('RiconciliazioniClient — «Ho verificato sul portale» (override stagnanti, decisione 16/07 opzione 1)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    refreshMock.mockClear()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function apriSheetPortale() {
    render(<RiconciliazioniClient pendenze={PENDENZE_PIENE} ruolo="titolare" />)
    openGroup(/in attesa di risposta da troppo tempo/i)
    fireEvent.click(screen.getByRole('button', { name: /ho verificato sul portale/i }))
  }

  it('apre la sheet con le 3 opzioni allowlist in parole semplici e submit spento', () => {
    apriSheetPortale()

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /ho verificato sul portale/i })).toBeInTheDocument()
    expect(screen.getByText(/questa azione viene registrata/i)).toBeInTheDocument()

    expect(screen.getByRole('radio', { name: 'Consegnata' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Accettata' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Rifiutata' })).toBeInTheDocument()

    expect(screen.getByRole('button', { name: /aggiorna la fattura/i })).toBeDisabled()
  })

  it('submit resta spento con solo esito scelto (motivo mancante) e con solo motivo (esito mancante)', () => {
    apriSheetPortale()
    const submit = screen.getByRole('button', { name: /aggiorna la fattura/i })

    fireEvent.click(screen.getByRole('radio', { name: 'Accettata' }))
    expect(submit).toBeDisabled() // manca il motivo

    fireEvent.change(screen.getByRole('textbox', { name: /motivo/i }), { target: { value: '   ' } })
    expect(submit).toBeDisabled() // motivo solo whitespace
  })

  it('esito scelto + motivo → POST stato-sdi-override con stato_sdi_atteso=smtp_inviata e nuovo_stato scelto', async () => {
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
    apriSheetPortale()

    fireEvent.click(screen.getByRole('radio', { name: 'Accettata' }))
    fireEvent.change(screen.getByRole('textbox', { name: /motivo/i }), {
      target: { value: 'Esito visto su Fatture e Corrispettivi il 16/07' },
    })
    const submit = screen.getByRole('button', { name: /aggiorna la fattura/i })
    expect(submit).toBeEnabled()
    fireEvent.click(submit)

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('/api/fatture/fat-stag-1/stato-sdi-override')
    const body = JSON.parse(init.body as string)
    expect(body).toEqual({
      stato_sdi_atteso: 'smtp_inviata',
      nuovo_stato: 'accettata',
      motivo: 'Esito visto su Fatture e Corrispettivi il 16/07',
    })
    await waitFor(() => expect(refreshMock).toHaveBeenCalled())
  })
})

describe('RiconciliazioniClient — ricevuta con firma non verificabile', () => {
  it('mostra l\'avviso di quarantena con role="alert"', () => {
    render(<RiconciliazioniClient pendenze={PENDENZE_PIENE} ruolo="titolare" />)
    openGroup(/ricevute da controllare a mano/i)
    expect(screen.getByRole('alert')).toHaveTextContent(/verifica firma non disponibile — controllo manuale obbligatorio/i)
  })
})

describe('RiconciliazioniClient — «Riprova lo storno» (TD04 rifiutato)', () => {
  beforeEach(() => {
    pushMock.mockClear()
  })

  it('apre il foglio con effetti + spunta obbligatoria; «Sì, procedi» naviga alla scheda fattura', () => {
    render(<RiconciliazioniClient pendenze={PENDENZE_PIENE} ruolo="titolare" />)
    openGroup(/note di credito rifiutate dallo stato/i)
    fireEvent.click(screen.getByRole('button', { name: /riprova lo storno/i }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/potrai rifare lo storno/i)).toBeInTheDocument()

    const conferma = screen.getByRole('button', { name: /sì, procedi/i })
    expect(conferma).toBeDisabled()

    fireEvent.click(screen.getByRole('checkbox'))
    expect(conferma).toBeEnabled()

    fireEvent.click(conferma)
    expect(pushMock).toHaveBeenCalledWith('/fatture/fat-orig-1')
  })
})

describe('OverrideStatoSheet — sheet override generico (uso standalone)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function baseProps(overrides: Partial<Parameters<typeof OverrideStatoSheet>[0]> = {}) {
    return {
      open: true,
      onClose: vi.fn(),
      onSuccess: vi.fn(),
      fatturaId: 'fat-9',
      numero: '2026-0009',
      tipoDocumento: 'TD01',
      statoAtteso: 'smtp_inviata',
      nuovoStato: 'pec_consegnata' as const,
      ...overrides,
    }
  }

  it('submit invia stato_sdi_atteso = stato mostrato (anti-stale)', async () => {
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
    render(<OverrideStatoSheet {...baseProps({ statoAtteso: 'pec_consegnata', nuovoStato: 'accettata' })} />)

    fireEvent.change(screen.getByRole('textbox', { name: /motivo/i }), { target: { value: 'Verificato sul portale SdI' } })
    fireEvent.click(screen.getByRole('button', { name: /sì, procedi/i }))

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse(init.body as string)
    expect(body.stato_sdi_atteso).toBe('pec_consegnata')
    expect(body.nuovo_stato).toBe('accettata')
  })

  it('TD04 → rifiutata: mostra l\'elenco effetti e la spunta è obbligatoria per abilitare il submit', async () => {
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
    render(<OverrideStatoSheet {...baseProps({ tipoDocumento: 'TD04', nuovoStato: 'rifiutata', statoAtteso: 'pec_consegnata' })} />)

    expect(screen.getByText(/potrai rifare lo storno/i)).toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: /motivo/i }), { target: { value: 'SdI ha scartato il TD04' } })
    const submit = screen.getByRole('button', { name: /sì, procedi/i })
    expect(submit).toBeDisabled() // motivo compilato ma spunta assente

    fireEvent.click(screen.getByRole('checkbox'))
    expect(submit).toBeEnabled()

    fireEvent.click(submit)
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse(init.body as string)
    expect(body.conferma_effetti_storno).toBe(true)
    expect(body.stato_sdi_atteso).toBe('pec_consegnata')
  })

  it('transizione non-TD04→rifiutata: nessun elenco effetti, submit abilitato col solo motivo', () => {
    render(<OverrideStatoSheet {...baseProps({ tipoDocumento: 'TD01', nuovoStato: 'accettata' })} />)
    expect(screen.queryByText(/potrai rifare lo storno/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: /motivo/i }), { target: { value: 'Confermato' } })
    expect(screen.getByRole('button', { name: /sì, procedi/i })).toBeEnabled()
  })
})

describe('UploadRicevutaSheet — Carica ricevuta PEC', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('scelta file → upload → "Ecco cosa ho letto" con dati reali → conferma → applica', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        esito: 'proposta',
        ricevutaId: 'evt-42',
        tipo: 'RC',
        fattura: { id: 'fat-22', numero: '2026-0022', stato_sdi: 'smtp_inviata' },
        transizioneProposta: 'accettata',
        esitoVerificaFirma: 'valida',
      }),
    })
    const onSuccess = vi.fn()
    render(<UploadRicevutaSheet open onClose={vi.fn()} onSuccess={onSuccess} numero="2026-0022" />)

    const file = new File(['<xml/>'], 'ricevuta.xml', { type: 'text/xml' })
    fireEvent.change(screen.getByLabelText(/file della ricevuta/i), { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: /leggi la ricevuta/i }))

    await waitFor(() => expect(screen.getByText('Ecco cosa ho letto')).toBeInTheDocument())
    expect(screen.getByText('2026-0022')).toBeInTheDocument()

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ esito: 'applicata' }) })
    fireEvent.click(screen.getByRole('button', { name: /conferma ricevuta/i }))

    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(fetchMock).toHaveBeenLastCalledWith('/api/pec/ricevute/evt-42/applica', expect.objectContaining({ method: 'POST' }))
  })
})

describe('SbloccaClaimSheet — Sblocca e reinvia', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('submit disabilitato finché motivo e spunta non sono entrambi compilati; invia verificata_cartella_inviata:true', async () => {
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
    const onSuccess = vi.fn()
    render(<SbloccaClaimSheet open fatturaId="fat-31" numero="2026-0031" onClose={vi.fn()} onSuccess={onSuccess} />)

    const submit = screen.getByRole('button', { name: /sblocca e reinvia/i })
    expect(submit).toBeDisabled()

    fireEvent.click(screen.getByRole('checkbox'))
    expect(submit).toBeDisabled() // manca ancora il motivo

    fireEvent.change(screen.getByRole('textbox', { name: /motivo/i }), { target: { value: 'Non presente nella cartella inviata' } })
    expect(submit).toBeEnabled()

    fireEvent.click(submit)
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(JSON.parse(init.body as string)).toEqual({
      motivo: 'Non presente nella cartella inviata',
      verificata_cartella_inviata: true,
    })
  })
})
