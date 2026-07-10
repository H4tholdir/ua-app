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
const FILE_CON_EMBED = [
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
  for (const f of FILE_CON_EMBED) {
    it(`${f} filtra l'embed ddc su stato annullata`, () => {
      const src = readFileSync(f, 'utf-8')
      expect(src).toMatch(/\.neq\('ddc\.stato',\s*'annullata'\)/)
    })
  }
})
