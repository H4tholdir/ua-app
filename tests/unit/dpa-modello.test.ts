// tests/unit/dpa-modello.test.ts
// @vitest-environment node
// 🔑 La guardia della versione. Un gesto da ricordare a mano è un gesto che
// prima o poi non si fa (D120: 211 scatti dei mockup mai salvati) — per questo
// D133 attacca le prime otto cifre dell'impronta del TESTO alla versione che
// finisce in banca dati: chi cambia una parola vede rossa la seconda prova, e
// aggiornando l'impronta fa cambiare la versione DA SOLA.
// 🛑 Queste prove hanno DUE bersagli distinti, e vanno tenuti distinti:
//    ① che la versione sia COMPOSTA e non riscritta a mano (mutazione tipica:
//      qualcuno rimette `export const VERSIONE_MODELLO_DPA = 'dpa-v2'`);
//    ② che l'impronta dichiarata corrisponda al testo VERO che esce dal
//      template.
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
  it('è COMPOSTA — revisione leggibile + prime otto cifre dell\'impronta, non una stringa scritta a mano', () => {
    expect(VERSIONE_MODELLO_DPA).toMatch(/^dpa-v\d+\+[0-9a-f]{8}$/)
    // 🛑 Questa asserzione morde sulla mutazione vera: se qualcuno riscrive la
    //    costante come letterale ('dpa-v2', o 'dpa-v2+' con una coda copiata
    //    e poi non aggiornata), la coda smette di venire dall'impronta.
    expect(VERSIONE_MODELLO_DPA.slice(-8)).toBe(IMPRONTA_TESTO_DPA.slice(0, 8))
  })

  it('🛑 il testo reso corrisponde all\'impronta dichiarata — se fallisce, aggiorna l\'impronta (e alza `v2` se il cambio è sostanziale)', async () => {
    const buffer = await renderPdfDocument(createElement(DpaTemplate, { dpa: FIXTURE_FISSA }))
    const testo = (await new PDFParse({ data: buffer }).getText()).text.replace(/\s+/g, ' ').trim()
    const impronta = createHash('sha256').update(testo, 'utf8').digest('hex')
    expect(impronta).toBe(IMPRONTA_TESTO_DPA)

    // 🔑 L'anello che chiude D133: la versione che finisce in banca dati porta
    //    l'impronta del testo VERO, non di quello dichiarato. Se il testo cambia
    //    e l'impronta non lo segue, questa riga si accende insieme a quella
    //    sopra; se la versione viene sganciata dall'impronta, si accende da sola.
    expect(VERSIONE_MODELLO_DPA).toBe(`dpa-v2+${impronta.slice(0, 8)}`)
  })
})
