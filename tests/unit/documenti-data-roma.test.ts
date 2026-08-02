// @vitest-environment node
// ═══════════════════════════════════════════════════════════════════════════
// P9 — I DOCUMENTI STAMPANO IL GIORNO CIVILE ITALIANO, non quello della macchina
//
// IL DIFETTO. Undici punti nei modelli PDF rendevano una data con
// `toLocaleDateString('it-IT', …)` SENZA dichiarare il fuso, cioè nel fuso della
// macchina che genera il documento — e in produzione quella macchina gira a UTC.
//   `provato:` 2026-03-10T23:30:00Z (= 00:30 dell'11 marzo a Roma)
//              a UTC        → «10/03/2026»
//              a New York   → «10/03/2026»
//              a Roma       → «11/03/2026»   ← il giorno civile italiano
//
// 🔑 E LA METÀ DEL LAVORO ERA GIÀ FATTA, il che rende il difetto peggiore, non
//    migliore: il NUMERO del documento passa da `annoRoma()` dal 20/07/2026 («la
//    data documento è il giorno civile italiano ex Art. 21 DPR 633/72»), ma la
//    data STAMPATA no. Fra le 00:00 e le 02:00 un documento poteva portare un
//    numero della serie di un giorno e stampare la data del giorno prima.
//
// PERCHÉ QUESTE PROVE SONO SCRITTE COSÌ. Non fissano il fuso della macchina: se
// lo facessero, proverebbero solo che il test sa impostare una variabile.
// Fissano il RISULTATO ATTESO — «11/03/2026» — che è vero a Roma e falso ovunque
// altrove. Quindi girano rosse su una funzione senza fuso dichiarato IN QUALUNQUE
// fuso la macchina si trovi, UTC compreso.
//   ⚠️ La suite NON fissa `TZ` (`provato:` nessun riferimento in `vitest.config`
//   né nei file di preparazione), quindi il difetto era visibile — ed è così che
//   P9 è stata trovata: come prova instabile, rossa con `TZ=America/New_York`.
// ═══════════════════════════════════════════════════════════════════════════
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createElement } from 'react'
import { PDFParse } from 'pdf-parse'
import { renderPdfDocument } from '@/lib/pdf/render-document'
import { DdcTemplate } from '@/components/features/pdf/DdcTemplate'
import type { DichiarazioneConformita } from '@/types/domain'
import { LAB_FIXTURE, LAVORO_FIXTURE } from './helpers/pdf-fixtures'
import {
  dataItalianaBreve,
  dataItalianaEstesa,
  dataOraItaliana,
} from '@/lib/utils/data-roma'

// L'istante che smaschera il difetto: 23:30 UTC del 10 marzo sono le 00:30 dell'11
// marzo a Roma. Un'ora e mezza di finestra in inverno, due e mezza in estate.
const MEZZANOTTE_PASSATA_A_ROMA = '2026-03-10T23:30:00Z'

describe('dataItalianaBreve — il giorno civile di Roma in gg/mm/aaaa', () => {
  it('23:30 UTC del 10 marzo è GIÀ l\'11 marzo a Roma', () => {
    expect(dataItalianaBreve(MEZZANOTTE_PASSATA_A_ROMA)).toBe('11/03/2026')
  })

  it('22:30 UTC del 10 marzo è ancora il 10 (23:30 a Roma): il confine è vero, non spostato', () => {
    expect(dataItalianaBreve('2026-03-10T22:30:00Z')).toBe('10/03/2026')
  })

  it('in estate la finestra è di DUE ore: 22:30 UTC del 15 luglio è già il 16 a Roma', () => {
    expect(dataItalianaBreve('2026-07-15T22:30:00Z')).toBe('16/07/2026')
  })

  it('una data civile (senza ora) resta il suo giorno — Roma è sempre AVANTI a UTC', () => {
    // `new Date('2026-03-10')` è mezzanotte UTC; a Roma sono le 01:00 dello stesso
    // giorno. Vale tutto l'anno perché Roma è +1 o +2, mai negativa.
    expect(dataItalianaBreve('2026-03-10')).toBe('10/03/2026')
    expect(dataItalianaBreve('2026-07-15')).toBe('15/07/2026')
    expect(dataItalianaBreve('2026-01-01')).toBe('01/01/2026')
  })

  it('capodanno: 23:30 UTC del 31/12 stampa già l\'anno nuovo', () => {
    expect(dataItalianaBreve('2026-12-31T23:30:00Z')).toBe('01/01/2027')
  })

  it('assente → trattino, mai una data inventata', () => {
    expect(dataItalianaBreve(null)).toBe('—')
    expect(dataItalianaBreve(undefined)).toBe('—')
    expect(dataItalianaBreve('')).toBe('—')
  })

  it('valore illeggibile → trattino, MAI la scritta «Invalid Date» su un documento', () => {
    // `provato:` oggi `new Date('pippo').toLocaleDateString('it-IT', …)` NON lancia:
    // restituisce la stringa «Invalid Date», che finirebbe stampata sul PDF. Il
    // `catch` dei modelli era quindi codice morto.
    expect(dataItalianaBreve('pippo')).toBe('—')
    expect(dataItalianaBreve('2026-13-45')).toBe('—')
  })
})

