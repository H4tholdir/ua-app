import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LavoroFormClient } from '../../src/components/features/lavori/LavoroFormClient'
import type { LavoroDettaglio } from '../../src/types/domain'

// LavoroFormClient usa useRouter() di next/navigation — fuori da un App Router
// reale l'hook lancia un invariant error, va mockato.
const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: vi.fn(),
  }),
}))

// Helper minimo — stesso pattern di tests/unit/LavoroFormClient.fase.test.tsx
function makeLavoro(overrides: Partial<LavoroDettaglio> = {}): LavoroDettaglio {
  return {
    id: 'lavoro-1',
    laboratorio_id: 'lab-1',
    numero_lavoro: '2026-0001',
    anno_lavoro: 2026,
    codice_interno: null,
    numero_prescrizione: null,
    numero_cassetta: null,
    cliente_id: 'cliente-id',
    paziente_id: null,
    tecnico_id: null,
    ciclo_id: 'ciclo-1',
    paziente_nome_snapshot: 'ROSSI MARIO',
    paziente_nascita_snapshot: null,
    tipo_dispositivo: 'protesi_fissa',
    descrizione: 'Corona ceramica 14 colore A2',
    note_interne: null,
    richiedente_nome: null,
    colore_dente: null,
    colore_collo: null,
    colore_corpo: null,
    colore_incisale: null,
    effetti_speciali: null,
    tecnica_colore: null,
    colorazione_esterna: null,
    denti_coinvolti: null,
    arcata: null,
    anamnesi_note: null,
    anamnesi_bruxismo: false,
    anamnesi_precauzioni: null,
    anamnesi_altri_dispositivi: null,
    classe_rischio: 'classe_iia',
    norma_riferimento: null,
    da_conformare: true,
    dispositivo_semilavorato: false,
    stato: 'in_lavorazione',
    priorita: 'normale',
    data_ingresso: '2026-05-14T09:00:00Z',
    data_consegna_prevista: '2026-05-20',
    ora_consegna: null,
    data_prima_prova: null,
    data_seconda_prova: null,
    data_terza_prova: null,
    data_consegna_effettiva: null,
    file_stl_url: null,
    immagini_urls: null,
    impronta_digitale: false,
    buono_pdf_url: null,
    buono_numero: null,
    listino_id: null,
    prezzo_unitario: null,
    codice_iva: 'N4',
    natura_iva: 'N4',
    incluso_in_fattura: false,
    conformato: false,
    data_conformazione: null,
    is_rifacimento: false,
    consegna_in_corso: false,
    consegna_tap_at: null,
    consegna_completata_at: null,
    post_consegna_correzioni: 0,
    consegna_precheck_passato_al_primo_tentativo: null,
    spedizione_corriere: null,
    spedizione_tracking: null,
    spedizione_stato: null,
    spedizione_data_prevista: null,
    spedizione_note: null,
    segnalazione_tipo: null,
    segnalazione_nota: null,
    segnalazione_at: null,
    segnalazione_by: null,
    segnalazione_risolta: false,
    created_at: '2026-05-14T09:00:00Z',
    updated_at: '2026-05-14T09:00:00Z',
    deleted_at: null,
    cliente: {
      id: 'cliente-id',
      laboratorio_id: 'lab-1',
      studio_nome: null,
      nome: 'Mario',
      cognome: 'Rossi',
      telefono: '3331234567',
      email: null,
      partita_iva: null,
      codice_fiscale: null,
      codice_sdi: '1234567',
      pec: null,
      indirizzo: null,
      cap: null,
      citta: null,
      provincia: null,
      paese: 'IT',
      listino_numero: 1,
      sconto_percentuale: 0,
      tecnico_default_id: null,
      modalita_pagamento: null,
      non_soggetto_fe: false,
      portale_token: 'tok-test',
      note: null,
    },
    paziente: null,
    tecnico: null,
    lavorazioni: [],
    appuntamenti: [],
    immagini: [],
    fasi: [],
    materiali: [],
    partitario: [],
    ddc: null,
    laboratorio: { nome: 'Lab Test', telefono: null },
    ...overrides,
  } as unknown as LavoroDettaglio
}

