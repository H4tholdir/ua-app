import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))
import { LavoroFormClient } from '../../src/components/features/lavori/LavoroFormClient'
import type { LavoroDettaglio } from '../../src/types/domain'

// Helper minimo — stesso pattern di tests/unit/LavoroFormClient.consegna-autosave.test.tsx
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

describe('LavoroFormClient bridged', () => {
  it('bridged=true NON rende il pulsante CONSEGNA', () => {
    render(<LavoroFormClient lavoro={makeLavoro()} bridged defaultTab="lavorazioni" />)
    expect(
      screen.queryByRole('button', { name: /vai alla consegna/i })
    ).toBeNull()
  })

  it('bridged=false (default) rende CONSEGNA', () => {
    render(<LavoroFormClient lavoro={makeLavoro()} />)
    expect(
      screen.getByRole('button', { name: /vai alla consegna/i })
    ).toBeInTheDocument()
  })
})
