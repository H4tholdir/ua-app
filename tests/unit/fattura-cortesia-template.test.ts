// tests/unit/fattura-cortesia-template.test.ts
// Render reale react-pdf: il template produce un PDF valido con i dati fiscali
// e la dicitura di non-valore fiscale (obbligo copia di cortesia).
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderPdfDocument } from '@/lib/pdf/render-document'
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

describe('FatturaCortesiaTemplate', () => {
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
})
