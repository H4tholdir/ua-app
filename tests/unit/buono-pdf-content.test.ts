// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest'
import { renderPdfDocument } from '@/lib/pdf/render-document'
import { createElement } from 'react'
import { PDFParse } from 'pdf-parse'
import { BuonoTemplate } from '@/components/features/pdf/BuonoTemplate'
import { LAB_FIXTURE, LAVORO_FIXTURE } from './helpers/pdf-fixtures'

let pdfText = ''

describe('BuonoTemplate — audit di completezza (nessun vincolo normativo MDR)', () => {
  beforeAll(async () => {
    const element = createElement(BuonoTemplate, { lavoro: LAVORO_FIXTURE, lab: LAB_FIXTURE, numeroBuono: 'BUO-2026-0001' })
    const buffer = await renderPdfDocument(element)
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy()
    pdfText = result.text
  }, 30_000)

  it('stampa il numero del buono', () => {
    expect(pdfText).toContain('BUO-2026-0001')
  })

  it('stampa il numero lavoro', () => {
    expect(pdfText).toContain(LAVORO_FIXTURE.numero_lavoro)
  })

  it('stampa la ragione sociale del laboratorio', () => {
    expect(pdfText).toContain(LAB_FIXTURE.ragione_sociale)
  })

  it('stampa i dati del cliente/studio', () => {
    expect(pdfText).toContain(LAVORO_FIXTURE.cliente.studio_nome ?? LAVORO_FIXTURE.cliente.cognome)
  })

  it('stampa la nota del dentista sul buono', async () => {
    const lavoro = { ...LAVORO_FIXTURE, note_dentista: 'colore A2 chiaro', note_interne: null }
    const element = createElement(BuonoTemplate, { lavoro, lab: LAB_FIXTURE, numeroBuono: 'BUO-2026-0001' })
    const buffer = await renderPdfDocument(element)
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy()
    const testo = result.text

    expect(testo).toContain('colore A2 chiaro')
    // styles.pazienteLabel applica text-transform: uppercase, quindi il testo
    // estratto dal PDF renderizzato è "NOTA DEL DENTISTA" (non "Nota del dentista")
    expect(testo).toContain('DENTISTA')
  }, 30_000)
})
