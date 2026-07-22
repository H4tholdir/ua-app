import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LavoroFormClient } from '../../src/components/features/lavori/LavoroFormClient'
import type { LavoroDettaglio } from '../../src/types/domain'

// LavoroFormClient usa useRouter() — va mockato fuori dall'App Router.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

// Fixture con numero_cassetta VALORIZZATO ('C12', non null): è la condizione che
// rende il test discriminante. `useLavoroForm.save()` costruisce il body come
// `{ ...data }`, e `data` è inizializzato col lavoro caricato — quindi senza lo
// strip esplicito il campo partirebbe SEMPRE (no-op silenzioso lato server, ma
// pur sempre inviato). Con numero_cassetta:null il test passerebbe anche col bug.
function makeLavoro(overrides: Partial<LavoroDettaglio> = {}): LavoroDettaglio {
  return {
    id: 'lavoro-1',
    laboratorio_id: 'lab-1',
    numero_lavoro: '2026-0001',
    anno_lavoro: 2026,
    codice_interno: null,
    numero_prescrizione: null,
    numero_cassetta: 'C12',
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

describe('LavoroFormClient — il PATCH del form NON invia MAI numero_cassetta (R1)', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ lavoro: { id: 'lavoro-1' } }),
    })
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('sporco il form (tab Dati) e salvo → il body PATCH verso /api/lavori/lavoro-1 non ha la chiave numero_cassetta', async () => {
    render(<LavoroFormClient lavoro={makeLavoro()} />)

    // Sporca il form modificando la descrizione (tab "Dati" di default).
    const descrizioneInput = await screen.findByPlaceholderText(/Corona ceramica 14, colore A2/i)
    fireEvent.change(descrizioneInput, { target: { value: 'Descrizione modificata' } })

    // Il pulsante Salva compare solo quando dirty.
    const salva = await screen.findByRole('button', { name: /Salva modifiche/i })
    fireEvent.click(salva)

    await waitFor(() => {
      const patch = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
        ([url, init]) => url === '/api/lavori/lavoro-1' && (init as RequestInit)?.method === 'PATCH'
      )
      expect(patch).toBeTruthy()
    })

    const patch = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
      ([url, init]) => url === '/api/lavori/lavoro-1' && (init as RequestInit)?.method === 'PATCH'
    )!
    const body = JSON.parse((patch[1] as RequestInit).body as string)
    // hasOwnProperty (non toEqual): il campo non deve MAI comparire nel payload,
    // né come valore né come chiave — stessa disciplina di orchestra-consegna-cassetta.
    expect(Object.prototype.hasOwnProperty.call(body, 'numero_cassetta')).toBe(false)
  })
})
