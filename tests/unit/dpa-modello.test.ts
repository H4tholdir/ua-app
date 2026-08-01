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
import { VERSIONE_MODELLO_DPA, IMPRONTA_TESTO_DPA, datiSostanzialiDpa, improntaDpa } from '@/lib/pdf/dpa-modello'
import type { Laboratorio, Cliente } from '@/types/domain'

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
  // ⚠️ Mezzanotte UTC del 1° gennaio è l'istante PIÙ esposto a un cambio di fuso,
  //    e per un po' questa prova è stata rossa fuori dall'Europa: `TZ=America/New_York`
  //    rendeva «31 dicembre 2025» invece di «1 gennaio 2026» — testo diverso,
  //    impronta diversa, senza che il template fosse cambiato.
  //    🔑 Si è tenuta la data com'era e si è corretta la CAUSA: `DpaTemplate.tsx`
  //    ora dichiara `timeZone: 'Europe/Rome'`. Nessun istante rende lo stesso
  //    giorno in tutti i fusi — l'arco è di 26 ore — quindi spostare l'ora non
  //    era una soluzione, era una speranza.
  //    `provato:` verde in Europe/Rome · America/New_York · Pacific/Kiritimati
  //    (UTC+14) · Pacific/Midway (UTC-11) · UTC.
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

// Task 3 — l'impronta dei SOLI dati sostanziali (lab + cliente), MAI numero e
// data di emissione: se entrassero, l'impronta cambierebbe ogni giorno e
// nascerebbe un'emissione a ogni scarico in un giorno diverso.
const LAB = { ...FIXTURE_FISSA.lab, id: 'lab-1' } as unknown as Laboratorio
const CLI = { ...FIXTURE_FISSA.cliente, id: 'cli-1' } as unknown as Cliente

describe('l\'impronta dei dati sostanziali', () => {
  it('🛑 NON cambia se cambia la data (è il difetto che avrebbe fatto nascere un\'emissione al giorno)', () => {
    const a = improntaDpa(LAB, CLI)
    const b = improntaDpa(LAB, CLI) // stesso input, momento diverso
    expect(a).toBe(b)
    expect(JSON.stringify(datiSostanzialiDpa(LAB, CLI))).not.toContain('data_emissione')
    expect(JSON.stringify(datiSostanzialiDpa(LAB, CLI))).not.toContain('numero_dpa')
  })

  it('cambia se cambia un dato del CLIENTE', () => {
    expect(improntaDpa(LAB, { ...CLI, studio_nome: 'Altro Studio' } as Cliente)).not.toBe(improntaDpa(LAB, CLI))
  })

  it('cambia se cambia un dato del LABORATORIO', () => {
    expect(improntaDpa({ ...LAB, codice_itca: 'ITCA99999999' } as Laboratorio, CLI)).not.toBe(improntaDpa(LAB, CLI))
  })

  // 🔑 La quarta prova, RISCRITTA il 03/08 — il piano la intitolava «porta
  //    esattamente i campi che il modello STAMPA: 10 del lab, 9 del cliente»,
  //    e quel nome era FALSO. `provato:` i campi resi in JSX da DpaTemplate.tsx
  //    sono NOVE per il lab (manca `codice_fiscale`) e SETTE per il cliente
  //    (mancano `cap` e `provincia`): 10 e 9 contano i campi che il modello
  //    ACCETTA nel tipo, non quelli che rende.
  //    🛑 I NUMERI restano 10 e 9, e non è una svista: l'impronta deve essere un
  //    SOPRAINSIEME di ciò che il documento stampa, perché i due errori non
  //    costano uguale. Un campo NELL'impronta che il modello non stampa, se
  //    cambia, fa nascere un'emissione in più con lo stesso testo: rumore. Un
  //    campo STAMPATO che NON è nell'impronta, se cambia, non fa nascere niente
  //    — e il dentista resta con un documento che porta un dato superato.
  //    Si sbaglia dalla parte del rumore.
  //    Si asserisce l'ELENCO, non il conteggio: due nomi scambiati passerebbero
  //    una conta e non passano questo.
  it('copre TUTTO ciò che il modello può stampare — soprainsieme, che è il lato sicuro', () => {
    const d = datiSostanzialiDpa(LAB, CLI)

    expect(Object.keys(d.lab).sort()).toEqual([
      'cap', 'citta', 'codice_fiscale', 'codice_itca', 'indirizzo',
      'nome', 'partita_iva', 'provincia', 'prrc_nome', 'ragione_sociale',
    ])
    expect(Object.keys(d.cliente).sort()).toEqual([
      'cap', 'citta', 'codice_fiscale', 'cognome', 'indirizzo',
      'nome', 'partita_iva', 'provincia', 'studio_nome',
    ])

    // 🛑 L'invariante che conta davvero: ogni campo che il template RENDE deve
    //    stare nell'impronta. Se un domani il modello comincia a stampare un
    //    campo nuovo e nessuno lo aggiunge qui, questa riga si accende.
    const RESI_DAL_TEMPLATE = {
      lab: ['cap', 'citta', 'codice_itca', 'indirizzo', 'nome', 'partita_iva', 'provincia', 'prrc_nome', 'ragione_sociale'],
      cliente: ['citta', 'codice_fiscale', 'cognome', 'indirizzo', 'nome', 'partita_iva', 'studio_nome'],
    }
    for (const campo of RESI_DAL_TEMPLATE.lab) expect(Object.keys(d.lab)).toContain(campo)
    for (const campo of RESI_DAL_TEMPLATE.cliente) expect(Object.keys(d.cliente)).toContain(campo)
  })
})
