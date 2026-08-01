// tests/unit/dpa-modello.test.ts
// @vitest-environment node
// 🔑 La guardia della versione. VERSIONE_MODELLO_DPA va alzata a ogni cambio del
// testo — ma un gesto da ricordare a mano è un gesto che prima o poi non si fa
// (D120: 211 scatti dei mockup mai salvati). Questa prova àncora l'impronta del
// TESTO alla versione dichiarata: chi cambia una parola la vede rossa.
import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { createElement } from 'react'
import { PDFParse } from 'pdf-parse'
import { renderPdfDocument } from '@/lib/pdf/render-document'
import { DpaTemplate } from '@/components/features/pdf/DpaTemplate'
import { VERSIONE_MODELLO_DPA, IMPRONTA_TESTO_DPA } from '@/lib/pdf/dpa-modello'

const FIXTURE_FISSA = {
  lab: {
    ragione_sociale: 'Lab Prova S.r.l.', nome: 'Prova', partita_iva: '00000000000',
    codice_fiscale: null, indirizzo: 'Via Uno 1', cap: '84028', citta: 'Serre',
    provincia: 'SA', prrc_nome: 'Mario Bianchi', codice_itca: 'ITCA00000000',
  },
  cliente: {
    studio_nome: 'Studio Prova', nome: 'Anna', cognome: 'Verdi', partita_iva: '11111111111',
    codice_fiscale: null, indirizzo: 'Via Due 2', cap: '84121', citta: 'Salerno', provincia: 'SA',
  },
  numero_dpa: 'DPA-0000-FISSO',
  data_emissione: '2026-01-01T00:00:00.000Z',
}

describe('la versione del modello DPA', () => {
  it('è dichiarata e vale dpa-v2', () => {
    expect(VERSIONE_MODELLO_DPA).toBe('dpa-v2')
  })

  it('🛑 il testo reso corrisponde all\'impronta dichiarata — se fallisce, ALZA la versione e aggiorna l\'impronta', async () => {
    const buffer = await renderPdfDocument(createElement(DpaTemplate, { dpa: FIXTURE_FISSA }))
    const testo = (await new PDFParse({ data: buffer }).getText()).text.replace(/\s+/g, ' ').trim()
    const impronta = createHash('sha256').update(testo, 'utf8').digest('hex')
    expect(impronta).toBe(IMPRONTA_TESTO_DPA)
  })
})