describe('dataOraItaliana — data e ora dell\'orologio di Roma', () => {
  it('23:30 UTC del 10 marzo è l\'11 marzo alle 00:30 a Roma', () => {
    expect(dataOraItaliana(MEZZANOTTE_PASSATA_A_ROMA)).toBe('11/03/2026, 00:30')
  })

  it('in estate l\'orologio è avanti di due ore', () => {
    expect(dataOraItaliana('2026-07-15T10:00:00Z')).toBe('15/07/2026, 12:00')
  })

  it('assente o illeggibile → trattino', () => {
    expect(dataOraItaliana(null)).toBe('—')
    expect(dataOraItaliana('pippo')).toBe('—')
  })
})

describe('dataItalianaEstesa — il formato lungo dei contratti', () => {
  it('23:30 UTC del 10 marzo si legge «11 marzo 2026»', () => {
    expect(dataItalianaEstesa(MEZZANOTTE_PASSATA_A_ROMA)).toBe('11 marzo 2026')
  })

  it('assente o illeggibile → trattino', () => {
    expect(dataItalianaEstesa(null)).toBe('—')
    expect(dataItalianaEstesa('pippo')).toBe('—')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// La prova che conta davvero: non la funzione, IL DOCUMENTO.
// La DdC è il caso più grave dei dodici, per due ragioni misurate:
//   ① `dichiarazioni_conformita.data_emissione` è TIMESTAMPTZ (`supabase/schema.sql:1207`),
//      cioè un ISTANTE — quindi il difetto morde davvero, non è teorico;
//   ② è un documento a valore legale (Art. 52(8) + Allegato XIII MDR 2017/745).
// ─────────────────────────────────────────────────────────────────────────────
describe('DdC — il PDF stampa il giorno civile italiano, non quello della macchina', () => {
  let testo = ''
  let fusoPrima: string | undefined
  let controlloSenzaFuso = ''

  beforeAll(async () => {
    // ⚠️ QUESTO GRUPPO SI FINGE LA PRODUZIONE, e la ragione è un difetto trovato
    // scrivendolo. Alla prima stesura queste due prove PASSAVANO anche con il
    // difetto intatto: `provato:` questa macchina è `Europe/Rome`, quindi leggeva
    // già le date «da Roma» per conto suo. Una prova che passa perché la macchina
    // è quella giusta non prova niente — e in produzione la macchina è UTC.
    // 🔑 `provato:` cambiare `process.env.TZ` a giro avviato ha effetto reale
    //    (11/03 → 10/03), quindi la finta si può fare davvero.
    fusoPrima = process.env.TZ
    process.env.TZ = 'UTC'

    // Il controllo che rende la finta VERIFICABILE: se il fuso non avesse morso,
    // questo varrebbe «11/03/2026» e le prove qui sotto passerebbero di nuovo per
    // la ragione sbagliata. L'asserzione sta in un test suo, più in basso.
    controlloSenzaFuso = new Date(MEZZANOTTE_PASSATA_A_ROMA).toLocaleDateString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })

    const ddc = {
      id: 'ddc-p9-001',
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
      // 00:30 dell'11 marzo a Roma. Un server a UTC stamperebbe «10/03/2026».
      data_emissione: MEZZANOTTE_PASSATA_A_ROMA,
      stato: 'bozza',
      fabbricante_nome: 'Laboratorio di prova',
      fabbricante_indirizzo: 'Via Roma 12, Serre (SA)',
      fabbricante_piva: '03508740655',
      fabbricante_itca: 'ITCA-TEST-001',
      prescrittore_nome: 'Dott. Prova',
      paziente_nome: 'Mario',
      paziente_cognome: 'Rossi',
      tipo_dispositivo: 'corona',
      descrizione_dispositivo: 'Corona in zirconia',
      classe_rischio: 'IIa',
      testo_conformita_snapshot: 'Testo di conformità di prova.',
      prrc_nome: 'Prova PRRC',
      prrc_qualifica: 'Responsabile',
    } as unknown as DichiarazioneConformita

    const pdf = await renderPdfDocument(
      createElement(DdcTemplate, { lavoro: LAVORO_FIXTURE, lab: LAB_FIXTURE, ddc }),
    )
    const parser = new PDFParse({ data: new Uint8Array(pdf) })
    testo = (await parser.getText()).text
  }, 60000)

  afterAll(() => {
    if (fusoPrima === undefined) delete process.env.TZ
    else process.env.TZ = fusoPrima
  })

  it('la finta ha morso: senza fuso dichiarato la macchina legge «10/03/2026»', () => {
    // Se questa prova diventa rossa, le due qui sotto NON stanno più misurando
    // niente — passerebbero perché la macchina è a Roma, non perché il codice è
    // giusto. È la stessa lezione del 02/08: prima di credere a una misura, si
    // guarda che cosa ha misurato.
    expect(controlloSenzaFuso).toBe('10/03/2026')
  })

  it('stampa «11/03/2026», il giorno civile italiano di quell\'istante', () => {
    expect(testo).toContain('11/03/2026')
  })

  it('NON stampa «10/03/2026», che è lo stesso istante letto a UTC', () => {
    expect(testo).not.toContain('10/03/2026')
  })
})
