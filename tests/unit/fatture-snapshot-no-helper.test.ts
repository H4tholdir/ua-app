// tests/unit/fatture-snapshot-no-helper.test.ts
//
// REGRESSIONE — i read path delle fatture GIA' EMESSE non dipendono
// dall'helper prezzo live.
//
// Una fattura emessa e' un documento fiscale CONGELATO: al momento
// dell'emissione, `imponibile`/`totale`/`fatture_righe` vengono scritti come
// SNAPSHOT immutabile (vedi ANALISI/17_adempimenti_lab_2026.md — FatturaPA
// natura N4). I quattro read path sotto elencati leggono SOLO questo
// snapshot: non ricalcolano mai il prezzo dal `lavoro` live tramite
// `prezzoEffettivoLavoro()` / `divergenzaPrezzo()` (src/lib/domain/prezzo-lavoro.ts).
//
// Perche' questo invariante conta: se in futuro qualcuno "semplifica" uno di
// questi path facendolo riderivare il totale dal lavoro corrente invece che
// dallo snapshot, una fattura gia' emessa e trasmessa a SdI cambierebbe
// retroattivamente importo ogni volta che il lavoro sottostante viene
// modificato (es. rifacimento, correzione lavorazioni) — corrompendo un
// documento fiscale storico gia' notificato all'Agenzia delle Entrate.
// Questo test blocca quella regressione: fallisce se uno dei quattro file
// inizia a referenziare l'helper live, e fallisce (per file mancante) se uno
// dei quattro viene rinominato/spostato senza aggiornare questo test — non
// deve mai passare "per assenza silenziosa" del file.
//
// Nota: NON e' garanzia che i path leggano correttamente lo snapshot (quello
// e' coperto da altri test funzionali) — e' solo la garanzia negativa che
// non importano/chiamano l'helper live sui documenti congelati.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '../..')

const FROZEN_READ_PATHS = [
  'src/app/(app)/fatture/page.tsx',
  'src/app/(app)/fatture/[id]/page.tsx',
  'src/components/features/pdf/FatturaCortesiaTemplate.tsx',
  'src/app/api/fatture/[id]/xml/route.ts',
] as const

const FORBIDDEN_SYMBOLS = [
  'prezzoEffettivoLavoro',
  'divergenzaPrezzo',
  '@/lib/domain/prezzo-lavoro',
] as const

describe('REGRESSIONE — read path fatture congelate non usano l\'helper prezzo live', () => {
  for (const relFile of FROZEN_READ_PATHS) {
    describe(relFile, () => {
      const absFile = path.join(ROOT, relFile)
      // Non usare readFileSync direttamente nel corpo del describe: se il
      // file manca, l'ENOENT esploderebbe a tempo di collection e farebbe
      // crashare l'intera suite PRIMA che il test "il file esiste" possa
      // girare e riportare un fallimento leggibile. Si valuta existsSync
      // qui (a tempo di collection, innocuo) e si rimanda la lettura vera e
      // propria dentro i singoli `it`, in modo che l'asserzione di
      // esistenza sia un test reale che puo' fallire da solo — non solo un
      // side-effect del crash del modulo.
      const exists = existsSync(absFile)
      const src = exists ? readFileSync(absFile, 'utf-8') : ''

      it('il file esiste ancora a questo path (guard-rail anti rinomina silenziosa)', () => {
        expect(
          exists,
          `${relFile} non e' stato trovato. Questo test assume che il file esista a questo ` +
            'path esatto: se e\' stato rinominato o spostato, aggiorna FROZEN_READ_PATHS qui ' +
            'sopra invece di lasciare che il test passi per un path che non risolve piu\' a nulla.'
        ).toBe(true)
      })

      for (const symbol of FORBIDDEN_SYMBOLS) {
        it(`non referenzia "${symbol}"`, () => {
          expect(
            exists,
            `${relFile} non e' stato trovato: impossibile verificare l'assenza di "${symbol}". ` +
              'Vedi il test di esistenza qui sopra per il dettaglio.'
          ).toBe(true)
          expect(
            src.includes(symbol),
            `${relFile} referenzia "${symbol}", ma questo e' un read path di una fattura ` +
              'GIA\' EMESSA (documento fiscale congelato): deve leggere solo lo snapshot ' +
              '(imponibile/totale/fatture_righe), mai ricalcolare dal lavoro live tramite ' +
              'l\'helper prezzo. Se questa e\' un\'introduzione intenzionale, e\' quasi ' +
              'certamente un bug — le fatture emesse non devono cambiare importo quando il ' +
              'lavoro sottostante viene modificato dopo l\'emissione.'
          ).toBe(false)
        })
      }
    })
  }
})

describe('REGRESSIONE — ha i denti (non e\' un test vacuo)', () => {
  it('fallisce (assert vero) su un file sintetico che importa l\'helper live', () => {
    const fixture = `
      import { prezzoEffettivoLavoro, divergenzaPrezzo } from '@/lib/domain/prezzo-lavoro'
      const totale = prezzoEffettivoLavoro(lavoro)
      const d = divergenzaPrezzo(lavoro, fattura)
    `
    for (const symbol of FORBIDDEN_SYMBOLS) {
      expect(fixture.includes(symbol)).toBe(true)
    }
  })

  it('fallisce (assert vero) su un uso sintetico di divergenzaPrezzo senza import esplicito', () => {
    const fixture = `const d = divergenzaPrezzo(lavoro, fattura)`
    expect(fixture.includes('divergenzaPrezzo')).toBe(true)
  })

  it('un file sintetico che legge solo lo snapshot non contiene nessun simbolo vietato', () => {
    const fixture = `
      const { imponibile, totale, fatture_righe } = fattura
      return { imponibile, totale, righe: fatture_righe }
    `
    for (const symbol of FORBIDDEN_SYMBOLS) {
      expect(fixture.includes(symbol)).toBe(false)
    }
  })

  it('un path inesistente fa fallire il guard-rail existsSync (nessun pass silenzioso)', () => {
    const fakeAbs = path.join(ROOT, 'src/app/(app)/fatture/questo-file-non-esiste.tsx')
    expect(existsSync(fakeAbs)).toBe(false)
  })
})
