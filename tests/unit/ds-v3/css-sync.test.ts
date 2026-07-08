// tests/unit/ds-v3/css-sync.test.ts
// Guardia di sincronia REALE TS↔CSS: parsing per-variabile con uguaglianza esatta,
// non substring containment (che restava verde anche con valori trasposti).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { luce, notte, tipografia, materia } from '@/design-system/v3/tokens'

const css = readFileSync(join(process.cwd(), 'src/app/ds-v3.css'), 'utf8')

/** Normalizza whitespace per confronti stabili (le shadow contengono spazi/virgole). */
const norm = (s: string) => s.trim().replace(/\s+/g, ' ')

/** Estrae un blocco `selettore { ... }` (nessuna graffa annidata nel foglio) e ne parsa le custom property. */
function parseBlock(re: RegExp, label: string): Record<string, string> {
  const m = css.match(re)
  if (!m) throw new Error(`Blocco non trovato in ds-v3.css: ${label}`)
  const vars: Record<string, string> = {}
  for (const d of m[1].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    vars[`--${d[1]}`] = norm(d[2])
  }
  return vars
}

// Blocco light: `[data-ds="v3"] {` a inizio riga (esclude il discendente `.ds-grana` e il blocco dark).
const light = parseBlock(/^\[data-ds="v3"\]\s*\{([^}]*)\}/m, 'light [data-ds="v3"]')
// Blocco dark: `[data-theme="dark"] [data-ds="v3"] {`.
const dark = parseBlock(
  /^\[data-theme="dark"\]\s+\[data-ds="v3"\]\s*\{([^}]*)\}/m,
  'dark [data-theme="dark"] [data-ds="v3"]'
)

// ── Mapping esplicito token TS → variabile CSS, per tema ─────────────────────
// I set di chiavi sono ASIMMETRICI (fedeli alla spec): la luce ha `card`,
// la notte ha `sfc`/`elv`. Nel CSS dark, --card è alimentata da notte.sfc
// (superficie card dark) e --elv da notte.elv (elevazione = superficie più chiara).
const mappaLuce: Record<keyof typeof luce, string> = {
  bg: '--bg', bgDeep: '--bg-deep', card: '--card',
  ink: '--ink', muted: '--muted', faint: '--faint', line: '--line',
  red: '--red', redDark: '--red-dark',
  amber: '--amber', green: '--green', blue: '--blue',
  redTint: '--red-tint', amberTint: '--amber-tint',
  blueTint: '--blue-tint', greenTint: '--green-tint',
}
const mappaNotte: Record<keyof typeof notte, string> = {
  bg: '--bg', sfc: '--card', elv: '--elv',
  ink: '--ink', muted: '--muted', faint: '--faint', line: '--line',
  red: '--red', redDark: '--red-dark',
  amber: '--amber', green: '--green', blue: '--blue',
}

describe('ds-v3.css — sincronia con tokens.ts e scoping', () => {
  it('nessun token TS resta fuori dal mapping (copertura totale)', () => {
    expect(Object.keys(mappaLuce).sort()).toEqual(Object.keys(luce).sort())
    expect(Object.keys(mappaNotte).sort()).toEqual(Object.keys(notte).sort())
  })

  it('light: ogni variabile CSS è ESATTAMENTE il token luce corrispondente', () => {
    for (const [chiave, cssVar] of Object.entries(mappaLuce) as [keyof typeof luce, string][]) {
      expect(light[cssVar], `${cssVar} ← luce.${chiave}`).toBe(luce[chiave])
    }
  })

  it('dark: ogni variabile CSS è ESATTAMENTE il token notte corrispondente', () => {
    for (const [chiave, cssVar] of Object.entries(mappaNotte) as [keyof typeof notte, string][]) {
      expect(dark[cssVar], `${cssVar} ← notte.${chiave}`).toBe(notte[chiave])
    }
  })

  it('materia e tipografia: shadow, grana e font sincronizzati con i token TS', () => {
    expect(light['--sh-card']).toBe(norm(materia.shCard))
    expect(light['--sh-press']).toBe(norm(materia.shPress))
    expect(light['--grana-opacity']).toBe(String(materia.granaOpacityLight))
    expect(light['--font-v3']).toBe(norm(tipografia.famiglia))
    expect(dark['--grana-opacity']).toBe(String(materia.granaOpacityDark))
    // Dark = flat per spec §3.2: MAI ombre
    expect(dark['--sh-card']).toBe('none')
    expect(dark['--sh-press']).toBe('none')
  })

  it('valori solo-CSS senza controparte TS: pinned come letterali (anti-drift)', () => {
    // Il dark ha un bg-deep dedicato e tinte rgba traslucide (spec §3.2) che
    // non esistono in `notte`: se cambiano, devono cambiare qui consapevolmente.
    expect(dark['--bg-deep']).toBe('#100E0B')
    expect(dark['--red-tint']).toBe('rgba(255,59,68,.14)')
    expect(dark['--amber-tint']).toBe('rgba(232,161,61,.14)')
    expect(dark['--blue-tint']).toBe('rgba(91,155,255,.14)')
    expect(dark['--green-tint']).toBe('rgba(52,196,104,.14)')
    // Il light ha `--elv` come alias di `--card` (carry-over review SP1): non esiste
    // in `luce` (solo `notte` ha elv dedicato), quindi pinnato come letterale.
    expect(light['--elv']).toBe('var(--card)')
  })

  it('ogni blocco di regole è scoped [data-ds="v3"] (coesistenza con v2.3)', () => {
    expect(Object.keys(light).length).toBeGreaterThan(0)
    expect(css).toMatch(/\[data-ds="v3"\]\s*\{/)
    expect(css).toMatch(/\[data-theme="dark"\]\s+\[data-ds="v3"\]|\[data-ds="v3"\]\[data-theme="dark"\]/)
    expect(css).not.toMatch(/^:root\s*\{/m) // mai :root qui — romperebbe v2.3
  })

  it('nessuna stringa bandita (anti-AI-slop)', () => {
    for (const bandita of ['#E30613', '#1B2D6B', 'Inter', 'Roboto']) {
      expect(css).not.toContain(bandita)
    }
  })

  it('globals.css importa ds-v3.css', () => {
    const globals = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')
    expect(globals).toContain("@import './ds-v3.css'")
  })
})