/**
 * Bug QA manuale: click su CONSEGNA con form dirty e autosave che fallisce
 * (es. 500 "column not found" pre-fix, o qualunque errore di rete/API)
 * — save() nel hook useLavoroForm rilancia l'errore dopo aver settato
 * saveError. Se l'onClick non lo intercetta, l'eccezione si propaga fuori
 * dall'handler async e router.push non viene mai eseguito: nessuna
 * navigazione, nessun feedback visibile (blocco silenzioso).
 */
describe('LavoroFormClient — pulsante CONSEGNA con autosave fallito', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = vi.fn()
    pushMock.mockClear()
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('autosave fallisce (PATCH 500) → NON naviga a /consegna, resta sulla pagina con errore visibile, nessuna eccezione non gestita', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Could not find the column' }),
    })

    // Cattura esplicitamente le unhandled rejection: il bug originale
    // (onClick async senza try/catch attorno a `await save()`) fa sì che
    // save() rilanci l'errore e la Promise dell'onClick venga rigettata
    // senza che nessuno la osservi — React/il DOM non hanno un handler per
    // l'onClick, quindi diventa una unhandled rejection reale nel browser.
    // Un test che verifichi solo "push non chiamato" passerebbe anche con
    // il bug presente (il push semplicemente non viene mai raggiunto per
    // via dell'eccezione) — non sarebbe quindi discriminante. Verificare
    // l'assenza di unhandled rejection rende il test un vero RED/GREEN.
    const unhandled: unknown[] = []
    const onUnhandledRejection = (event: PromiseRejectionEvent | { reason: unknown }) => {
      unhandled.push('reason' in event ? event.reason : event)
    }
    process.on('unhandledRejection', onUnhandledRejection as (reason: unknown) => void)

    try {
      render(<LavoroFormClient lavoro={makeLavoro()} />)

      // Sporca il form modificando un campo (tab "Dati" è quella di default).
      // Attende il render async del pannello (AnimatePresence mode="wait").
      const descrizioneInput = await screen.findByPlaceholderText(/Corona ceramica 14, colore A2/i)
      fireEvent.change(descrizioneInput, { target: { value: 'Descrizione modificata' } })

      const consegnaButton = screen.getByRole('button', { name: /Vai alla consegna del lavoro/i })
      fireEvent.click(consegnaButton)

      // Attende che la fetch fallita sia stata processata
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())

      // Il salvataggio è fallito: niente navigazione
      await waitFor(() => {
        expect(pushMock).not.toHaveBeenCalledWith('/lavori/lavoro-1/consegna')
      })

      // Feedback visibile: il pulsante Salva mostra il testo di errore
      // ("⚠ Errore — riprova") — isDirty resta true dopo un save fallito,
      // quindi il pulsante resta montato e visibile all'utente.
      await waitFor(() =>
        expect(screen.getByText(/Errore — riprova/i)).toBeInTheDocument()
      )

      // Dà un tick alla event loop per lasciare emergere eventuali
      // unhandled rejection residue prima di verificare.
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(unhandled).toEqual([])
    } finally {
      process.off('unhandledRejection', onUnhandledRejection as (reason: unknown) => void)
    }
  })

  it('autosave riesce (PATCH 200) → naviga regolarmente a /consegna', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ lavoro: { id: 'lavoro-1' } }),
    })

    render(<LavoroFormClient lavoro={makeLavoro()} />)

    const descrizioneInput = await screen.findByPlaceholderText(/Corona ceramica 14, colore A2/i)
    fireEvent.change(descrizioneInput, { target: { value: 'Descrizione modificata' } })

    const consegnaButton = screen.getByRole('button', { name: /Vai alla consegna del lavoro/i })
    fireEvent.click(consegnaButton)

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/lavori/lavoro-1/consegna'))
  })

  it('form non dirty → naviga subito senza tentare il salvataggio', async () => {
    render(<LavoroFormClient lavoro={makeLavoro()} />)

    const consegnaButton = screen.getByRole('button', { name: /Vai alla consegna del lavoro/i })
    fireEvent.click(consegnaButton)

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/lavori/lavoro-1/consegna'))
    // NB: il mount di CicloComboBox con ciclo_id già valorizzato (vedi
    // makeLavoro) fa una fetch di hydration verso /api/cicli?id= — non è il
    // salvataggio che questo test verifica. L'assenza di PATCH verso
    // /api/lavori/lavoro-1 è la garanzia che serve qui.
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/lavori/lavoro-1'),
      expect.anything()
    )
  })
})
