// @vitest-environment node
// Piano E — Task 1: DdC PDF content validation
// 8 elementi obbligatori Allegato XIII MDR 2017/745
// Zero DB, zero Supabase — fixture inline

import { describe, it, expect, beforeAll } from 'vitest'
import { renderPdfDocument } from '@/lib/pdf/render-document'
import { createElement } from 'react'
import { PDFParse } from 'pdf-parse'
import { DdcTemplate } from '@/components/features/pdf/DdcTemplate'
import type { DichiarazioneConformita } from '@/types/domain'
import { LAB_FIXTURE, LAVORO_FIXTURE } from './helpers/pdf-fixtures'

// ─── Fixtures ─────────────────────────────────────────────────────────────────
// LAB_FIXTURE/LAVORO_FIXTURE: vedi tests/unit/helpers/pdf-fixtures.ts (condivise).
// LAB_FIXTURE è usato per logo_url (null) e come fallback nei metadata del Document.
// Le sezioni §1 e §8 PRRC leggono da ddc.fabbricante_* e ddc.prrc_*, non dal lab.

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
  norme_json: null,
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
    const buffer = await renderPdfDocument(element)
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
    const buffer = await renderPdfDocument(element)
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

  it('§1 stampa SRN EUDAMED del fabbricante quando presente sul laboratorio', async () => {
    // LAB_FIXTURE condivisa ha srn_eudamed: null (caso comune — lab custom-made
    // esente EUDAMED, MDCG 2021-13). Variante locale per verificare il rendering
    // quando il campo è valorizzato, senza mutare la fixture condivisa.
    const labConSrn = { ...LAB_FIXTURE, srn_eudamed: 'IT-CA-000123456' }
    const element = createElement(DdcTemplate, {
      lavoro: LAVORO_FIXTURE,
      lab: labConSrn,
      ddc: DDC_FIXTURE,
    })
    const buffer = await renderPdfDocument(element)
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy()

    expect(result.text).toContain('IT-CA-000123456')
  })

  it('§1 non stampa riga SRN EUDAMED quando assente (lab custom-made esente, MDCG 2021-13)', () => {
    // DDC_FIXTURE/LAB_FIXTURE usate in beforeAll hanno srn_eudamed: null
    expect(pdfText.toLowerCase()).not.toContain('srn eudamed')
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

  it('§5 stampa numero lavoro (dati identificativi del dispositivo, elemento 2 Allegato XIII)', () => {
    expect(pdfText).toContain('LAV-2026-0001')
  })

  it('§5 stampa dicitura "fabbricato su misura" (elemento 3 Allegato XIII)', () => {
    // Formula presente in uso_esclusivo_paziente (§4) — "fabbricato su misura
    // esclusivamente per il paziente indicato"
    expect(pdfText.toLowerCase()).toContain('fabbricato su misura')
  })

  it('§5/§7 stampa dicitura assenza marcatura CE (Art. 20(1) MDR — dispositivi su misura)', () => {
    expect(pdfText.toLowerCase()).toContain('marcatura ce')
    expect(pdfText).toContain('Art. 20(1)')
  })

  it('nessun riferimento residuo alla Direttiva 93/42/CEE (abrogata dal 26/05/2024)', () => {
    expect(pdfText).not.toContain('93/42')
  })

  // ── §6 Classificazione MDR ────────────────────────────────────────────────

  it('§6 stampa classe di rischio formattata ("Classe IIa")', () => {
    expect(pdfText).toContain('Classe IIa')
  })

  it('§6 Classe IIa: nessun contenuto tecnico extra oltre alla classificazione (conclusione normativa)', () => {
    // Allegato XIII punto 1(f) non impone contenuti tecnici aggiuntivi specifici
    // per la Classe IIa oltre alla classe di rischio stessa — il template tratta
    // tutte le classi allo stesso modo, correttamente. Test di documentazione:
    // verifica solo che la classe sia stampata (già coperto sopra), nessun gap.
    expect(pdfText).toContain('Classe IIa')
  })

  // ── §7 Dichiarazione di Conformità ───────────────────────────────────────

  it('§7 contiene riferimento ad Allegato XIII', () => {
    expect(pdfText).toContain('Allegato XIII')
  })

  it('§7 contiene riferimento esplicito ad Allegato I (requisiti generali di sicurezza e prestazione, elemento 7 Allegato XIII)', () => {
    // pdf-parse può spezzare la riga tra "Allegato" e "I" a causa del wrapping
    // del testo nel box PDF — regex tollerante a whitespace/newline nel mezzo.
    expect(pdfText).toMatch(/Allegato\s+I(?!\w)/)
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

  it('§8 stampa luogo di emissione (elemento 8 Allegato XIII — luogo, data e firma)', () => {
    expect(pdfText).toContain('Serre (SA), Italia')
  })

  // ── §6-bis Norme armonizzate applicate ───────────────────────────────────

  it('§6-bis stampa codice e titolo delle norme armonizzate quando presenti', async () => {
    const ddcConNorme = {
      ...DDC_FIXTURE,
      norme_json: [
        { codice: 'EN ISO 6872:2015', titolo: 'Dental ceramic materials' },
        { codice: 'EN ISO 22674:2016', titolo: 'Metallic materials', anno: 2016 },
      ],
    }
    const element = createElement(DdcTemplate, {
      lavoro: LAVORO_FIXTURE,
      lab: LAB_FIXTURE,
      ddc: ddcConNorme,
    })
    const buffer = await renderPdfDocument(element)
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy()

    expect(result.text).toContain('EN ISO 6872:2015')
    expect(result.text).toContain('Dental ceramic materials')
    expect(result.text).toContain('EN ISO 22674:2016')
    expect(result.text).toContain('2016')
  })

  it('§6-bis non compare quando norme_json è vuoto o assente', () => {
    // DDC_FIXTURE (usata in beforeAll per pdfText) ha norme_json: null
    expect(pdfText.toLowerCase()).not.toContain('norme armonizzate')
  })
})
