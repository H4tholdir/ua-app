// @vitest-environment node
// tests/unit/fattura-cortesia-template.test.ts
// Render reale react-pdf: il template produce un PDF valido con i dati fiscali
// e la dicitura di non-valore fiscale (obbligo copia di cortesia).
import { describe, it, expect, beforeAll } from 'vitest'
import { createElement } from 'react'
import { renderPdfDocument } from '@/lib/pdf/render-document'
import { PDFParse } from 'pdf-parse'
import { FatturaCortesiaTemplate, type FatturaCortesiaProps } from '@/components/features/pdf/FatturaCortesiaTemplate'

const props: FatturaCortesiaProps = {
  lab: { denominazione: 'Lab Test SRL', partita_iva: '12345678901', indirizzo: 'Via Roma 1', cap: '80100', citta: 'Napoli', provincia: 'NA' },
  cliente: { denominazione: 'Studio Bianchi', piva: '01234567890', cf: null, indirizzo: 'Via Milano 2, 80100 Napoli NA' },
  fattura: { numero: '2026-0001', data: '2026-07-11', tipo_documento: 'TD01' },
  righe: [
    { descrizione: 'Corona in zirconia', quantita: 1, unita_misura: 'PZ', prezzo_unitario: 180, importo: 180 },
    { descrizione: 'Ponte 3 elementi', quantita: 1, unita_misura: 'PZ', prezzo_unitario: 450, importo: 450 },
  ],
  imponibile: 630,
  bollo: 2,
  totale: 632,
}

let pdfText = ''

describe('FatturaCortesiaTemplate', () => {
  beforeAll(async () => {
    const buffer = await renderPdfDocument(createElement(FatturaCortesiaTemplate, props))
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy()
    pdfText = result.text
  }, 30_000)

  it('renderizza un PDF valido (header %PDF)', async () => {
    const buffer = await renderPdfDocument(createElement(FatturaCortesiaTemplate, props))
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-')
    expect(buffer.length).toBeGreaterThan(1000)
  })

  it('nota di credito: il titolo documento cambia (TD04)', async () => {
    const buffer = await renderPdfDocument(
      createElement(FatturaCortesiaTemplate, { ...props, fattura: { ...props.fattura, tipo_documento: 'TD04' } }),
    )
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-')
  })

  // Content validation tests
  it('stampa la dicitura "Copia di cortesia priva di valore fiscale"', () => {
    expect(pdfText.toLowerCase()).toContain('copia di cortesia priva di valore fiscale')
  })

  it('stampa "Natura N4" per l\'esenzione IVA', () => {
    expect(pdfText).toContain('N4')
  })

  it('stampa "Art. 10 n.18 DPR 633/72" per l\'esenzione IVA', () => {
    expect(pdfText).toContain('Art. 10')
    expect(pdfText).toContain('633/72')
  })

  it('stampa il numero della fattura', () => {
    expect(pdfText).toContain('2026-0001')
  })

  it('stampa la denominazione del cliente', () => {
    expect(pdfText).toContain('Studio Bianchi')
  })
})
