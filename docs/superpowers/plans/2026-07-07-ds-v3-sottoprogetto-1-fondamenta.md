# DS v3 — Sotto-progetto 1: Fondamenta in codice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Portare in codice le fondamenta del Design System v3 «Una cosa alla volta» (spec: `docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md`) senza toccare NESSUNA pagina esistente: token, motion, suoni (asset + player), haptics, dizionario, enforcement, font.

**Architecture:** Tutto il codice v3 vive in `src/design-system/v3/` (nuova cartella) + un foglio CSS scoped `src/app/ds-v3.css` con selettore `[data-ds="v3"]` (coesistenza: le pagine v2.3 non vedono nulla; le pagine future migreranno aggiungendo `data-ds="v3"` al wrapper). Gli asset audio sono WAV generati proceduralmente da uno script versionato (master provvisori, sostituibili 1:1 da un sound designer). Nessuna migration, nessuna API, nessuna pagina modificata.

**Tech Stack:** Next.js 16 · TypeScript · Motion 12 (`visualDuration`/`bounce`) · Web Audio API · Vitest 4 · @fontsource/plus-jakarta-sans.

## Global Constraints (dalla spec — valori di legge)

- Molle (§8.1): `snappy {visualDuration:0.5, bounce:0.15}` · `smooth {visualDuration:0.5, bounce:0}` · `bouncy {visualDuration:0.5, bounce:0.3}` · `press {stiffness:1754, damping:72, mass:1}` · `wizard {visualDuration:0.35, bounce:0.1}`.
- Fallback CSS (§8.1): sheet `500ms cubic-bezier(0.32,0.72,0,1)` · generico `200ms cubic-bezier(0.25,0.1,0.25,1)` · snap `cubic-bezier(0.16,1,0.3,1)`.
- Colori light (§3.1): bg `#F4F0E7` · bg-deep `#ECE6D9` · card `#FFFEFA` · ink `#1D1913` · muted `#6E6457` · faint `#A69B8C` · line `#EBE4D6` · red `#D90012` · red-dark `#A5000E` · amber `#9A5C00` · green `#1B7F3B` · blue `#1D5FBF` · tints `#FBEDEC/#F8F0E1/#EBF1FA/#EAF4EC`.
- Colori dark (§3.2): bg `#171411` · sfc `#211D18` · elv `#2B2620` · ink `#F2EEE7` · muted `#A69B8C` · faint `#6E6457` · line `#342E26` · red `#FF3B44` · red-dark `#8F0910` · amber `#E8A13D` · green `#34C468` · blue `#5B9BFF`.
- Tipografia (§4.1): SOLO Plus Jakarta Sans 400/600/700/800; scala: display 52 · large-title 31 · question 35 · title 27 · heading 21 · body 17 · callout 15.5 · label 13 · caption 12.5.
- Suoni (§9.1): 5 file WAV 48kHz in `public/sounds/`: `tap.wav ≤40ms` · `fatta.wav ≤120ms` · `ua.wav 400-600ms` · `errore.wav ≤200ms` · `arrivo.wav ≤250ms`. Default ATTIVI, toggle `localStorage['ua_sounds_v3']==='off'` per spegnere. Web Audio, unlock al primo `touchend`.
- Haptics (§9.3): SOLO `navigator.vibrate` con feature-detect (iOS Safari non lo supporta): selection 10 · light 15 · medium 30 · success `[15,80,25]` · error `[40,60,40,60,40]`.
- VIETATO in v3: colori/durate/curve inline, DM Sans/Playfair, parole del software (§2.3).
- Commit format progetto: `feat(ds-v3): …` / `chore(ds-v3): …`. Ogni task termina con commit.
- Comandi verifica: `npx tsc --noEmit` · `npx vitest run` · `npx next build`.

## File Structure

```
src/design-system/v3/
├── tokens.ts        # colori/tipo/spazio/raggi/materia — fonte TS
├── motion.ts        # 5 molle + coreografie + fallback CSS (re-usa useReducedMotion da ../motion)
├── sound.ts         # player Web Audio (unlock, preload, play)
├── haptic.ts        # pattern Android-only
└── dizionario.ts    # parole vietate → parole del banco + linter runtime
src/app/ds-v3.css    # CSS vars scoped [data-ds="v3"] (light+dark) + grana + font
scripts/generate-sounds.mjs  # genera i 5 WAV (master provvisori)
public/sounds/{tap,fatta,ua,errore,arrivo}.wav
tests/unit/ds-v3/{tokens,css-sync,motion,sound,haptic,dizionario,wav-assets}.test.ts
scripts/check-ds-compliance.sh  # esteso con sezione v3
src/app/layout.tsx   # + import @fontsource (4 pesi)
package.json         # + @fontsource/plus-jakarta-sans
```

---

### Task 1: Font Plus Jakarta Sans self-hosted

**Files:**
- Modify: `package.json` (dependency)
- Modify: `src/app/layout.tsx:1-3` (import dei 4 pesi)

**Interfaces:**
- Produces: font-family `'Plus Jakarta Sans'` disponibile globalmente (self-hosted via fontsource, `font-display: swap` incluso nei css del pacchetto). La famiglia CSS è consumata dal Task 4 (`ds-v3.css`).

- [ ] **Step 1: Installa il pacchetto**

Run: `npm install @fontsource/plus-jakarta-sans`
Expected: aggiunto a `dependencies` senza errori di peer.

- [ ] **Step 2: Importa i 4 pesi in layout.tsx**

In `src/app/layout.tsx`, PRIMA di `import './globals.css'`:

```ts
import '@fontsource/plus-jakarta-sans/400.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import '@fontsource/plus-jakarta-sans/800.css'
```

- [ ] **Step 3: Verifica build**

