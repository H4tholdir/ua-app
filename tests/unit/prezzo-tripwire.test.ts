// tests/unit/prezzo-tripwire.test.ts
//
// TRIPWIRE (euristica onesta — NON una garanzia/enforcement forte).
//
// Scansiona i sorgenti sotto src/lib/contabilita/**, src/lib/fattura/** e
// src/app/api/** e segnala nuove letture grezze di `lavoro.prezzo_unitario`
// come TOTALE del lavoro, fuori da un'allowlist esplicita. Serve a impedire
// che il bug di divergenza N4 (righe di lavorazione vs prezzo_unitario legacy
// che possono disallinearsi — vedi Task 1-7) venga reintrodotto in silenzio
// da codice futuro che legge `l.prezzo_unitario` invece di passare dall'unico
// helper `prezzoEffettivoLavoro()` (src/lib/domain/prezzo-lavoro.ts).
//
// Questo NON è un enforcement forte: è pattern-matching su regex, aggirabile
// banalmente rinominando la variabile (es. `const job = lavoro; job.prezzo_unitario`)
// o passando per un alias/cast. Un enforcement forte (branded `Euro` type che
// impedisce l'accesso diretto al campo grezzo del DB) è deferito — vedi
// task-8-brief.md. Questo test è un guard-rail economico, non un compilatore.
//
// L'euristica NON segnala (di proposito):
// - `lavori_lavorazioni.prezzo_unitario` (prezzo unitario di RIGA — campo
//   diverso e legittimo, tabella diversa): il match è ristretto ai soli
//   identificatori dell'oggetto lavoro `l` / `lavoro`, mai `r` / `riga`
// - i frammenti SELECT PostgREST (`.select('...prezzo_unitario...')`) dove il
//   campo compare come parola nuda dentro una stringa, non come accesso a
//   proprietà di un oggetto `l`/`lavoro`
// - altri identificatori di oggetto (es. `body.prezzo_unitario`, `payload.prezzo_unitario`)
//   perché non sono il pattern di lettura "totale lavoro" che ha causato il bug
//
// Prova che l'euristica non è vacua: vedi describe "ha i denti" più sotto —
// verifica sia che intercetta una lettura grezza sintetica sia che NON segnala
// i falsi positivi noti (prezzo di riga, frammento SELECT).

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '../..')

const SCAN_DIRS = ['src/lib/contabilita', 'src/lib/fattura', 'src/app/api']

// Match SOLO l'oggetto lavoro (`l` o `lavoro`, con o senza optional chaining).
// Esclude strutturalmente `r.prezzo_unitario` / `riga.prezzo_unitario` (prezzo
// di riga) e le parole nude nei frammenti SELECT (nessun accesso proprietà).
const RAW_READ_PATTERN = /\b(?:l|lavoro)\??\.prezzo_unitario\b/g

// Allowlist esplicita: file che leggono legittimamente `prezzo_unitario` sul
// job perché lo SELECT-ano per passarlo a `prezzoEffettivoLavoro()`, o perché
// implementano lo stesso fallback della regola N4 (righe se esistono,
// altrimenti il totale legacy `prezzo_unitario`). Ogni entry è stata
// verificata a mano sul codice reale — non è un copia-incolla dei sospetti.
const ALLOWLIST: Record<string, string> = {
  'src/lib/fattura/generate-xml.ts':
    'Righe 152/286/287: fallback "nessuna lavorazione -> riga singola XML con ' +
    'prezzo_unitario del lavoro" — stessa regola di prezzoEffettivoLavoro(), ' +
    'non una seconda fonte di verità sul totale.',
  'src/lib/contabilita/queries.ts':
    "Riga 316: l.prezzo_unitario e' il campo di LavoroInAttesa gia' valorizzato " +
    "con prezzoEffettivoLavoro() (totaleLav) poche righe sopra — non e' una " +
    "lettura grezza dal DB, e' il totale gia' derivato dall'helper.",
}

