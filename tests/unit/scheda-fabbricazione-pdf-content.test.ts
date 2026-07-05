// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest'
import { renderPdfDocument } from '@/lib/pdf/render-document'
import { createElement } from 'react'
import { PDFParse } from 'pdf-parse'
import { SchedaFabbricazioneTemplate } from '@/components/features/pdf/SchedaFabbricazioneTemplate'
import type { LavoroDettaglio, LavoroFase } from '@/types/domain'
import { LAB_FIXTURE, LAVORO_FIXTURE } from './helpers/pdf-fixtures'

const FASE_OK: LavoroFase = {
  id: 'fase-lav-001',
  laboratorio_id: 'lab-test-001',
  lavoro_id: 'lav-test-001',
  fase_id: 'fp-001',
  tecnico_id: 'tec-001',
  eseguita_at: '2026-05-11T09:00:00.000Z',
  esito: 'ok',
  note: null,
  materiali_usati: null,
  attrezzatura_usata: null,
  valore_misurato: null,
  non_conforme: false,
  azione_correttiva: null,
  fase: {
    codice_fase: 'MODELLAZIONE',
    descrizione: 'Modellazione CAD/CAM',
    ordine: 1,
    obbligatoria: true,
    misurazioni_da_rilevare: false,
  },
  tecnico: { nome: 'Luca', cognome: 'Verdi' },
}

const FASE_NON_CONFORME: LavoroFase = {
  id: 'fase-lav-002',
  laboratorio_id: 'lab-test-001',
  lavoro_id: 'lav-test-001',
  fase_id: 'fp-002',
  tecnico_id: 'tec-002',
  eseguita_at: '2026-05-12T14:30:00.000Z',
  esito: 'non_conforme',
  note: null,
  materiali_usati: null,
  attrezzatura_usata: null,
  valore_misurato: null,
  non_conforme: true,
  azione_correttiva: 'Ripassata lucidatura, esito positivo al secondo controllo',
  fase: {
    codice_fase: 'RIFINITURA',
    descrizione: 'Rifinitura e lucidatura',
    ordine: 2,
    obbligatoria: true,
    misurazioni_da_rilevare: false,
  },
  tecnico: { nome: 'Anna', cognome: 'Bianchi' },
}

const FASE_IN_ATTESA: LavoroFase = {
  id: 'fase-lav-003',
  laboratorio_id: 'lab-test-001',
  lavoro_id: 'lav-test-001',
  fase_id: 'fp-003',
  tecnico_id: null,
  eseguita_at: null,
  esito: null,
  note: null,
  materiali_usati: null,
  attrezzatura_usata: null,
  valore_misurato: null,
  non_conforme: false,
  azione_correttiva: null,
  fase: {
    codice_fase: 'CONTROLLO_FINALE',
    descrizione: 'Controllo qualità finale',
    ordine: 3,
    obbligatoria: true,
    misurazioni_da_rilevare: false,
  },
  tecnico: null,
}

const LAVORO_CON_FASI: LavoroDettaglio = {
  ...LAVORO_FIXTURE,
  fasi: [FASE_OK, FASE_NON_CONFORME, FASE_IN_ATTESA],
}

let pdfText = ''

describe('SchedaFabbricazioneTemplate — PDF content validation', () => {
  beforeAll(async () => {
    const element = createElement(SchedaFabbricazioneTemplate, {
      lavoro: LAVORO_CON_FASI,
      lab: LAB_FIXTURE,
    })
    const buffer = await renderPdfDocument(element)
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy()
    pdfText = result.text
  }, 30_000)

  it('PDF > 1 KB', async () => {
    const element = createElement(SchedaFabbricazioneTemplate, {
      lavoro: LAVORO_CON_FASI,
      lab: LAB_FIXTURE,
    })
    const buffer = await renderPdfDocument(element)
    expect(buffer.length).toBeGreaterThan(1024)
  })

  it('titolo contiene "scheda di fabbricazione" (case-insensitive)', () => {
    expect(pdfText.toLowerCase()).toContain('scheda di fabbricazione')
  })

  it('footer NON cita Allegato XIII come base del contenuto fasi (corregge l\'errore di attribuzione originale)', () => {
    expect(pdfText).not.toContain('Allegato XIII')
  })

  it('footer cita Art. 10(9) MDR come base normativa corretta', () => {
    expect(pdfText).toContain('10(9)')
  })

  it('stampa numero lavoro', () => {
    expect(pdfText).toContain(LAVORO_FIXTURE.numero_lavoro)
  })

  it('stampa codice ITCA del laboratorio', () => {
    expect(pdfText).toContain('ITCA01051686')
  })

  // ── Fase OK ──────────────────────────────────────────────────────────────

  it('fase OK: stampa codice fase', () => {
    expect(pdfText).toContain('MODELLAZIONE')
  })

  it('fase OK: stampa nome operatore', () => {
    expect(pdfText).toContain('Luca Verdi')
  })

  it('fase OK: stampa esito "OK"', () => {
    expect(pdfText).toContain('OK')
  })

  // ── Fase non conforme ────────────────────────────────────────────────────

  it('fase non conforme: stampa esito "Non conforme"', () => {
    expect(pdfText).toContain('Non conforme')
  })

  it('fase non conforme: stampa azione correttiva', () => {
    expect(pdfText).toContain('Ripassata lucidatura, esito positivo al secondo controllo')
  })

  // ── Fase in attesa ───────────────────────────────────────────────────────

  it('fase in attesa: stampa "In attesa" (esito null, non ancora eseguita)', () => {
    expect(pdfText).toContain('In attesa')
  })

  it('fase in attesa: stampa comunque il codice fase (nessun crash su tecnico/eseguita_at null)', () => {
    expect(pdfText).toContain('CONTROLLO_FINALE')
  })
})
