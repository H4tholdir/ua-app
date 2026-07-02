// @vitest-environment node
// Piano E — Task 1: DdC PDF content validation
// 8 elementi obbligatori Allegato XIII MDR 2017/745
// Zero DB, zero Supabase — fixture inline

import { describe, it, expect, beforeAll } from 'vitest'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { PDFParse } from 'pdf-parse'
import { DdcTemplate } from '@/components/features/pdf/DdcTemplate'
import type {
  LavoroDettaglio,
  Laboratorio,
  DichiarazioneConformita,
} from '@/types/domain'

// ─── Fixtures ─────────────────────────────────────────────────────────────────
// LAB_FIXTURE: usato per logo_url (null) e come fallback nei metadata del Document.
// Le sezioni §1 e §8 PRRC leggono da ddc.fabbricante_* e ddc.prrc_*, non dal lab.
const LAB_FIXTURE: Laboratorio = {
  id: 'lab-test-001',
  nome: 'Lab Opromolla',
  ragione_sociale: 'Laboratorio Odontotecnico Opromolla S.r.l.',
  partita_iva: '03508740655',
  codice_fiscale: null,
  indirizzo: 'Via Roma 12',
  cap: '84028',
  citta: 'Serre',
  provincia: 'SA',
  telefono: null,
  email: null,
  pec: null,
  logo_url: null,
  logo_print_url: null,
  codice_itca: 'ITCA01051686',
  srn_eudamed: null,
  prrc_nome: 'Filippo Opromolla',
  prrc_qualifica: 'Odontotecnico abilitato',
  firma_url: null,
  firma_ddc_url: null,
  sfondo_ddc_url: null,
  intestazione_ddc: null,
  intestazione_fattura: null,
  intestazione_buono: null,
  regime_fiscale: 'RF01',
  codice_iva_default: 'N4',
  pec_vault_key_id: null,
  pec_smtp_configurata: false,
  piano: 'lab',
}

// DDC_FIXTURE: tutti i campi che il template stampa direttamente.
// §1 Fabbricante legge: fabbricante_nome, fabbricante_indirizzo, fabbricante_piva, fabbricante_itca
// §3 Prescrittore: prescrittore_nome
// §4 Paziente: paziente_nome + paziente_cognome
// §5 Dispositivo: tipo_dispositivo, descrizione_dispositivo
// §6 Classificazione: classe_rischio
// §7 Conformità: testo_conformita_snapshot
// §8 PRRC firma: prrc_nome, prrc_qualifica
const DDC_FIXTURE: DichiarazioneConformita = {
  id: 'ddc-test-001',
  laboratorio_id: 'lab-test-001',
  lavoro_id: 'lav-test-001',
  numero_ddc: 'DDC-2026-0001',
  anno_ddc: 2026,
  progressivo_ddc: 1,
  pdf_url: null,
  pdf_sha256: null,
  storage_path_pdf: null,
  pdf_generato_at: null,
  inviata_al_dentista: false,
  inviata_al_dentista_at: null,
  data_emissione: '2026-05-15T10:00:00.000Z',
  stato: 'bozza',
  // §1 Allegato XIII — Fabbricante (snapshot immutabile)
  fabbricante_nome: 'Laboratorio Odontotecnico Opromolla S.r.l.',
  fabbricante_indirizzo: 'Via Roma 12, Serre (SA)',
  fabbricante_piva: '03508740655',
  fabbricante_itca: 'ITCA01051686',
  luogo_emissione: 'Serre (SA), Italia',
  // §3 Prescrittore
  prescrittore_nome: 'Dott. Mario Rossi',
  prescrizione_id: null,
  // §4 Paziente
  paziente_nome: 'M.R.',
  paziente_cognome: null,
  // §5 Dispositivo
  tipo_dispositivo: 'protesi_fissa',
  descrizione_dispositivo:
    'Corona ceramica su impianto elemento 14 colore A2',
  denti_coinvolti: null, // letti dal lavoro
  uso_esclusivo_paziente:
    'Dispositivo fabbricato su misura esclusivamente per il paziente indicato',
  prescrizione_caratteristiche: null,
  contiene_sostanze_o_tessuti: false,
  sostanze_tessuti_dettaglio: null,
  // §6 Classificazione
  classe_rischio: 'classe_iia',
  norma_riferimento: null,
  // §7 Conformità
  testo_conformita_snapshot:
    "Il fabbricante dichiara che il presente dispositivo e' conforme ai requisiti generali di sicurezza e prestazione di cui all'Allegato I e ai disposti dell'Allegato XIII del Reg. (UE) 2017/745.",
  // §8 PRRC
  prrc_nome: 'Filippo Opromolla',
  prrc_qualifica: 'Odontotecnico abilitato',
  firma_ddc_storage_path: null,
  firma_ddc_sha256: null,
  rischi_residui_snapshot: null,
}