function collectTsFiles(dir: string): string[] {
  const abs = path.join(ROOT, dir)
  let entries: string[]
  try {
    entries = readdirSync(abs)
  } catch {
    return []
  }
  const out: string[] = []
  for (const entry of entries) {
    const relEntry = path.join(dir, entry)
    const absEntry = path.join(abs, entry)
    const st = statSync(absEntry)
    if (st.isDirectory()) {
      out.push(...collectTsFiles(relEntry))
    } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts') && !entry.endsWith('.d.ts')) {
      out.push(relEntry)
    }
  }
  return out
}

describe('TRIPWIRE — nessuna nuova lettura grezza di lavoro.prezzo_unitario', () => {
  const files = SCAN_DIRS.flatMap(collectTsFiles)

  it('lo scan trova file sorgenti reali (sanity: non e\' uno scan vuoto)', () => {
    expect(files.length).toBeGreaterThan(10)
  })

  for (const relFile of files) {
    const allowReason = ALLOWLIST[relFile]
    const src = readFileSync(path.join(ROOT, relFile), 'utf-8')
    const matches = src.match(RAW_READ_PATTERN)

    if (!matches) continue

    it(`${relFile}: ${matches.length} lettura/e grezza/e di prezzo_unitario deve/devono essere in allowlist`, () => {
      expect(
        allowReason,
        `${relFile} legge prezzo_unitario grezzo sul lavoro (${matches.length}x) fuori ` +
          `dall'allowlist. Usa prezzoEffettivoLavoro() da src/lib/domain/prezzo-lavoro.ts ` +
          `per derivare il totale corretto; se e' un consumer legittimo dell'helper ` +
          `(es. fallback simmetrico), aggiungi una entry motivata in ALLOWLIST qui sopra.`
      ).toBeDefined()
    })
  }

  it('l\'allowlist contiene solo file che genuinamente ne hanno bisogno (nessuna entry morta)', () => {
    const filesWithMatches = new Set(
      files.filter((f) => (readFileSync(path.join(ROOT, f), 'utf-8').match(RAW_READ_PATTERN) ?? []).length > 0)
    )
    for (const allowedFile of Object.keys(ALLOWLIST)) {
      expect(
        filesWithMatches.has(allowedFile),
        `${allowedFile} e' in ALLOWLIST ma non contiene piu' letture grezze di prezzo_unitario — rimuovi l'entry morta.`
      ).toBe(true)
    }
  })
})

describe('TRIPWIRE — ha i denti (non e\' un test vacuo)', () => {
  it('individua una lettura grezza sintetica "lavoro.prezzo_unitario ?? 0"', () => {
    const fixture = `const totale = lavoro.prezzo_unitario ?? 0`
    expect(fixture.match(RAW_READ_PATTERN)).not.toBeNull()
  })

  it('individua una lettura grezza sintetica "l.prezzo_unitario" con optional chaining', () => {
    const fixture = `const totale = l?.prezzo_unitario ?? 0`
    expect(fixture.match(RAW_READ_PATTERN)).not.toBeNull()
  })

  it('individua una lettura grezza dentro un object literal ({ prezzo: ... })', () => {
    const fixture = `return { prezzo: lavoro.prezzo_unitario ?? 0, altro: 1 }`
    expect(fixture.match(RAW_READ_PATTERN)).not.toBeNull()
  })

  it('NON segnala il prezzo di RIGA (lavori_lavorazioni.prezzo_unitario, var riga/r)', () => {
    const fixture = `
      const prezzoUnit = riga.prezzo_unitario ?? 0
      const altro = r.prezzo_unitario ?? 0
    `
    expect(fixture.match(RAW_READ_PATTERN)).toBeNull()
  })

  it('NON segnala il frammento SELECT PostgREST (parola nuda in stringa, nessun accesso proprieta\')', () => {
    const fixture = `.select('id, prezzo_unitario, lavorazioni:lavori_lavorazioni(importo)')`
    expect(fixture.match(RAW_READ_PATTERN)).toBeNull()
  })

  it('NON segnala altri oggetti con lo stesso nome campo (body/payload — dominio diverso)', () => {
    const fixture = `
      const p = { prezzo_unitario: body.prezzo_unitario ?? null }
      if ('prezzo_unitario' in payload) { delete payload.prezzo_unitario }
    `
    expect(fixture.match(RAW_READ_PATTERN)).toBeNull()
  })
})
