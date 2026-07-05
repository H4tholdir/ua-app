import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LavoroFormClient } from '../../src/components/features/lavori/LavoroFormClient'
import type { LavoroDettaglio, LavoroFase } from '../../src/types/domain'

// LavoroFormClient usa useRouter() di next/navigation — fuori da un App Router
// reale l'hook lancia un invariant error, va mockato.
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

const FASE: LavoroFase = {
  id: 'fase-1',
  lavoro_id: 'lavoro-1',
  fase_id: 'fp-1',
  laboratorio_id: 'lab-1',
  esito: null,
  eseguita_at: null,
  note: null,
  materiali_usati: null,
  attrezzatura_usata: null,
  valore_misurato: null,
  non_conforme: false,
  azione_correttiva: null,
  tecnico_id: null,
  fase: {
    codice_fase: 'OL10',
    descrizione: 'Disegno modelli progettazione',
    ordine: 1,
    obbligatoria: true,
    misurazioni_da_rilevare: false,
  },
  tecnico: null,
}

// Helper per costruire un LavoroDettaglio minimo valido (stesso pattern di
// tests/unit/precheck.test.ts)
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
    // Join
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
    fasi: [FASE],
    materiali: [],
    partitario: [],
    ddc: null,
    laboratorio: { nome: 'Lab Test', telefono: null },
    ...overrides,
  } as unknown as LavoroDettaglio
}

// Naviga alla tab "Prod." — AnimatePresence mode="wait" rende il montaggio
// del pannello asincrono, quindi il pulsante va atteso con findByRole.
async function goToProduzioneTab() {
  fireEvent.click(screen.getByRole('tab', { name: 'Prod.' }))
  return screen.findByRole('button', { name: 'OK' })
}

describe('LavoroFormClient — handleUpdateFase (fetch + rollback reale)', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('fetch ok:true → update ottimistico resta (nessun rollback)', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true })

    render(<LavoroFormClient lavoro={makeLavoro()} />)

    await goToProduzioneTab()
    fireEvent.click(screen.getByRole('button', { name: 'Non conf.' }))

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/lavori/lavoro-1/fasi/fase-1',
      expect.objectContaining({ method: 'PATCH' })
    )

    // Il campo "Azione correttiva" appare solo quando esito === 'non_conforme'.
    // Un rollback erroneo su ok:true azzererebbe esito e farebbe sparire il
    // campo: attendere la fetch e verificare che il campo sia ancora presente
    // è una prova più solida della sola aria-pressed (già true in modo
    // sincrono per via dell'update ottimistico).
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(screen.getByLabelText(/Azione correttiva/i)).toBeInTheDocument()
    )
  })

  it('fetch ok:false → rollback allo stato precedente', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false })

    render(<LavoroFormClient lavoro={makeLavoro()} />)

    const okButton = await goToProduzioneTab()

    // Update ottimistico immediato
    fireEvent.click(okButton)
    expect(okButton).toHaveAttribute('aria-pressed', 'true')

    // Dopo il rollback l'esito torna null → pulsante non più premuto
    await waitFor(() => expect(okButton).toHaveAttribute('aria-pressed', 'false'))
  })

  it('fetch rigetta la Promise → rollback allo stato precedente', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network error'))

    render(<LavoroFormClient lavoro={makeLavoro()} />)

    const okButton = await goToProduzioneTab()

    fireEvent.click(okButton)
    expect(okButton).toHaveAttribute('aria-pressed', 'true')

    await waitFor(() => expect(okButton).toHaveAttribute('aria-pressed', 'false'))
  })

  it('B18.7 — doppio tap rapido sulla stessa fase: il rollback tardivo della prima request (fallita) non deve sovrascrivere l\'update già confermato dalla seconda', async () => {
    let resolveFirst!: (v: { ok: boolean }) => void
    const firstResponse = new Promise<{ ok: boolean }>((resolve) => { resolveFirst = resolve })

    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(firstResponse) // 1° tap ("OK") — resta pending
      .mockResolvedValueOnce({ ok: true }) // 2° tap ("Non conf.") — risponde subito

    render(<LavoroFormClient lavoro={makeLavoro()} />)
    const okButton = await goToProduzioneTab()

    // 1° tap: "OK" — update ottimistico, fetch #1 parte ma resta pending
    fireEvent.click(okButton)
    expect(okButton).toHaveAttribute('aria-pressed', 'true')

    // 2° tap, prima che la prima risposta arrivi: "Non conf." — fetch #2
    fireEvent.click(screen.getByRole('button', { name: 'Non conf.' }))
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2))

    // La 2° request (rapida) risolve con ok:true → resta non conforme
    await waitFor(() => expect(screen.getByLabelText(/Azione correttiva/i)).toBeInTheDocument())

    // Ora arriva, in ritardo, la risposta della 1° request — fallita (ok:false)
    resolveFirst({ ok: false })

    // Il rollback della 1° request è STALE: non deve azzerare lo stato più
    // recente impostato dalla 2° — "Azione correttiva" deve restare visibile
    await waitFor(() => expect(screen.getByLabelText(/Azione correttiva/i)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Non conf.' })).toHaveAttribute('aria-pressed', 'true')
  })
})
