// Guardia testuale «la home v3 è FLUIDA» (D8, spec §3.3, decisione 2026-07-25) — SOSTITUISCE
// la protezione «home fuori perimetro» abrogata dal Task 12 (v. decision record
// docs/design/decisions/2026-07-25-abrogazione-guardie-stanza-parete.md, che rimanda qui per
// la seconda abrogazione prescritta dal piano dell'ondata). Stesso pattern di
// tests/unit/ds-v3/parete-fluida.test.ts: il CSS è verificato come testo, jsdom non fa layout —
// niente qui presidia che il clamp *risolva* al pixel giusto (quello è compito del QA device,
// Task 15).
//
// Task 14 (D8): il wrapper `.corpo` di HomeV3 diventa un size-container (`container-type:
// size`), che fa risolvere i `cqh` dei blocchi interni (pile, cassette KPI) in base
// all'altezza REALE disponibile — non più i gradini fissi di `@media (max-height: 780px)`
// (morto per legge da questo task in poi). Il piede (`.foot`, col TastoPiù) resta FUORI da
// `.corpo` — non deve mai rimpicciolire — e il degrado scroll P3 (`overflow-y: auto`) resta
// la rete di sicurezza sotto la scala fluida, non un residuo dimenticato.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

const srcHome = readFileSync(join(process.cwd(), 'src/components/features/home/HomeV3.tsx'), 'utf8')

describe('HomeV3 — scala verticale fluida + pile centrate (D8, §3.3)', () => {
  it('il wrapper interno è un size-container e i blocchi usano cqh con floor px', () => {
    expect(srcHome).toMatch(/container-type: size/)
    expect(srcHome).toMatch(/gap: clamp\(8px, 2\.2cqh, 16px\)/)
  })

  it('il degrado scroll P3 resta (mai abrogato dalla fluida)', () => {
    expect(srcHome).toMatch(/overflow-y: auto/)
  })

  it('la vecchia scala a gradini è morta', () => {
    expect(srcHome).not.toMatch(/@media \(max-height: 780px\)/)
  })
})
