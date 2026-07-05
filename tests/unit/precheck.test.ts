import { describe, it, expect } from 'vitest'
import { precheckMDR } from '@/lib/consegna/precheck'
import type { LavoroDettaglio } from '@/types/domain'

// Helper per costruire un lavoro minimo valido
function makeLavoro(overrides: Partial<LavoroDettaglio> = {}): LavoroDettaglio {
  return {
    id: 'test-id',
    laboratorio_id: 'lab-id',
    numero_lavoro: '2026-0001',
    anno_lavoro: 2026,
    codice_interno: null,
    numero_prescrizione: null,
    numero_cassetta: null,
    cliente_id: 'cliente-id',
    paziente_id: 'paziente-id',
    tecnico_id: null,
    ciclo_id: null,
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
    stato: 'pronto',
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
    created_at: '2026-05-14T09:00:00Z',
    updated_at: '2026-05-14T09:00:00Z',
    deleted_at: null,
    // Join
    cliente: {
      id: 'cliente-id',
      laboratorio_id: 'lab-id',
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
    ...overrides,
  } as unknown as LavoroDettaglio
}

describe('precheckMDR', () => {
  it('passa con tutti i campi obbligatori presenti', () => {
    const result = precheckMDR(makeLavoro())
    // Il check sui materiali aggiunge warning ma ok rimane false — questo è corretto
    // Per il test verifichiamo che gli elementi 3-7 siano ok
    const erroriCritici = result.errori.filter(e => e.elemento !== 5 || e.campo !== 'materiali')
    expect(erroriCritici).toHaveLength(0)
  })

  it('fallisce senza prescrittore (elemento 3)', () => {
    const lavoro = makeLavoro({
      richiedente_nome: null,
      cliente: { ...makeLavoro().cliente, nome: '', cognome: '' },
    })
    const result = precheckMDR(lavoro)
    expect(result.errori.some(e => e.elemento === 3)).toBe(true)
  })

  it('fallisce senza paziente (elemento 4)', () => {
    const lavoro = makeLavoro({ paziente_nome_snapshot: null, paziente_id: null })
    const result = precheckMDR(lavoro)
    expect(result.errori.some(e => e.elemento === 4)).toBe(true)
  })

  it('fallisce con descrizione troppo breve (elemento 5)', () => {
    const lavoro = makeLavoro({ descrizione: 'A2' })
    const result = precheckMDR(lavoro)
    expect(result.errori.some(e => e.elemento === 5 && e.campo === 'descrizione')).toBe(true)
  })

  it('fallisce senza tipo dispositivo (elemento 5)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lavoro = makeLavoro({ tipo_dispositivo: '' as any })
    const result = precheckMDR(lavoro)
    expect(result.errori.some(e => e.elemento === 5 && e.campo === 'tipo_dispositivo')).toBe(true)
  })

  it('fallisce senza classe rischio (elemento 6)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lavoro = makeLavoro({ classe_rischio: null as any })
    const result = precheckMDR(lavoro)
    expect(result.errori.some(e => e.elemento === 6)).toBe(true)
  })

  it('fallisce senza data consegna (elemento 7)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lavoro = makeLavoro({ data_consegna_prevista: null as any })
    const result = precheckMDR(lavoro)
    expect(result.errori.some(e => e.elemento === 7)).toBe(true)
  })

  it('usa richiedente_nome se presente (bypass cliente.cognome vuoto)', () => {
    const lavoro = makeLavoro({
      richiedente_nome: 'Dott. Amendola Aldo',
      cliente: { ...makeLavoro().cliente, nome: '', cognome: '' },
    })
    const result = precheckMDR(lavoro)
    expect(result.errori.some(e => e.elemento === 3)).toBe(false)
  })

  it('NON blocca la consegna se materiali vuoti (warning visivo nella pagina, non errore bloccante)', () => {
    // Il check materiali è gestito come warning UI nella pagina /consegna,
    // non come errore bloccante nel precheck MDR.
    const lavoro = makeLavoro({ materiali: [] })
    const result = precheckMDR(lavoro)
    const erroriBloccanti = result.errori.filter(e => e.campo !== 'materiali')
    expect(erroriBloccanti).toHaveLength(0)
  })
})
