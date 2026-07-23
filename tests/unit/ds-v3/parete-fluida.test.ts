// Guardia testuale della decisione «gap cassette tablet — variante C fluida»
// (ratifica Francesco 23/07/2026 — docs/design/decisions/2026-07-22-gap-cassette-tablet.md):
// sulla pagina /cassette la spaziatura della parete scala con la larghezza della
// shell (container query), SENZA gradini di media query — 16px sul telefono,
// ~23px a shell 720 (tablet), 26px dal desktop. La home (.ua-stanza-parete) NON
// è nel perimetro: resta ai valori fissi misurati del collaudo R3b (744px
// compatta) finché non arriva l'ondata «Redesign parete/home».
// Stesso pattern di css-sync.test.ts: il CSS è verificato come testo, jsdom non
// fa layout.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const css = readFileSync(join(process.cwd(), 'src/app/ds-v3.css'), 'utf8')
const norm = css.replace(/\s+/g, ' ')

describe('parete /cassette — variante C fluida (decisione 23/07/2026)', () => {
  it('la shell è il container delle query (cqw risolve sulla larghezza della shell, non del viewport)', () => {
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-parete-shell \{[^}]*container-type: inline-size;/
    )
  })

  it('il gap della griglia scala fluido SOLO nel perimetro della shell: clamp(16px, 3.6cqw, 26px)', () => {
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-parete-shell \.ds-parete-grid \{ gap: clamp\(16px, 3\.6cqw, 26px\); \}/
    )
  })

  it('il padding della parete scala con la stessa formula (22-28 / 16-24 / 18-24)', () => {
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-parete-shell \.ds-parete \{ padding: clamp\(22px, 3\.8cqw, 28px\) clamp\(16px, 3\.2cqw, 24px\) clamp\(18px, 3\.4cqw, 24px\); \}/
    )
  })

  it('ogni cqw del foglio vive in un selettore col perimetro .ds-parete-shell (vettore di leak reale: la regola BASE di .ds-parete-grid, che la home riusa)', () => {
    // Review 23/07 (Medium-1): la home riusa .ds-parete/.ds-parete-grid SENZA il
    // prefisso .ua-stanza-parete — il leak realistico è rendere fluida la regola
    // base. Quindi: (a) ogni regola che contiene cqw ha .ds-parete-shell nel
    // selettore; (b) le regole base restano ai valori fissi di oggi.
    const senzaCommenti = css.replace(/\/\*[\s\S]*?\*\//g, '')
    for (const m of senzaCommenti.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      if (/cqw/.test(m[2])) expect(m[1]).toContain('.ds-parete-shell')
    }
    expect(senzaCommenti).toMatch(/\[data-ds="v3"\] \.ds-parete-grid \{ display: grid; grid-template-columns: repeat\(3, 1fr\); gap: 16px; \}/)
    // Task 8 (adeguamento del testo guardato, NON abrogazione — le custom property
    // GRIGLIA FISSA + SNAP ratificate 24/07 vivono PRIMA di position: relative):
    expect(senzaCommenti).toMatch(/\[data-ds="v3"\] \.ds-parete \{\s*--passo-maglia: 44px; --track: calc\(var\(--passo-maglia\) \* 4\); --hook-above: 14px;\s*--wall-pad-top: 24px; --wire-center: calc\(var\(--wall-pad-top\) - var\(--hook-above\)\); --wire-w: 3px;\s*position: relative; border-radius: 18px; padding: var\(--wall-pad-top\) 16px 18px;/)
  })

  it('la home resta FUORI dal perimetro: nessuna regola fluida tocca .ua-stanza-parete', () => {
    // Le regole della stanza-parete non devono contenere clamp/cqw: la compatta
    // R3b (gap 12, misure 744px) è sanzionata e non va alterata da questo giro.
    // I commenti CSS vanno spogliati PRIMA del match: menzionare la stanza-parete
    // in un commento è lecito (e succede), toccarne le regole no.
    const senzaCommenti = css.replace(/\/\*[\s\S]*?\*\//g, '')
    const regole = [...senzaCommenti.matchAll(/\.ua-stanza-parete[^{]*\{([^}]*)\}/g)]
    expect(regole.length).toBeGreaterThan(0) // la guardia deve guardare qualcosa
    for (const m of regole) {
      expect(m[1]).not.toMatch(/clamp|cqw/)
    }
  })
})

// Guardia «Task 8 — la rete disegnata» (docs/design/decisions/2026-07-24-rete-gancetto-targa.md
// §Vincoli Task 8-10, mockup ratificato 2026-07-24-rete-gancetto-targa.html rev.3 P=44): la
// maglia metallica fissa sul MURO (.ds-parete, MAI la shell) + la griglia quantizzata
// (grid-auto-rows/row-gap/align-items su .ds-parete-grid) coi valori ratificati.
describe('parete /cassette — rete disegnata «griglia fissa + snap» (ratifica 24/07/2026, P=44)', () => {
  it('.ds-parete dichiara i parametri GRIGLIA FISSA + SNAP ratificati (P=44 · track=4P · hook-above=14 · wall-pad-top=24 · wire-center=wall-pad-top-hook-above · wire-w=3) PRIMA di position: relative — poi la maglia SVG light + fallback colore', () => {
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-parete \{ --passo-maglia: 44px; --track: calc\(var\(--passo-maglia\) \* 4\); --hook-above: 14px; --wall-pad-top: 24px; --wire-center: calc\(var\(--wall-pad-top\) - var\(--hook-above\)\); --wire-w: 3px; position: relative; border-radius: 18px; padding: var\(--wall-pad-top\) 16px 18px;/
    )
    expect(norm).toMatch(/\[data-ds="v3"\] \.ds-parete \{[^}]*background-image: url\("data:image\/svg\+xml,/)
    expect(norm).toMatch(/\[data-ds="v3"\] \.ds-parete \{[^}]*background-size: 44px 44px;/)
    expect(norm).toMatch(/\[data-ds="v3"\] \.ds-parete \{[^}]*background-color: var\(--bg-deep\);/)
  })

  it('dark = flat, verbatim mockup .notte: due repeating-linear-gradient (filo rgba(255,255,255,.07), spessore --wire-w) + background-position ancorato a wire-center - wire-w/2', () => {
    expect(norm).toMatch(
      /\[data-theme="dark"\] \[data-ds="v3"\] \.ds-parete \{ --filo-flat: rgba\(255,255,255,\.07\); background: repeating-linear-gradient\(180deg, var\(--filo-flat\) 0 var\(--wire-w\), transparent var\(--wire-w\) var\(--passo-maglia\)\), repeating-linear-gradient\(90deg, var\(--filo-flat\) 0 var\(--wire-w\), transparent var\(--wire-w\) var\(--passo-maglia\)\), var\(--bg-deep\); background-position: 0 calc\(var\(--wire-center\) - var\(--wire-w\) \/ 2\), 0 0, 0 0; \}/
    )
  })

  it('.ds-parete-grid è quantizzata: grid-auto-rows: var(--track), row-gap: 0, align-items: start — SENZA toccare la regola base esistente (gap: 16px resta verbatim per la guardia)', () => {
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-parete-grid \{ grid-auto-rows: var\(--track\); row-gap: 0; align-items: start; \}/
    )
    // la regola-guardia preesistente non deve sparire: deve continuare a matchare verbatim
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-parete-grid \{ display: grid; grid-template-columns: repeat\(3, 1fr\); gap: 16px; \}/
    )
  })

  it('il row-gap:0 vince anche dentro il perimetro shell (specificità 0,2,0, DOPO la regola-guardia del gap fluido — non la tocca) e nel ramo home a device corti (max-height:780px)', () => {
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-parete-shell \.ds-parete-grid \{ row-gap: 0; \}/
    )
    // la regola-guardia del gap fluido shell resta intatta (assert esistente riga 24-28)
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-parete-shell \.ds-parete-grid \{ gap: clamp\(16px, 3\.6cqw, 26px\); \}/
    )
    expect(norm).toMatch(
      /@media \(max-height: 780px\) \{[\s\S]*?\.ua-stanza-parete \.ds-parete-grid \{ row-gap: 0; \}\s*\}/
    )
  })

  it('passo fluido SOLO nel perimetro shell (riserva FE R1, clamp ratificato 40-50 vs 10.2cqw) — il track resta accoppiato via calc(), non va ridichiarato', () => {
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-parete-shell \.ds-parete \{ --passo-maglia: clamp\(40px, 10\.2cqw, 50px\); \}/
    )
  })
})
