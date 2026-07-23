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
//
// Fix round 2 (review Task 14, Critical) — il degrado P3 di `.corpo` NON copre la forma
// pager: `.ua-stanze-viewport` (ds-v3.css) è `overflow-y: hidden` e clippa l'overflow della
// stanza Pile due livelli PRIMA che possa mai arrivare a `.corpo`. Verificato in browser
// reale (jsdom non fa layout, non l'avrebbe mai mostrato): a 390×660 con contenuto forzato
// oltre il viewport, `corpo.scrollHeight === corpo.clientHeight` — nessuna superficie di
// scroll si attivava, contenuto irraggiungibile. Il fix dà alla stanza Pile la stessa
// ricetta della stanza Parete (`.ua-stanza-parete-scroll`, già in ds-v3.css): una superficie
// di scroll propria DENTRO `.ua-stanza`, prima del clip. Le due guardie sotto presidiano che
// la regola CSS esista e che `StanzePager.tsx` la applichi davvero al ramo pile.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

const srcHome = readFileSync(join(process.cwd(), 'src/components/features/home/HomeV3.tsx'), 'utf8')
const srcCss = readFileSync(join(process.cwd(), 'src/app/ds-v3.css'), 'utf8')
const srcPager = readFileSync(join(process.cwd(), 'src/components/features/home/StanzePager.tsx'), 'utf8')

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

describe('StanzePager — la stanza Pile ha una sua superficie di scroll interna (fix round 2, Critical P3 pager)', () => {
  it('`.ua-stanza-pile-scroll` esiste in ds-v3.css con la stessa ricetta di `.ua-stanza-parete-scroll`', () => {
    expect(srcCss).toMatch(
      /\[data-ds="v3"\]\s*\.ua-stanza-pile-scroll\s*\{[^}]*flex:\s*1;\s*min-height:\s*0;[^}]*overflow-y:\s*auto;/
    )
  })

  it('StanzePager.tsx avvolge il contenuto della stanza pile in `.ua-stanza-pile-scroll`', () => {
    expect(srcPager).toMatch(/className="ua-stanza-pile-scroll"/)
  })
})