Run: `npx next build 2>&1 | tail -5`
Expected: build completata; nessun errore di modulo.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/app/layout.tsx
git commit -m "feat(ds-v3): font Plus Jakarta Sans self-hosted (4 pesi, fontsource)"
```

---

### Task 2: dizionario.ts — le parole del banco

**Files:**
- Create: `src/design-system/v3/dizionario.ts`
- Test: `tests/unit/ds-v3/dizionario.test.ts`

**Interfaces:**
- Produces: `PAROLE_VIETATE: ReadonlyArray<{vietata: RegExp; usa: string}>` · `trovaParoleVietate(testo: string): string[]` (ritorna le parole vietate trovate, vuoto se ok). Consumata dal Task 9 (check script la usa via grep sulle stesse parole) e dalle review future.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/ds-v3/dizionario.test.ts
import { describe, it, expect } from 'vitest'
import { trovaParoleVietate, PAROLE_VIETATE } from '@/design-system/v3/dizionario'

describe('dizionario v3 — parole del banco', () => {
  it('trova le parole del software in un testo UI', () => {
    expect(trovaParoleVietate('Compila il form e premi Submit')).toEqual(['form', 'submit'])
    expect(trovaParoleVietate('Vai alla dashboard')).toEqual(['dashboard'])
    expect(trovaParoleVietate('Errore 500: richiesta fallita')).toContain('errore 500')
  })
  it('non segnala testi in parole del banco', () => {
    expect(trovaParoleVietate('È arrivata un\'impronta? Tocca il tasto rosso')).toEqual([])
    expect(trovaParoleVietate('Corona n.147 · consegna oggi alle 16:00')).toEqual([])
  })
  it('non fa falsi positivi su sottostringhe', () => {
    // "informa" contiene "forma" non "form" come parola
    expect(trovaParoleVietate('UÀ ti informa quando ha finito')).toEqual([])
    expect(trovaParoleVietate('la piattaforma')).toEqual([])
  })
  it('ogni parola vietata ha il sostituto del banco', () => {
    for (const p of PAROLE_VIETATE) expect(p.usa.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/ds-v3/dizionario.test.ts`
Expected: FAIL — "Cannot find module '@/design-system/v3/dizionario'"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/design-system/v3/dizionario.ts
// DS v3 §2.3 — Dizionario obbligatorio: parole del software → parole del banco.
// Fonte di verità per copy UI. Il check pre-commit (scripts/check-ds-compliance.sh §v3)
// greppa le stesse parole nei file di src/components/ds/.

export const PAROLE_VIETATE: ReadonlyArray<{ vietata: RegExp; usa: string }> = [
  { vietata: /\bdashboard\b/i,            usa: 'Home (o niente: è "l\'app")' },
  { vietata: /\bform\b/i,                 usa: 'una domanda alla volta (il concetto sparisce)' },
  { vietata: /\brecord\b/i,               usa: 'lavoro / scheda' },
  { vietata: /\bsubmit\b/i,               usa: 'Fatto ✓' },
  { vietata: /\bsalva\b/i,                usa: 'Fatto ✓ (o salvataggio automatico silenzioso)' },
  { vietata: /\bfiltr\w+/i,               usa: 'Cerca (le pile sono i filtri)' },
  { vietata: /\bquery\b/i,                usa: '—' },
  { vietata: /\btask\b/i,                 usa: 'cose da fare' },
  { vietata: /\bto-?do\b/i,               usa: 'cose da fare' },
  { vietata: /errore\s*\d{3}/i,           usa: 'Non ci sono riuscita. Riprovo?' },
  { vietata: /richiesta\s+fallita/i,      usa: 'Non ci sono riuscita. Riprovo?' },
  { vietata: /\bloading\b/i,              usa: 'Un attimo…' },
  { vietata: /caricamento\s+in\s+corso/i, usa: 'Un attimo…' },
  { vietata: /\bin_lavorazione\b/i,       usa: 'Sul banco / In forno / In rifinitura' },
  { vietata: /elimina\s+definitivamente/i, usa: 'Butta via (con via di fuga)' },
  { vietata: /campo\s+obbligatorio/i,     usa: '(la domanda stessa lo rende ovvio)' },
] as const