// LAVORO_FIXTURE: denti_coinvolti e materiali letti direttamente dal lavoro nel template
const LAVORO_FIXTURE: LavoroDettaglio = {
  id: 'lav-test-001',
  laboratorio_id: 'lab-test-001',
  numero_lavoro: 'LAV-2026-0001',
  consegna_in_corso: false,
  anno_lavoro: 2026,
  codice_interno: null,
  numero_prescrizione: null,
  numero_cassetta: null,
  cliente_id: 'cli-001',
  paziente_id: null,
  tecnico_id: null,
  ciclo_id: null,
  paziente_nome_snapshot: 'M.R.',
  paziente_nascita_snapshot: null,
  tipo_dispositivo: 'protesi_fissa',
  descrizione: 'Corona ceramica su impianto elemento 14 colore A2',
  note_interne: null,
  richiedente_nome: null,
  richiedente_email: null,
  colore_dente: 'A2',
  colore_collo: null,
  colore_corpo: null,
  colore_incisale: null,
  effetti_speciali: null,
  tecnica_colore: null,
  colorazione_esterna: null,
  denti_coinvolti: ['14'],
  denti_mancanti: null,
  denti_impianti: null,
  tipo_arco: null,
  arcata: null,
  anamnesi_note: null,
  anamnesi_bruxismo: false,
  anamnesi_precauzioni: null,
  anamnesi_altri_dispositivi: null,
  tipo_impronte: null,
  disinfettante_usato: null,
  lotto_disinfettante: null,
  materiali_allegati: [],
  tracciabilita_materiali_ok: false,
  materiali_incompleti_dettaglio: null,
  anamnesi_difficolta_manuali: false,
  classe_rischio: 'classe_iia',
  norma_riferimento: null,
  da_conformare: true,
  dispositivo_semilavorato: false,
  stato: 'pronto',
  priorita: 'normale',
  data_ingresso: '2026-05-10T08:00:00.000Z',
  data_consegna_prevista: '2026-05-15T00:00:00.000Z',
  ora_consegna: null,
  data_prima_prova: null,
  data_seconda_prova: null,
  data_terza_prova: null,
  data_consegna_effettiva: null,
  file_stl_url: null,
  immagini_urls: null,
  impronta_digitale: false,
  listino_id: null,
  prezzo_unitario: null,
  codice_iva: 'N4',
  natura_iva: 'N4',
  incluso_in_fattura: false,
  decisione_fatturazione: 'in_attesa',
  conformato: false,
  data_conformazione: null,
  is_rifacimento: false,
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
  created_at: '2026-05-10T08:00:00.000Z',
  updated_at: '2026-05-10T08:00:00.000Z',
  deleted_at: null,
  // Join — obbligatori per LavoroDettaglio
  cliente: {
    id: 'cli-001',
    laboratorio_id: 'lab-test-001',
    studio_nome: null,
    nome: 'Mario',
    cognome: 'Rossi',
    telefono: null,
    email: null,
    partita_iva: null,
    codice_fiscale: null,
    codice_sdi: null,
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
    portale_token: 'tok-test-001',
    note: null,
  },
  paziente: null,
  tecnico: null,
  lavorazioni: [],
  appuntamenti: [],
  immagini: [],
  fasi: [],
  materiali: [
    {
      id: 'mat-001',
      laboratorio_id: 'lab-test-001',
      lavoro_id: 'lav-test-001',
      lotto_id: 'lot-001',
      magazzino_id: 'mag-001',
      quantita_usata: 1,
      unita_misura: 'pz',
      data_uso: '2026-05-12T00:00:00.000Z',
      numero_lotto_snapshot: 'LOT-2025-ZR-0042',
      nome_materiale_snapshot: 'Zirconia IPS e.max ZirCAD',
      produttore_snapshot: 'Ivoclar Vivadent',
    },
  ],
  ddc: null,
  laboratorio: null,
}

