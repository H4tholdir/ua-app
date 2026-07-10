import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const FILES = [
  'src/app/(app)/lavori/[id]/page.tsx',
  'src/app/(app)/lavori/[id]/consegna/page.tsx',
  'src/app/api/lavori/[id]/route.ts',
  'src/app/api/fatture/[id]/xml/route.ts',
  'src/app/api/fatture/batch/route.ts',
  'src/app/portale/[token]/page.tsx',
]

describe('lettori DdC gruppo B — embed filtrato', () => {
  for (const f of FILES) {
    it(`${f} filtra l'embed ddc su stato annullata`, () => {
      const src = readFileSync(f, 'utf-8')
      // ogni query con embed ddc:dichiarazioni_conformita deve avere il filtro
      const embeds = src.match(/ddc:dichiarazioni_conformita/g) ?? []
      const filtri = src.match(/\.neq\('ddc\.stato',\s*'annullata'\)/g) ?? []
      expect(embeds.length).toBeGreaterThan(0)
      expect(filtri.length).toBe(embeds.length)
    })
  }
})