/** Ritorna le parole vietate trovate nel testo (minuscole), [] se pulito. */
export function trovaParoleVietate(testo: string): string[] {
  const trovate: string[] = []
  for (const { vietata } of PAROLE_VIETATE) {
    const m = testo.match(vietata)
    if (m) trovate.push(m[0].toLowerCase())
  }
  return trovate
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/ds-v3/dizionario.test.ts`
Expected: PASS (4 test)

- [ ] **Step 5: Commit**

```bash
git add src/design-system/v3/dizionario.ts tests/unit/ds-v3/dizionario.test.ts
git commit -m "feat(ds-v3): dizionario parole del banco (§2.3) con linter runtime"
```

---

### Task 3: tokens.ts v3 — colori, tipografia, spazio, materia

**Files:**
- Create: `src/design-system/v3/tokens.ts`
- Test: `tests/unit/ds-v3/tokens.test.ts`

**Interfaces:**
- Produces: `luce`, `notte` (Record<TokenColore, string>), `tipografia`, `spazio`, `raggio`, `materia`, `varV3(nome)` helper → `var(--nome)`. Consumati da Task 4 (sync CSS) e da tutti i componenti futuri.

- [ ] **Step 1: Write the failing test** (valori di legge + contrasto WCAG calcolato, non fidato)

```ts
// tests/unit/ds-v3/tokens.test.ts
import { describe, it, expect } from 'vitest'
import { luce, notte, tipografia, raggio, varV3 } from '@/design-system/v3/tokens'

function lum(hex: string): number {
  const c = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrasto(a: string, b: string): number {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

describe('tokens v3 — valori di legge (spec §3-4)', () => {
  it('light: valori esatti', () => {
    expect(luce.bg).toBe('#F4F0E7')
    expect(luce.card).toBe('#FFFEFA')
    expect(luce.ink).toBe('#1D1913')
    expect(luce.red).toBe('#D90012')
    expect(luce.amber).toBe('#9A5C00')
  })
  it('dark: valori esatti', () => {
    expect(notte.bg).toBe('#171411')
    expect(notte.sfc).toBe('#211D18')
    expect(notte.red).toBe('#FF3B44')
  })
  it('WCAG AA: testo secondario ≥ 4.5:1 in entrambi i temi', () => {
    expect(contrasto(luce.muted, luce.card)).toBeGreaterThanOrEqual(4.5)
    expect(contrasto(luce.muted, luce.bg)).toBeGreaterThanOrEqual(4.5)
    expect(contrasto(luce.ink, luce.card)).toBeGreaterThanOrEqual(7)
    expect(contrasto(notte.muted, notte.sfc)).toBeGreaterThanOrEqual(4.5)
    expect(contrasto(notte.ink, notte.bg)).toBeGreaterThanOrEqual(7)
  })
  it('stati leggibili su carta in light', () => {
    for (const c of [luce.amber, luce.green, luce.blue, luce.red])
      expect(contrasto(c, luce.card)).toBeGreaterThanOrEqual(4.5)
  })
  it('tipografia: scala chiusa e lettura ≥17', () => {
    expect(tipografia.size.body).toBe(17)
    expect(tipografia.size.display).toBe(52)
    expect(tipografia.size.question).toBe(35)
    expect(Math.min(...Object.values(tipografia.size))).toBeGreaterThanOrEqual(12.5)
    expect(tipografia.famiglia).toContain('Plus Jakarta Sans')
  })
  it('raggi chiusi e helper var', () => {
    expect(raggio.card).toBe(24)
    expect(varV3('red')).toBe('var(--red)')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/ds-v3/tokens.test.ts`
Expected: FAIL — modulo mancante.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/design-system/v3/tokens.ts
// FONTE DI VERITÀ DS v3 «Una cosa alla volta» — spec 2026-07-07 §3-4.
// REGOLA ZERO: mai colori/shadow/raggi inline. Le pagine v3 stanno sotto [data-ds="v3"].

export const luce = {
  bg: '#F4F0E7', bgDeep: '#ECE6D9', card: '#FFFEFA',
  ink: '#1D1913', muted: '#6E6457', faint: '#A69B8C', line: '#EBE4D6',
  red: '#D90012', redDark: '#A5000E',
  amber: '#9A5C00', green: '#1B7F3B', blue: '#1D5FBF',
  redTint: '#FBEDEC', amberTint: '#F8F0E1', blueTint: '#EBF1FA', greenTint: '#EAF4EC',
} as const

export const notte = {
  bg: '#171411', sfc: '#211D18', elv: '#2B2620',
  ink: '#F2EEE7', muted: '#A69B8C', faint: '#6E6457', line: '#342E26',
  red: '#FF3B44', redDark: '#8F0910',
  amber: '#E8A13D', green: '#34C468', blue: '#5B9BFF',
} as const

export const tipografia = {
  famiglia: "'Plus Jakarta Sans', system-ui, sans-serif",
  // px — scala chiusa (§4.1). Lettura mai sotto body (17).
  size: { display: 52, question: 35, largeTitle: 31, title: 27, heading: 21, body: 17, callout: 15.5, label: 13, caption: 12.5 },
  weight: { regular: 400, semibold: 600, bold: 700, extrabold: 800 },
  tracking: { display: '-0.03em', titoli: '-0.02em', label: '0.16em', caption: '0.14em' },
} as const

// Griglia 8px (§4.2) — valori ammessi
export const spazio = { xs: 4, s: 8, sm: 12, m: 16, ml: 20, l: 24, xl: 32, xxl: 44 } as const

export const raggio = { card: 24, sheet: 28, tile: 22, riga: 18, tasto: 20, pill: 999 } as const

export const materia = {
  shCard: '0 1px 0 rgba(255,255,255,.9) inset, 0 2px 3px rgba(50,40,25,.05), 0 16px 30px -18px rgba(50,40,25,.35)',
  shPress: '0 4px 0 rgba(50,40,25,.12), 0 14px 24px -14px rgba(50,40,25,.3), inset 0 1px 0 rgba(255,255,255,.9)',
  granaOpacityLight: 0.05,
  granaOpacityDark: 0.06,
  corsaTastoPx: 5, // §5.1 — corsa fisica del tasto primario
} as const

export type TokenColoreLuce = keyof typeof luce
export function varV3(nome: string): string {
  // kebab-case della chiave: bgDeep → --bg-deep
  return `var(--${nome.replace(/[A-Z]/g, m => '-' + m.toLowerCase())})`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/ds-v3/tokens.test.ts`
Expected: PASS (6 test — il test di contrasto CALCOLA i rapporti: se un valore di spec fosse sbagliato, fallirebbe qui).

- [ ] **Step 5: Commit**

```bash
git add src/design-system/v3/tokens.ts tests/unit/ds-v3/tokens.test.ts
git commit -m "feat(ds-v3): tokens v3 (colori light/dark, tipografia, spazio, materia) con contrasti WCAG testati"
```

---

### Task 4: ds-v3.css — CSS vars scoped `[data-ds="v3"]` + test di sincronia

**Files:**
- Create: `src/app/ds-v3.css`
- Modify: `src/app/globals.css:1-2` (aggiungi `@import './ds-v3.css';` DOPO l'import dei font Google esistente)
- Test: `tests/unit/ds-v3/css-sync.test.ts`

**Interfaces:**
- Consumes: `luce`, `notte`, `tipografia` dal Task 3.
- Produces: variabili CSS `--bg --bg-deep --card --ink --muted --faint --line --red --red-dark --amber --green --blue --red-tint --amber-tint --blue-tint --green-tint --sh-card --sh-press --font-v3` attive SOLO dentro `[data-ds="v3"]`.

- [ ] **Step 1: Write the failing test** (guardia di sincronia TS↔CSS con parsing REALE per-variabile: uguaglianza esatta token↔var, non substring containment — il containment restava verde anche con valori trasposti)

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/ds-v3/css-sync.test.ts`
Expected: FAIL — file mancante.

- [ ] **Step 3: Write the CSS**

```css
/* src/app/ds-v3.css — DS v3 «Una cosa alla volta» (spec 2026-07-07)
   SCOPED: tutto vive sotto [data-ds="v3"]. Le pagine v2.3 non sono toccate.
   Migrare una pagina = avvolgerla in <div data-ds="v3">. */

[data-ds="v3"] {
  /* superfici */
  --bg: #F4F0E7; --bg-deep: #ECE6D9; --card: #FFFEFA;
  /* inchiostri */
  --ink: #1D1913; --muted: #6E6457; --faint: #A69B8C; --line: #EBE4D6;
  /* azione e stati */
  --red: #D90012; --red-dark: #A5000E;
  --amber: #9A5C00; --green: #1B7F3B; --blue: #1D5FBF;
  --red-tint: #FBEDEC; --amber-tint: #F8F0E1; --blue-tint: #EBF1FA; --green-tint: #EAF4EC;
  /* materia */
  --sh-card: 0 1px 0 rgba(255,255,255,.9) inset, 0 2px 3px rgba(50,40,25,.05), 0 16px 30px -18px rgba(50,40,25,.35);
  --sh-press: 0 4px 0 rgba(50,40,25,.12), 0 14px 24px -14px rgba(50,40,25,.3), inset 0 1px 0 rgba(255,255,255,.9);
  --grana-opacity: 0.05;
  /* tipografia */
  --font-v3: 'Plus Jakarta Sans', system-ui, sans-serif;

  font-family: var(--font-v3);
  background: var(--bg);
  color: var(--ink);
}

/* Dark — elevazione = superficie più chiara, MAI ombre (spec §3.2) */
[data-theme="dark"] [data-ds="v3"] {
  --bg: #171411; --bg-deep: #100E0B; --card: #211D18; --elv: #2B2620;
  --ink: #F2EEE7; --muted: #A69B8C; --faint: #6E6457; --line: #342E26;
  --red: #FF3B44; --red-dark: #8F0910;
  --amber: #E8A13D; --green: #34C468; --blue: #5B9BFF;
  --red-tint: rgba(255,59,68,.14); --amber-tint: rgba(232,161,61,.14);
  --blue-tint: rgba(91,155,255,.14); --green-tint: rgba(52,196,104,.14);
  --sh-card: none; --sh-press: none;
  --grana-opacity: 0.06;
}
[data-theme="dark"] [data-ds="v3"] .ds-card { border-top: 1px solid rgba(255,255,255,.04); }

/* Grana — SOLO su elemento fixed dedicato (spec §4.3), mai su container scrollanti */
[data-ds="v3"] .ds-grana {
  position: fixed; inset: 0; pointer-events: none; z-index: 40;
  opacity: var(--grana-opacity); mix-blend-mode: multiply;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2"/><feColorMatrix type="saturate" values="0"/></filter><rect width="180" height="180" filter="url(%23n)"/></svg>');
}
[data-theme="dark"] [data-ds="v3"] .ds-grana { mix-blend-mode: screen; }

/* Reduced motion — le coreografie degradano a dissolvenza (spec §8.4) */
@media (prefers-reduced-motion: reduce) {
  [data-ds="v3"] * { animation-duration: 0.15s !important; transition-duration: 0.15s !important; }
}
```

In `src/app/globals.css`, subito dopo la riga 1 (l'`@import` dei Google Fonts esistente):

```css
@import './ds-v3.css';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/ds-v3/css-sync.test.ts`
Expected: PASS. Poi `npx next build 2>&1 | tail -3` → build ok (l'@import di un css locale è supportato da PostCSS/Tailwind v4).

- [ ] **Step 5: Commit**

```bash
git add src/app/ds-v3.css src/app/globals.css tests/unit/ds-v3/css-sync.test.ts
git commit -m "feat(ds-v3): CSS vars scoped [data-ds=v3] light+dark, grana, reduced-motion — coesistenza con v2.3"
```

---

### Task 5: motion.ts v3 — le 5 molle e le coreografie

**Files:**
- Create: `src/design-system/v3/motion.ts`
- Test: `tests/unit/ds-v3/motion.test.ts`

**Interfaces:**
- Consumes: `useReducedMotion` da `src/design-system/motion.ts` (riesportato — un solo hook nel progetto).
- Produces: `molla = {snappy, smooth, bouncy, press, wizard}` · `cssEase = {sheet, generico, snap}` · `coreografie = {pilaEspansione, wizardAvanti, wizardIndietro, sheetSu, spuntaFatta, consegnatoCheck, consegnatoCascata, avviso}` · re-export `useReducedMotion`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/ds-v3/motion.test.ts
import { describe, it, expect } from 'vitest'
import { molla, cssEase, coreografie, useReducedMotion } from '@/design-system/v3/motion'

describe('motion v3 — molle Apple (spec §8.1)', () => {
  it('le 5 molle hanno i valori di legge', () => {
    expect(molla.snappy).toEqual({ type: 'spring', visualDuration: 0.5, bounce: 0.15 })
    expect(molla.smooth).toEqual({ type: 'spring', visualDuration: 0.5, bounce: 0 })
    expect(molla.bouncy).toEqual({ type: 'spring', visualDuration: 0.5, bounce: 0.3 })
    expect(molla.press).toEqual({ type: 'spring', stiffness: 1754, damping: 72, mass: 1 })
    expect(molla.wizard).toEqual({ type: 'spring', visualDuration: 0.35, bounce: 0.1 })
  })
  it('fallback CSS di legge', () => {
    expect(cssEase.sheet).toBe('500ms cubic-bezier(0.32, 0.72, 0, 1)')
    expect(cssEase.generico).toBe('200ms cubic-bezier(0.25, 0.1, 0.25, 1)')
  })
  it('coreografia consegnato: check ~450ms poi cascata stagger 80ms', () => {
    expect(coreografie.consegnatoCheck.transition.duration).toBeCloseTo(0.45)
    expect(coreografie.consegnatoCascata.animate.transition.staggerChildren).toBeCloseTo(0.08)
  })
  it('riesporta useReducedMotion (un solo hook nel progetto)', () => {
    expect(typeof useReducedMotion).toBe('function')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/ds-v3/motion.test.ts`
Expected: FAIL — modulo mancante.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/design-system/v3/motion.ts
// DS v3 §8 — le UNICHE animazioni ammesse. Tutto il resto è `instant` (nessuna transizione).
// Molle = traduzione diretta delle spring iOS (ricerca HIG 07/07/2026):
// snappy=.snappy, smooth=.smooth, bouncy=.bouncy, press=.interactiveSpring, wizard=nav push.

export { useReducedMotion } from '../motion'

export const molla = {
  snappy: { type: 'spring', visualDuration: 0.5, bounce: 0.15 },
  smooth: { type: 'spring', visualDuration: 0.5, bounce: 0 },
  bouncy: { type: 'spring', visualDuration: 0.5, bounce: 0.3 },
  press:  { type: 'spring', stiffness: 1754, damping: 72, mass: 1 },
  wizard: { type: 'spring', visualDuration: 0.35, bounce: 0.1 },
} as const

// Fallback CSS (spec §8.1) — per transition CSS pure (frequency gate) e device low-end
export const cssEase = {
  sheet: '500ms cubic-bezier(0.32, 0.72, 0, 1)',
  generico: '200ms cubic-bezier(0.25, 0.1, 0.25, 1)',
  snap: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const

// Le coreografie canoniche (§8.3) — SOLO queste. Variants Motion pronti all'uso.
export const coreografie = {
  /** 1. Pila → lista: la card si espande nell'header (usare con layoutId condiviso) */
  pilaEspansione: { transition: molla.smooth },
  /** 3. Passo wizard avanti: scivolata corta, il precedente resta dietro al 30% */
  wizardAvanti: {
    initial: { x: '100%', opacity: 0.6 },
    animate: { x: 0, opacity: 1, transition: molla.wizard },
    exit: { x: '-30%', opacity: 0.5, transition: molla.wizard },
  },
  wizardIndietro: {
    initial: { x: '-30%', opacity: 0.5 },
    animate: { x: 0, opacity: 1, transition: molla.wizard },
    exit: { x: '100%', opacity: 0.6, transition: molla.wizard },
  },
  /** 6. Sheet: sale dal basso, la vista sotto scala a .96 (scale gestita dal caller) */
  sheetSu: {
    initial: { y: '100%' },
    animate: { y: 0, transition: molla.smooth },
    exit: { y: '100%', transition: molla.smooth },
  },
  /** 5. Spunta FATTA: il cerchio si riempie e trabocca appena */
  spuntaFatta: {
    initial: { scale: 0.6, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: molla.bouncy },
  },
  /** 4a. Consegnato!: il check si disegna (450ms), sincronizzato al picco di ua.wav */
  consegnatoCheck: {
    initial: { pathLength: 0, opacity: 0 },
    animate: { pathLength: 1, opacity: 1 },
    transition: { duration: 0.45, ease: [0, 0, 0.2, 1] as const },
  },
  /** 4b. Consegnato!: la lista "UÀ ha già fatto" entra a cascata */
  consegnatoCascata: {
    animate: { transition: { staggerChildren: 0.08, delayChildren: 0.45 } },
  },
  /** Avviso (toast): entra con snappy, esce secco */
  avviso: {
    initial: { y: -16, opacity: 0 },
    animate: { y: 0, opacity: 1, transition: molla.snappy },
    exit: { y: -8, opacity: 0, transition: { duration: 0.14, ease: [0.4, 0, 1, 1] as const } },
  },
} as const
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/ds-v3/motion.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/design-system/v3/motion.ts tests/unit/ds-v3/motion.test.ts
git commit -m "feat(ds-v3): motion v3 — 5 molle iOS→Motion12 + coreografie canoniche §8.3"
```

---

### Task 6: generate-sounds.mjs — i 5 WAV firmati (master provvisori)

**Files:**
- Create: `scripts/generate-sounds.mjs`
- Create (generati): `public/sounds/{tap,fatta,ua,errore,arrivo}.wav`
- Test: `tests/unit/ds-v3/wav-assets.test.ts`

**Interfaces:**
- Produces: 5 file WAV PCM16 mono 48kHz in `public/sounds/`, nomi e durate di legge (§9.1). Consumati da Task 7. I file sono MASTER PROVVISORI sintetici: un sound designer potrà sostituirli 1:1 (stessi nomi/durate) senza toccare codice.

- [ ] **Step 1: Write the failing test** (legge gli header WAV reali)

```ts
// tests/unit/ds-v3/wav-assets.test.ts
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const DIR = join(process.cwd(), 'public/sounds')
const ATTESI: Array<[string, number, number]> = [ // [nome, minMs, maxMs] (spec §9.1)
  ['tap.wav', 5, 40], ['fatta.wav', 40, 120], ['ua.wav', 400, 600],
  ['errore.wav', 80, 200], ['arrivo.wav', 80, 250],
]

function infoWav(path: string) {
  const b = readFileSync(path)
  expect(b.subarray(0, 4).toString()).toBe('RIFF')
  expect(b.subarray(8, 12).toString()).toBe('WAVE')
  const sampleRate = b.readUInt32LE(24)
  const byteRate = b.readUInt32LE(28)
  const dataSize = b.readUInt32LE(b.indexOf(Buffer.from('data')) + 4)
  return { sampleRate, durataMs: (dataSize / byteRate) * 1000 }
}

describe('asset audio v3 (spec §9.1)', () => {
  for (const [nome, minMs, maxMs] of ATTESI) {
    it(`${nome}: esiste, 48kHz, durata ${minMs}-${maxMs}ms`, () => {
      const p = join(DIR, nome)
      expect(existsSync(p), `manca ${nome} — esegui: node scripts/generate-sounds.mjs`).toBe(true)
      const { sampleRate, durataMs } = infoWav(p)
      expect(sampleRate).toBe(48000)
      expect(durataMs).toBeGreaterThanOrEqual(minMs)
      expect(durataMs).toBeLessThanOrEqual(maxMs)
    })
  }
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/ds-v3/wav-assets.test.ts`
Expected: FAIL — file mancanti.

- [ ] **Step 3: Write the generator**

```js
// scripts/generate-sounds.mjs
// Genera i 5 suoni firmati DS v3 (§9.1) come WAV PCM16 mono 48kHz.
// MASTER PROVVISORI sintetici — sostituibili 1:1 da un sound designer.
// Uso: node scripts/generate-sounds.mjs
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const SR = 48000
const dir = join(process.cwd(), 'public/sounds')
mkdirSync(dir, { recursive: true })

function wav(samples) {
  const n = samples.length
  const buf = Buffer.alloc(44 + n * 2)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8)
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28)
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34)
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.max(-1, Math.min(1, samples[i])) * 32767, 44 + i * 2)
  return buf
}

/** nota con attacco/decadimento esponenziale e armonica calda */
function nota(freq, ms, { gain = 0.5, attackMs = 4, warm = 0.25 } = {}) {
  const n = Math.round((ms / 1000) * SR)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const att = Math.min(1, (i / SR) * 1000 / attackMs)
    const dec = Math.exp(-t * (5 / (ms / 1000)))
    out[i] = gain * att * dec * (Math.sin(2 * Math.PI * freq * t) + warm * Math.sin(2 * Math.PI * freq * 0.5 * t))
  }
  return out
}
function mixa(...tracks) {
  const n = Math.max(...tracks.map(t => t.offset + t.s.length))
  const out = new Float32Array(n)
  for (const { s, offset } of tracks) for (let i = 0; i < s.length; i++) out[offset + i] += s[i]
  return out
}
const off = ms => Math.round((ms / 1000) * SR)

// tap: tick di legno quasi impercettibile (30ms, 1800Hz smorzatissimo)
writeFileSync(join(dir, 'tap.wav'), wav(nota(1800, 30, { gain: 0.18, attackMs: 1, warm: 0.1 })))
// fatta: click morbido caldo (110ms, doppia parziale)
writeFileSync(join(dir, 'fatta.wav'), wav(mixa(
  { s: nota(1180, 110, { gain: 0.3, attackMs: 2 }), offset: 0 },
  { s: nota(590, 110, { gain: 0.2, attackMs: 2 }), offset: 0 },
)))
// ua: LA FIRMA — due note ascendenti (terza maggiore A4→C#5), calde, ~520ms
writeFileSync(join(dir, 'ua.wav'), wav(mixa(
  { s: nota(440.0, 260, { gain: 0.4, attackMs: 8, warm: 0.35 }), offset: 0 },
  { s: nota(554.37, 300, { gain: 0.45, attackMs: 8, warm: 0.35 }), offset: off(200) },
)))
// errore: tonfo smorzato grave (170ms, 130Hz)
writeFileSync(join(dir, 'errore.wav'), wav(nota(130, 170, { gain: 0.5, attackMs: 2, warm: 0.5 })))
// arrivo: nota singola calda (E5, 210ms)
writeFileSync(join(dir, 'arrivo.wav'), wav(nota(659.25, 210, { gain: 0.35, attackMs: 6, warm: 0.3 })))

console.log('✅ 5 suoni DS v3 generati in public/sounds/')
```

Run: `node scripts/generate-sounds.mjs`
Expected: `✅ 5 suoni DS v3 generati in public/sounds/`

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/ds-v3/wav-assets.test.ts`
Expected: PASS (5 test). Ascolto manuale opzionale: `afplay public/sounds/ua.wav` (macOS).

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-sounds.mjs public/sounds/*.wav tests/unit/ds-v3/wav-assets.test.ts
git commit -m "feat(ds-v3): 5 suoni firmati §9.1 (master provvisori sintetici, WAV 48kHz) + generatore"
```

---

### Task 7: sound.ts v3 — player Web Audio con unlock iOS

**Files:**
- Create: `src/design-system/v3/sound.ts`
- Test: `tests/unit/ds-v3/sound.test.ts`

**Interfaces:**
- Consumes: asset Task 6 (`/sounds/<nome>.wav`).
- Produces: `type NomeSuono = 'tap'|'fatta'|'ua'|'errore'|'arrivo'` · `initSuoni(): void` (registra l'unlock una tantum su `touchend`/`click`) · `suona(nome: NomeSuono): void` (fire-and-forget, mai throw) · `suoniAttivi(): boolean` · `impostaSuoni(on: boolean): void`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/ds-v3/sound.test.ts
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

const started: string[] = []
class FakeSource { buffer: unknown = null; connect() { return this } start() { started.push('start') } }
class FakeAudioContext {
  state = 'suspended'
  destination = {}
  resume = vi.fn(async () => { this.state = 'running' })
  decodeAudioData = vi.fn(async () => ({ duration: 0.1 }))
  createBufferSource() { return new FakeSource() }
}

beforeEach(() => {
  vi.resetModules()
  started.length = 0
  localStorage.clear()
  vi.stubGlobal('AudioContext', FakeAudioContext)
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })))
})

describe('sound v3 (spec §9.2)', () => {
  it('default ATTIVI; toggle spegne', async () => {
    const { suoniAttivi, impostaSuoni } = await import('@/design-system/v3/sound')
    expect(suoniAttivi()).toBe(true)
    impostaSuoni(false)
    expect(suoniAttivi()).toBe(false)
    expect(localStorage.getItem('ua_sounds_v3')).toBe('off')
  })
  it('non suona prima dell\'unlock (policy iOS), suona dopo il primo touchend', async () => {
    const { initSuoni, suona } = await import('@/design-system/v3/sound')
    initSuoni()
    suona('tap')
    await vi.waitFor(() => {}) // flush microtasks
    expect(started).toHaveLength(0)
    document.dispatchEvent(new Event('touchend'))
    await new Promise(r => setTimeout(r, 0))
    suona('tap')
    await vi.waitFor(() => expect(started.length).toBeGreaterThan(0))
  })
  it('spento: mai chiamate audio', async () => {
    const { initSuoni, suona, impostaSuoni } = await import('@/design-system/v3/sound')
    impostaSuoni(false)
    initSuoni()
    document.dispatchEvent(new Event('touchend'))
    await new Promise(r => setTimeout(r, 0))
    suona('ua')
    await new Promise(r => setTimeout(r, 0))
    expect(started).toHaveLength(0)
  })
  it('suona() non lancia mai (fetch rotto)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('rete') }))
    const { initSuoni, suona } = await import('@/design-system/v3/sound')
    initSuoni()
    document.dispatchEvent(new Event('touchend'))
    await new Promise(r => setTimeout(r, 0))
    expect(() => suona('errore')).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/ds-v3/sound.test.ts`
Expected: FAIL — modulo mancante.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/design-system/v3/sound.ts
// DS v3 §9 — player dei 5 suoni firmati. Web Audio, unlock al primo touchend/click
// (policy iOS Safari: il gesto valido è il sollevamento del dito).
// I suoni NON veicolano mai informazione esclusiva (c'è sempre il visivo — L3).

export type NomeSuono = 'tap' | 'fatta' | 'ua' | 'errore' | 'arrivo'
const FILES: Record<NomeSuono, string> = {
  tap: '/sounds/tap.wav', fatta: '/sounds/fatta.wav', ua: '/sounds/ua.wav',
  errore: '/sounds/errore.wav', arrivo: '/sounds/arrivo.wav',
}
const KEY = 'ua_sounds_v3'

let ctx: AudioContext | null = null
let sbloccato = false
let initFatto = false
const buffers = new Map<NomeSuono, AudioBuffer>()

export function suoniAttivi(): boolean {
  if (typeof window === 'undefined') return false
  try { return localStorage.getItem(KEY) !== 'off' } catch { return true } // default ATTIVI (§9.2)
}
export function impostaSuoni(on: boolean): void {
  try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* privato/quota: ignora */ }
}

async function sblocca(): Promise<void> {
  if (sbloccato) return
  try {
    ctx = ctx ?? new AudioContext()
    if (ctx.state === 'suspended') await ctx.resume()
    sbloccato = true
    void precarica()
  } catch { /* dispositivo senza audio: resta muto */ }
}

async function precarica(): Promise<void> {
  if (!ctx) return
  await Promise.all((Object.keys(FILES) as NomeSuono[]).map(async nome => {
    try {
      const res = await fetch(FILES[nome])
      if (!res.ok) return
      const dati = await res.arrayBuffer()
      buffers.set(nome, await ctx!.decodeAudioData(dati))
    } catch { /* singolo file mancante: quel suono resta muto */ }
  }))
}

/** Registra l'unlock una tantum. Chiamare una volta nel root client dell'app v3. */
export function initSuoni(): void {
  if (typeof window === 'undefined' || initFatto) return
  initFatto = true
  const handler = () => { void sblocca() }
  document.addEventListener('touchend', handler, { once: true, passive: true })
  document.addEventListener('click', handler, { once: true, passive: true })
}

/** Fire-and-forget: mai throw, mai await necessario. Max 1 suono per gesto (§9.2). */
export function suona(nome: NomeSuono): void {
  try {
    if (!suoniAttivi() || !sbloccato || !ctx) return
    const buf = buffers.get(nome)
    if (!buf) return
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    src.start()
  } catch { /* mai rompere l'app per un suono */ }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/ds-v3/sound.test.ts`
Expected: PASS (4 test).

- [ ] **Step 5: Commit**

```bash
git add src/design-system/v3/sound.ts tests/unit/ds-v3/sound.test.ts
git commit -m "feat(ds-v3): player suoni Web Audio — unlock iOS su touchend, default attivi, mai-throw"
```

---

### Task 8: haptic.ts v3 — Android-only, iOS compensa con molla+suono

**Files:**
- Create: `src/design-system/v3/haptic.ts`
- Test: `tests/unit/ds-v3/haptic.test.ts`

**Interfaces:**
- Produces: `vibra(tipo: 'selection'|'light'|'medium'|'success'|'error'): void` · `hapticDisponibile(): boolean`. La UI chiama SEMPRE `vibra()` — su iOS è un no-op silenzioso (la fisicità la danno molla `press` + suono, spec §9.3).

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/ds-v3/haptic.test.ts
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => { vi.resetModules(); localStorage.clear() })

describe('haptic v3 (spec §9.3 — pattern di legge)', () => {
  it('pattern esatti su Android', async () => {
    const vibrate = vi.fn(() => true)
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    const { vibra } = await import('@/design-system/v3/haptic')
    vibra('selection'); expect(vibrate).toHaveBeenLastCalledWith(10)
    vibra('light');     expect(vibrate).toHaveBeenLastCalledWith(15)
    vibra('medium');    expect(vibrate).toHaveBeenLastCalledWith(30)
    vibra('success');   expect(vibrate).toHaveBeenLastCalledWith([15, 80, 25])
    vibra('error');     expect(vibrate).toHaveBeenLastCalledWith([40, 60, 40, 60, 40])
  })
  it('no-op sicuro dove vibrate non esiste (iOS Safari)', async () => {
    // @ts-expect-error rimozione forzata per simulare iOS
    delete (navigator as unknown as Record<string, unknown>).vibrate
    const { vibra, hapticDisponibile } = await import('@/design-system/v3/haptic')
    expect(hapticDisponibile()).toBe(false)
    expect(() => vibra('success')).not.toThrow()
  })
  it('rispetta lo spegnimento utente', async () => {
    const vibrate = vi.fn(() => true)
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    localStorage.setItem('ua_haptic_v3', 'off')
    const { vibra } = await import('@/design-system/v3/haptic')
    vibra('medium')
    expect(vibrate).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/ds-v3/haptic.test.ts`
Expected: FAIL — modulo mancante.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/design-system/v3/haptic.ts
// DS v3 §9.3 — vibrazione = progressive enhancement Android.
// iOS Safari NON supporta navigator.vibrate (verificato 2026): lì il tatto
// lo danno molla `press` + suono. La UI chiama sempre vibra(): qui è no-op sicuro.

const PATTERN = {
  selection: 10 as number | number[],
  light: 15 as number | number[],
  medium: 30 as number | number[],
  success: [15, 80, 25] as number | number[],
  error: [40, 60, 40, 60, 40] as number | number[],
} as const

export type TipoVibrazione = keyof typeof PATTERN
const KEY = 'ua_haptic_v3'

export function hapticDisponibile(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator
}
function attivo(): boolean {
  if (!hapticDisponibile()) return false
  try { return localStorage.getItem(KEY) !== 'off' } catch { return true }
}
/** Mai throw, mai raffiche: un pattern per gesto. */
export function vibra(tipo: TipoVibrazione): void {
  try { if (attivo()) navigator.vibrate(PATTERN[tipo]) } catch { /* no-op */ }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/ds-v3/haptic.test.ts`
Expected: PASS (3 test).

- [ ] **Step 5: Commit**

```bash
git add src/design-system/v3/haptic.ts tests/unit/ds-v3/haptic.test.ts
git commit -m "feat(ds-v3): haptic v3 — pattern di legge Android, no-op sicuro su iOS"
```

---

### Task 9: check-ds-compliance.sh — sezione v3

**Files:**
- Modify: `scripts/check-ds-compliance.sh` (aggiungi sezione DOPO il check 3, PRIMA del Report; aggiorna il messaggio finale)

**Interfaces:**
- Consumes: convenzioni dei Task 2-5 (cartelle `src/design-system/v3`, `src/components/ds`).
- Produces: pre-commit che blocca violazioni v3. I check v2.3 restano INVARIATI (coesistenza).

- [ ] **Step 1: Aggiungi i check v3 allo script**

Dopo il blocco "3. Shadow hardcoded" e prima di "── Report ──", inserisci:

```bash
# ── 4. DS v3: scope src/components/ds + src/design-system/v3 ────────────────
V3_SCOPE="src/components/ds src/design-system/v3"
V3_EXISTS=$(ls -d src/components/ds src/design-system/v3 2>/dev/null || true)

if [ -n "$V3_EXISTS" ]; then
  # 4a. Colori inline nei componenti v3 (tokens.ts è l'unica eccezione)
  V3_HEX=$(grep -rn "#[0-9A-Fa-f]\{6\}\b\|rgba\?(" $V3_SCOPE \
    --include="*.tsx" --include="*.ts" 2>/dev/null \
    | grep -v "v3/tokens\.ts\|node_modules\|\.test\." || true)
  if [ -n "$V3_HEX" ]; then
    echo ""
    echo "❌ DS v3: colore inline fuori da v3/tokens.ts (spec §3, §13.2)"
    echo "$V3_HEX"
    ERRORS=$((ERRORS + 1))
  fi

  # 4b. Durate/easing inline nei componenti v3 (motion.ts è l'unica eccezione)
  V3_MOTION=$(grep -rn "duration:\s*[0-9]\|ease:\s*\[" src/components/ds \
    --include="*.tsx" --include="*.ts" 2>/dev/null \
    | grep -v "node_modules\|\.test\." || true)
  if [ -n "$V3_MOTION" ]; then
    echo ""
    echo "❌ DS v3: durata/easing inline — usa le molle di v3/motion.ts (spec §8)"
    echo "$V3_MOTION"
    ERRORS=$((ERRORS + 1))
  fi

  # 4c. Font vietati nel perimetro v3
  V3_FONT=$(grep -rn "DM Sans\|Playfair\|Inter\|Roboto" $V3_SCOPE \
    --include="*.tsx" --include="*.ts" --include="*.css" 2>/dev/null \
    | grep -v "node_modules\|\.test\." || true)
  if [ -n "$V3_FONT" ]; then
    echo ""
    echo "❌ DS v3: font vietato nel perimetro v3 — solo Plus Jakarta Sans (spec §4.1)"
    echo "$V3_FONT"
    ERRORS=$((ERRORS + 1))
  fi

  # 4d. Parole del software nella UI v3 (dizionario §2.3 — jsx text)
  V3_PAROLE=$(grep -rniE ">(.*\b(dashboard|submit|record|loading)\b.*)<" src/components/ds \
    --include="*.tsx" 2>/dev/null | grep -v "node_modules\|\.test\." || true)
  if [ -n "$V3_PAROLE" ]; then
    echo ""
    echo "❌ DS v3: parola del software nella UI — usa il dizionario (v3/dizionario.ts)"
    echo "$V3_PAROLE"
    ERRORS=$((ERRORS + 1))
  fi
fi
```

E cambia le due righe finali del report in:

```bash
  echo "   Spec v2.3: docs/superpowers/specs/2026-05-27-design-system-v2-3.md"
  echo "   Spec v3:   docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md"
  exit 1
fi

echo "✅ DS compliance OK (v2.3 legacy + v3)"
```

- [ ] **Step 2: Verifica che lo script passi sul codice attuale**

Run: `bash scripts/check-ds-compliance.sh`
Expected: `✅ DS compliance OK (v2.3 legacy + v3)` (i file v3 creati nei task precedenti non violano nulla: gli hex vivono solo in `v3/tokens.ts`).

- [ ] **Step 3: Verifica che BLOCCHI una violazione (poi rimuovila)**

```bash
mkdir -p src/components/ds && echo "export const X = { color: '#FF0000' }" > src/components/ds/_probe.ts
bash scripts/check-ds-compliance.sh; echo "exit=$?"
rm src/components/ds/_probe.ts && rmdir src/components/ds 2>/dev/null || true
```
Expected: output `❌ DS v3: colore inline…` e `exit=1`; dopo la rimozione lo script torna verde.

- [ ] **Step 4: Commit**

```bash
git add scripts/check-ds-compliance.sh
git commit -m "chore(ds-v3): check-ds-compliance esteso — sezione v3 (colori/motion/font/parole)"
```

---

### Task 10: Verifica finale + memoria (BP-1)

**Files:**
- Modify: `memory/SESSION_ACTIVE.md`, `memory/MEMORY.md` (§0), `docs/roadmap/ROADMAP-UFFICIALE.md` (testa)

- [ ] **Step 1: Verifica completa**

```bash
npx tsc --noEmit && npx vitest run && npx next build 2>&1 | tail -3
```
Expected: 0 errori TS; tutti i test verdi (i ~670 esistenti + i ~25 nuovi ds-v3); build ok.

- [ ] **Step 2: Aggiorna la memoria (BP-1)**

- `MEMORY.md` §0: nuova voce "DS v3 sotto-progetto 1 (fondamenta) COMPLETATO" con elenco file creati, conteggio test, nota coesistenza `[data-ds="v3"]`, nota master audio provvisori.
- `ROADMAP-UFFICIALE.md`: aggiorna testa — redesign DS v3 in corso, sotto-progetto 1 completato, prossimo: sotto-progetto 2 (componenti core).
- `SESSION_ACTIVE.md`: sostituisci con stato corrente (max 200 token).

- [ ] **Step 3: Commit finale**

```bash
git add memory/ docs/roadmap/
git commit -m "docs(ds-v3): memoria e roadmap — sotto-progetto 1 fondamenta completato"
```

---

## Note per l'esecutore
- NESSUNA pagina esistente va toccata (eccetto le 4 righe di import in `layout.tsx` e 1 riga in `globals.css`, entrambe additive e inerti per v2.3).
- Se `npm install` o `next build` falliscono per rete/ambiente: STOP e segnala, non aggirare.
- I WAV sono binari generati: committarli (piccoli, <100KB totali) INSIEME allo script che li rigenera.