// ─── Test suite ───────────────────────────────────────────────────────────────

let pdfText = ''

describe('DdcTemplate — PDF content validation (Allegato XIII MDR 2017/745)', () => {
  beforeAll(async () => {
    const element = createElement(DdcTemplate, {
      lavoro: LAVORO_FIXTURE,
      lab: LAB_FIXTURE,
      ddc: DDC_FIXTURE,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(element as any)
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy()
    pdfText = result.text
  }, 30_000)

  // ── Struttura ─────────────────────────────────────────────────────────────

  it('PDF > 1 KB', async () => {
    const element = createElement(DdcTemplate, {
      lavoro: LAVORO_FIXTURE,
      lab: LAB_FIXTURE,
      ddc: DDC_FIXTURE,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(element as any)
    expect(buffer.length).toBeGreaterThan(1024)
  })

  it('titolo contiene "dichiarazione di conformita" (case-insensitive)', () => {
    // textTransform: 'uppercase' — react-pdf rende le lettere maiuscole nel PDF
    expect(pdfText.toLowerCase()).toContain('dichiarazione di conformita')
  })

  // ── §1 Fabbricante ────────────────────────────────────────────────────────

  it('§1 stampa ragione sociale del fabbricante', () => {
    expect(pdfText).toContain('Laboratorio Odontotecnico Opromolla S.r.l.')
  })

  it('§1 stampa indirizzo del fabbricante', () => {
    expect(pdfText).toContain('Via Roma 12')
  })

  it('§1 stampa Partita IVA del fabbricante', () => {
    expect(pdfText).toContain('03508740655')
  })

  it('§1 stampa codice ITCA del fabbricante', () => {
    expect(pdfText).toContain('ITCA01051686')
  })

  // ── §2 Numero DdC e data emissione ───────────────────────────────────────

  it('§2 stampa numero DdC', () => {
    expect(pdfText).toContain('DDC-2026-0001')
  })

  it('§2 stampa data di emissione formattata (dd/mm/yyyy)', () => {
    expect(pdfText).toContain('15/05/2026')
  })

  // ── §3 Prescrittore ───────────────────────────────────────────────────────

  it('§3 stampa nome prescrittore', () => {
    expect(pdfText).toContain('Dott. Mario Rossi')
  })

  // ── §4 Paziente ───────────────────────────────────────────────────────────

  it('§4 stampa nome paziente (pseudonimizzato)', () => {
    expect(pdfText).toContain('M.R.')
  })

  // ── §5 Dispositivo su misura ──────────────────────────────────────────────

  it('§5 stampa tipo dispositivo formattato ("Protesi Fissa")', () => {
    expect(pdfText).toContain('Protesi Fissa')
  })

  it('§5 stampa descrizione dispositivo', () => {
    expect(pdfText).toContain('Corona ceramica')
  })

  it('§5 stampa dente coinvolto (elemento 14)', () => {
    expect(pdfText).toContain('14')
  })

  it('§5 stampa nome materiale con lotto', () => {
    expect(pdfText).toContain('Zirconia IPS e.max ZirCAD')
  })

  it('§5 stampa numero lotto materiale', () => {
    expect(pdfText).toContain('LOT-2025-ZR-0042')
  })

  // ── §6 Classificazione MDR ────────────────────────────────────────────────

  it('§6 stampa classe di rischio formattata ("Classe IIa")', () => {
    expect(pdfText).toContain('Classe IIa')
  })

  // ── §7 Dichiarazione di Conformità ───────────────────────────────────────

  it('§7 contiene riferimento ad Allegato XIII', () => {
    expect(pdfText).toContain('Allegato XIII')
  })

  it('§7 contiene riferimento a Regolamento UE 2017/745', () => {
    expect(pdfText).toContain('2017/745')
  })

  it('§7 contiene riferimento ad Art. 52(8)', () => {
    expect(pdfText).toContain('Art. 52(8)')
  })

  it('§7 contiene testo di conformità ("conforme ai requisiti")', () => {
    expect(pdfText.toLowerCase()).toContain('conforme ai requisiti')
  })

  // ── §8 PRRC — Responsabile della Conformità ───────────────────────────────

  it('§8 stampa nome PRRC', () => {
    expect(pdfText).toContain('Filippo Opromolla')
  })

  it('§8 stampa qualifica PRRC', () => {
    expect(pdfText).toContain('Odontotecnico abilitato')
  })
})
