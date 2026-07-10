// tests/unit/ddc-lettori-gruppo-a.test.ts
// Verifica statica: ogni lettore critico filtra le DdC annullate.
// (test sul sorgente: i 5 file hanno pattern di query identici, un test runtime
// per file duplicherebbe il mock di tutto il modulo PDF — qui il contratto è
// la presenza del filtro nella query, verificata sul codice reale)
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const FILE_CON_QUERY_DIRETTA = [
  'src/lib/consegna/orchestrate.ts',
  'src/app/api/portale/[token]/lavori/[lavoro_id]/[documento]/route.ts',
]
// I 3 generator PDF non consumano mai la DdC nei loro template (verificato:
// zero riferimenti in IFUTemplate/EtichettaTemplate/RicevutaConsegnaTemplate):
// l'embed ddc è stato RIMOSSO come dead weight (base pulita post-Ondata 0).
// Il contratto ora è l'ASSENZA dell'embed: reintrodurlo senza filtro
// ripescherebbe le DdC annullate sui documenti MDR fisici.
const FILE_SENZA_EMBED_DDC = [
  'src/lib/pdf/generate-ifu.ts',
  'src/lib/pdf/generate-etichetta.ts',
  'src/lib/pdf/generate-ricevuta-consegna.ts',
]

describe('lettori DdC gruppo A — mai la DdC annullata', () => {
  for (const f of FILE_CON_QUERY_DIRETTA) {
    it(`${f} filtra stato annullata sulla query dichiarazioni_conformita`, () => {
      const src = readFileSync(f, 'utf-8')
      expect(src).toMatch(/\.neq\('stato',\s*'annullata'\)/)
    })
  }
  for (const f of FILE_SENZA_EMBED_DDC) {
    it(`${f} non ha embed ddc (rimosso: mai consumato dal template)`, () => {
      const src = readFileSync(f, 'utf-8')
      expect(src).not.toMatch(/ddc:dichiarazioni_conformita/)
    })
  }
})
