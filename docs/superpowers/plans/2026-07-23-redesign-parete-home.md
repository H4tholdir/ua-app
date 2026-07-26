# Redesign parete/home — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Realizzare l'ondata «Redesign parete/home» dalla spec ratificata
`docs/superpowers/specs/2026-07-23-redesign-parete-home-design.md` (rev. 2, D1-D8 + 23 riserve panel).

**Architecture:** Prima le fondamenta non-visive (dati paziente/alias, riordino parametrizzato
sullo scroller, suoni, ricerca «filtra e risali», «Metti un lavoro»), poi i 2 gate mockup
(🛑 rete+gancetto+targa, 🛑 striscia), poi la parete visuale, poi la home (embed della parete
vera, linguetta, scala fluida, striscia). QA su device come gate di metà ondata dopo l'embed.

**Tech Stack:** Next.js 16 App Router · Supabase (service client) · Motion 12 (`motion/react`) ·
CSS in `src/app/ds-v3.css` (DS v3, token `src/design-system/v3/*`) · vitest + Testing Library.

## Global Constraints

- DS v3: componenti SOLO da `src/components/ds/`, wrapper `[data-ds="v3"]`; MAI colori/durate inline — token da `src/design-system/v3/{tokens,motion,sound,haptic}.ts`.
- Ogni `cqw` nel CSS vive SOLO in selettori che contengono `.ds-parete-shell` (guardia `tests/unit/ds-v3/parete-fluida.test.ts` — verrà RISCRITTA nel Task 12/14, mai «sistemata in silenzio»).
- Touch target ≥44px · `prefers-reduced-motion` rispettato ovunque · colore mai unica fonte di stato · 3 viewport (390/768/1280) × light+dark.
- Back = pagina precedente ovunque (`tornaIndietro`), mai `router.push('/dashboard')` come back.
- NESSUNA migration in quest'ondata (persistenze nuove → localStorage, pattern `ua_sounds_v3`). Se una migration diventasse necessaria: STOP, FASE 6b + conferma esplicita di Francesco.
- Commit format: `feat(cassette): …` / `feat(home): …` / `fix…` — vedi CLAUDE.md §5.
- Dopo OGNI task: `npx vitest run <file>` verde + `npx tsc --noEmit` a zero errori prima del commit (l'hook pre-commit esegue tsc sull'intero progetto).
- 🛑 = STOP: serve la ratifica esplicita di Francesco prima di proseguire.

## File Structure (mappa dell'ondata)

| File | Sorte |
|---|---|
| `src/lib/cassette/parco-shared.ts` | MODIFICA — alias paziente, `targheInCollisione` |
| `src/lib/cassette/parco.ts` | MODIFICA — select estesa `pazienti(codice_paziente, nome_cognome)` |
| `src/components/features/cassette/filtra-cassette.ts` | MODIFICA — pagliaio codice+alias |
| `src/components/features/cassette/riordino-core.ts` | MODIFICA — adapter `Scroller` puro |
| `src/components/features/cassette/useDragRiordino.ts` | MODIFICA — scroller parametrico + suoni/haptic |
| `src/design-system/v3/sound.ts` | MODIFICA — `stacco`/`riaggancio` + gain |
| `src/components/features/cassette/PareteClient.tsx` | MODIFICA — filtra-e-risali, contesto in-home, refresh gated |
| `src/components/features/cassette/CassettaSheet.tsx` | MODIFICA — azione «Metti un lavoro» |
| `src/app/api/cassette/lavori-liberi/route.ts` | NUOVO — GET lavori senza cassetta |
| `src/components/ds/Cassetta.tsx` | MODIFICA — gancetto SVG, targa nuova, stato `accesa`-only |
| `src/app/ds-v3.css` | MODIFICA — rete disegnata, colonne CQ, linguetta, morte peek |
| `src/components/features/home/StanzaParete.tsx` | MUORE (col suo test) |
| `src/components/features/home/StanzePager.tsx` | MODIFICA — embed parete vera, linguetta, mount differito |
| `src/components/features/home/HomeV3.tsx` | MODIFICA — scala fluida, pile centrate, linguetta solo-pile |
| `src/components/features/home/LinguettaCassette.tsx` | NUOVO |
| `src/lib/dashboard/striscia.ts` | MODIFICA — aggregazione, trial escalation, racconto, silenzio |
| `src/components/ds/StrisciaStato.tsx` | MODIFICA — forma dal mockup ratificato + caso silenzio |
| `tests/unit/ds-v3/parete-fluida.test.ts` | RISCRITTA (assert 4-5 abrogate, decision record) |
| `docs/design/mockups/2026-07-XX-*.html` | NUOVI — 2 gate mockup |

---

## FASE A — Fondamenta (nessun gate visivo)

### Task 1: Alias paziente nei dati della parete

**Files:**
- Modify: `src/lib/cassette/parco-shared.ts`
- Modify: `src/lib/cassette/parco.ts:68`
- Modify: `src/components/features/cassette/filtra-cassette.ts:47-51`
- Test: `tests/unit/cassette/parco-shared.test.ts` (esiste — aggiungere describe), `tests/unit/cassette/filtra-cassette.test.ts`

**Interfaces:**
- Produces: `CassettaParete['lavoro']` guadagna `pazienteAlias: string | null` (l'esistente `paziente` RESTA il codice — nessun rename, il pagliaio e i consumatori esistenti non si rompono). Nuova export `targheInCollisione(parete: CassettaParete[]): Set<string>` (id delle cassette occupate che condividono coppia dentista+paziente con un'altra).
- Consumes: trigger DB `sync_paziente_nome_cognome` produce `upper(cognome)||' '||upper(nome)` → per pazienti-wizard senza alias `nome_cognome` CONTIENE il codice con spazio finale (trappola panel ARCH R4).

- [ ] **Step 1: Test failing per la derivazione alias**

In `tests/unit/cassette/parco-shared.test.ts` aggiungere (usando i builder/fixture già presenti nel file — se il file costruisce i Raw a mano, replicare lo stile):

```ts
describe('alias paziente (spec redesign §2.3, riserva ARCH R4)', () => {
  const cassette = [{ id: 'c1', nome: 'C1', colore: 'rossa', posizione: 1, created_at: '2026-01-01' }]
  const vive = [{ cassetta_id: 'c1', lavoro_id: 'l1' }]
  const lavoroBase = {
    id: 'l1', numero_lavoro: '147', stato: 'in_lavorazione', deleted_at: null,
    descrizione: null, tipo_dispositivo: null,
    clienti: { studio_nome: 'Studio Esposito', nome: null, cognome: null },
  }

  it('alias presente: nome_cognome normalizzato (trim), diverso dal codice', () => {
    const { parete } = deriveParete(cassette, vive, [
      { ...lavoroBase, pazienti: { codice_paziente: 'PZ-0012', nome_cognome: 'ROSSI MARIO ' } },
    ])
    expect(parete[0].lavoro?.paziente).toBe('PZ-0012')
    expect(parete[0].lavoro?.pazienteAlias).toBe('ROSSI MARIO')
  })

  it('paziente-wizard senza alias: nome_cognome contiene il codice (con spazio finale del trigger) → alias null', () => {
    const { parete } = deriveParete(cassette, vive, [
      { ...lavoroBase, pazienti: { codice_paziente: 'PZ-0012', nome_cognome: 'PZ-0012 ' } },
    ])
    expect(parete[0].lavoro?.pazienteAlias).toBeNull()
  })

  it('confronto alias/codice case-insensitive (il trigger scrive UPPER)', () => {
    const { parete } = deriveParete(cassette, vive, [
      { ...lavoroBase, pazienti: { codice_paziente: 'pz-0012', nome_cognome: 'PZ-0012 ' } },
    ])
    expect(parete[0].lavoro?.pazienteAlias).toBeNull()
  })

  it('pazienti null → paziente "—", alias null', () => {
    const { parete } = deriveParete(cassette, vive, [{ ...lavoroBase, pazienti: null }])
    expect(parete[0].lavoro?.paziente).toBe('—')
    expect(parete[0].lavoro?.pazienteAlias).toBeNull()
  })
})

describe('targheInCollisione (spec §2.3, riserva UX 4)', () => {
  const c = (id: string, pos: number) => ({ id, nome: id.toUpperCase(), colore: 'rossa', posizione: pos, created_at: '2026-01-01' })
  const l = (id: string, dentista: string, cod: string, alias: string | null) => ({
    id, numero_lavoro: id, stato: 'in_lavorazione', deleted_at: null, descrizione: null,
    tipo_dispositivo: null, clienti: { studio_nome: dentista, nome: null, cognome: null },
    pazienti: { codice_paziente: cod, nome_cognome: alias ?? `${cod} ` },
  })

  it('due cassette stesso dentista+paziente → entrambe in collisione', () => {
    const { parete } = deriveParete(
      [c('c1', 1), c('c2', 2)],
      [{ cassetta_id: 'c1', lavoro_id: 'l1' }, { cassetta_id: 'c2', lavoro_id: 'l2' }],
      [l('l1', 'Studio Esposito', 'PZ-1', 'ROSSI MARIO'), l('l2', 'Studio Esposito', 'PZ-1', 'ROSSI MARIO')],
    )
    expect(targheInCollisione(parete)).toEqual(new Set(['c1', 'c2']))
  })

  it('dentisti diversi → nessuna collisione; le libere non contano mai', () => {
    const { parete } = deriveParete(
      [c('c1', 1), c('c2', 2), c('c3', 3)],
      [{ cassetta_id: 'c1', lavoro_id: 'l1' }, { cassetta_id: 'c2', lavoro_id: 'l2' }],
      [l('l1', 'Studio Esposito', 'PZ-1', 'ROSSI MARIO'), l('l2', 'Studio Bruno', 'PZ-1', 'ROSSI MARIO')],
    )
    expect(targheInCollisione(parete).size).toBe(0)
  })
})
```

- [ ] **Step 2: Run → FAIL** — `npx vitest run tests/unit/cassette/parco-shared.test.ts` → rosso (`pazienteAlias` undefined, `targheInCollisione` non esportata).

- [ ] **Step 3: Implementazione in `parco-shared.ts`**

```ts
// Nel tipo CassettaParete.lavoro aggiungere:
    pazienteAlias: string | null

// In RawLavoro:
  pazienti: { codice_paziente: string | null; nome_cognome: string | null } | null

// Helper (sopra deriveParete) — riserva ARCH R4: per i pazienti-wizard senza alias il
// trigger sync_paziente_nome_cognome scrive il CODICE in nome_cognome (upper + spazio
// finale): un rendering ingenuo «alias vince sul codice» mostrerebbe il codice
// travestito. Alias = nome_cognome trim-normalizzato, null se coincide col codice.
function derivaAlias(p: RawLavoro['pazienti']): string | null {
  const grezzo = p?.nome_cognome?.trim()
  if (!grezzo) return null
  const codice = p?.codice_paziente?.trim()
  if (codice && grezzo.toLowerCase() === codice.toLowerCase()) return null
  return grezzo
}

// Nel map di deriveParete, ramo occupata:
        lavoro: l
          ? {
              id: l.id,
              numero: l.numero_lavoro,
              dentista: l.clienti?.studio_nome ?? (`${l.clienti?.nome ?? ''} ${l.clienti?.cognome ?? ''}`.trim() || '—'),
              paziente: l.pazienti?.codice_paziente ?? '—',
              pazienteAlias: derivaAlias(l.pazienti),
              tipoDispositivo: l.tipo_dispositivo,
              descrizione: l.descrizione,
            }
          : null,

// In fondo al file — riserva UX 4: le cassette la cui coppia dentista+paziente non è
// unica sulla parete mostrano il disambiguatore (Task 10). Chiave sul PARLATO della
// targa (alias se c'è, altrimenti codice), normalizzata lowercase.
export function targheInCollisione(parete: CassettaParete[]): Set<string> {
  const perChiave = new Map<string, string[]>()
  for (const c of parete) {
    if (!c.lavoro) continue
    const paz = (c.lavoro.pazienteAlias ?? c.lavoro.paziente).toLowerCase()
    const chiave = `${c.lavoro.dentista.toLowerCase()}|${paz}`
    perChiave.set(chiave, [...(perChiave.get(chiave) ?? []), c.id])
  }
  const collisioni = new Set<string>()
  for (const ids of perChiave.values()) if (ids.length > 1) ids.forEach((id) => collisioni.add(id))
  return collisioni
}
```

In `parco.ts:68` la select diventa:

```ts
        .select('id, numero_lavoro, stato, deleted_at, descrizione, tipo_dispositivo, clienti(studio_nome, nome, cognome), pazienti(codice_paziente, nome_cognome)')
```

- [ ] **Step 4: Run → PASS** su `parco-shared.test.ts`. Poi sistemare i fixture esistenti che ora non compilano (`pazienti: { codice_paziente: … }` → aggiungere `nome_cognome: null`): `npx tsc --noEmit` a zero.

- [ ] **Step 5: Test failing per il pagliaio (codice+alias — riserva ARCH R5)**

In `tests/unit/cassette/filtra-cassette.test.ts`:

```ts
it('trova per alias paziente E per codice: l'alias si AGGIUNGE, non sostituisce', () => {
  const parete = [cassettaOccupata({ paziente: 'PZ-0012', pazienteAlias: 'Rossi Mario' })]
  expect(filtraCassette(parete, 'rossi').size).toBe(1)
  expect(filtraCassette(parete, 'pz-0012').size).toBe(1)
})
```

(Usare il builder del file; se costruisce i lavori inline, aggiungere `pazienteAlias` al literal.)

- [ ] **Step 6: Run → FAIL**, poi in `filtra-cassette.ts:49` il pagliaio occupata diventa:

```ts
        ? `${c.nome} n.${l.numero} ${l.dentista} ${l.paziente} ${l.pazienteAlias ?? ''} ${l.descrizione ?? ''} ${etichettaTipo} ${c.colore}`
```

- [ ] **Step 7: Run → PASS.** Suite mirata: `npx vitest run tests/unit/cassette` verde.

- [ ] **Step 8: Commit** — `feat(cassette): alias paziente nei dati parete + collisioni targa (spec redesign §2.3)`

---

### Task 2: Riordino parametrizzato sullo scroller (riserva ARCH R1 — bloccante per l'embed)

**Files:**
- Modify: `src/components/features/cassette/riordino-core.ts`
- Modify: `src/components/features/cassette/useDragRiordino.ts`
- Modify: `src/components/features/cassette/PareteClient.tsx` (pass-through prop)
- Test: `tests/unit/cassette/riordino-core.test.ts` (esiste — aggiungere describe)

**Interfaces:**
- Produces: tipo `Scroller = { pos(): number; max(): number; by(px: number): void; altezzaVista(): number; sogliaAlta(): number }` + factory pura `creaScroller(el: HTMLElement | null): Scroller` esportati da `riordino-core.ts`. `useDragRiordino` accetta opzione nuova `scrollerRef?: RefObject<HTMLElement | null>` (assente → window, comportamento IDENTICO a oggi). `PareteClient` accetta prop nuova `scrollerRef?: RefObject<HTMLElement | null>` e la passa all'hook.
- Consumes: `velocitaAutoScroll` esistente (invariata).

- [ ] **Step 1: Test failing per `creaScroller`**

```ts
describe('creaScroller (spec redesign §3.1, riserva ARCH R1)', () => {
  it('con elemento: pos/max/vista leggono scrollTop/scrollHeight/clientHeight, by muta scrollTop, sogliaAlta è il top del rect', () => {
    const el = {
      scrollTop: 100, scrollHeight: 1000, clientHeight: 400,
      getBoundingClientRect: () => ({ top: 80 }),
    } as unknown as HTMLElement
    const s = creaScroller(el)
    expect(s.pos()).toBe(100)
    expect(s.max()).toBe(600)          // scrollHeight - clientHeight
    expect(s.altezzaVista()).toBe(400)
    expect(s.sogliaAlta()).toBe(80)
    s.by(50)
    expect(s.pos()).toBe(150)
  })

  it('senza elemento (null): delega a window — pos=scrollY, vista=innerHeight, sogliaAlta=0', () => {
    // jsdom: window.scrollY/innerHeight esistono; scrollBy va stubbato
    const spy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
    const s = creaScroller(null)
    expect(s.sogliaAlta()).toBe(0)
    expect(s.altezzaVista()).toBe(window.innerHeight)
    s.by(10)
    expect(spy).toHaveBeenCalledWith(0, 10)
    spy.mockRestore()
  })
})
```

- [ ] **Step 2: Run → FAIL** (`creaScroller` non esiste).

- [ ] **Step 3: Implementazione in `riordino-core.ts`** (in fondo al file):

```ts
/** Adapter dello scroller (spec redesign §3.1, riserva ARCH R1): il riordino non assume
 *  più `window`. Su /cassette scrolla la pagina (el=null); nella stanza home scrolla il
 *  contenitore della stanza. `sogliaAlta` = y viewport dove inizia la vista scrollabile
 *  (0 per window, rect.top per un contenitore): la fascia di auto-scroll parte da lì. */
export type Scroller = {
  pos(): number
  max(): number
  by(px: number): void
  altezzaVista(): number
  sogliaAlta(): number
}

export function creaScroller(el: HTMLElement | null): Scroller {
  if (el) {
    return {
      pos: () => el.scrollTop,
      max: () => el.scrollHeight - el.clientHeight,
      by: (px) => { el.scrollTop += px },
      altezzaVista: () => el.clientHeight,
      sogliaAlta: () => el.getBoundingClientRect().top,
    }
  }
  return {
    pos: () => (typeof window !== 'undefined' ? window.scrollY || 0 : 0),
    max: () => (typeof document !== 'undefined' ? (document.documentElement.scrollHeight || 0) - (window.innerHeight || 0) : 0),
    by: (px) => window.scrollBy(0, px),
    altezzaVista: () => (typeof window !== 'undefined' ? window.innerHeight || 0 : 0),
    sogliaAlta: () => 0,
  }
}
```

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Cablare l'hook.** In `useDragRiordino.ts`:

```ts
// firma: aggiungere all'oggetto opts
  scrollerRef?: RefObject<HTMLElement | null>
// import: aggiungere creaScroller (e il tipo Scroller) da './riordino-core'

// In onSollevata, PRIMA di misuraGeometria: risolvere lo scroller del gesto
    const scroller = creaScroller(opts.scrollerRef?.current ?? null)
    scrollerRef.current = scroller           // ref di modulo: const scrollerRef = useRef<Scroller | null>(null)

// scrollLiftRef (riga 286) diventa:
    scrollLiftRef.current = scroller.pos()

// In frame() il blocco auto-scroll (righe 209-231) diventa:
    const scroller = scrollerRef.current
    if (geo && scroller) {
      const base = scroller.sogliaAlta()
      const h = scroller.altezzaVista()
      const fascia = Math.min(0.25 * h, FASCIA_BORDO_MAX)
      const y = puntoRef.current.y - base   // coordinate RELATIVE alla vista scrollabile
      let dir = 0
      let dist = fascia
      if (y < fascia) { dir = -1; dist = y }
      else if (h - y < fascia) { dir = 1; dist = h - y }
      if (dir !== 0 && fascia > 0) {
        if (!ingaggioBordoRef.current) ingaggioBordoRef.current = ts
        const v = velocitaAutoScroll(dt, dist, fascia, ts - ingaggioBordoRef.current)
        const aFine = (dir < 0 && scroller.pos() <= 0) || (dir > 0 && scroller.pos() >= scroller.max())
        if (!aFine && v > 0) scroller.by(dir * v)
      } else {
        ingaggioBordoRef.current = 0
      }
      // compensazione scroll (riga 238):
      const scrollDelta = scroller.pos() - scrollLiftRef.current
      …resto invariato…
    }
```

(Il `window.scrollY`/`document.documentElement.scrollHeight` NON devono più comparire nel corpo di `frame`; la guardia `typeof window` resta dentro `creaScroller`.)

- [ ] **Step 6: Pass-through in `PareteClient`.** Nella firma: `props: { parete: CassettaParete[]; scrollerRef?: RefObject<HTMLElement | null> }`; nell'invocazione di `useDragRiordino` aggiungere `scrollerRef: props.scrollerRef`.

- [ ] **Step 7: Verifica completa** — `npx vitest run tests/unit/cassette` verde, `npx tsc --noEmit` zero. Su `/cassette` NULLA cambia (scrollerRef assente → window): lo conferma la suite esistente del riordino.

- [ ] **Step 8: Commit** — `feat(cassette): riordino parametrizzato sullo scroller (pre-embed home, riserva ARCH R1)`

---

### Task 3: I due suoni + haptic (D5, §2.6) — con gate d'ascolto 🛑

**Files:**
- Modify: `src/design-system/v3/sound.ts`
- Modify: `src/components/features/cassette/useDragRiordino.ts`
- Create: `scripts/genera-suoni-cassetta.mjs` + `public/sounds/candidati/{coppiaA,coppiaB}-{stacco,riaggancio}.wav` + definitivi `public/sounds/{stacco,riaggancio}.wav`
- Modify: `docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md` (deroga §9.2)
- Test: `tests/unit/ds-v3/sound.test.ts` (se esiste; altrimenti crearlo con i soli test qui sotto)

**Interfaces:**
- Produces: `NomeSuono` esteso con `'stacco' | 'riaggancio'`; `suona(nome, opts?: { gain?: number })` (default 1 — retrocompatibile, gli altri chiamanti non cambiano).
- Consumes: `useDragRiordino` — punti di aggancio: `onSollevata` (riga `vibra('light')`), `concludi` rami drop/annullo.

- [ ] **Step 1: Test failing** (`tests/unit/ds-v3/sound.test.ts`):

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// sound.ts è collaudabile solo a runtime browser (AudioContext): qui la guardia è
// testuale, stesso pattern di parete-fluida.test.ts.
const src = readFileSync(join(process.cwd(), 'src/design-system/v3/sound.ts'), 'utf8')

describe('suoni cassetta (spec redesign §2.6, D5)', () => {
  it('stacco e riaggancio sono suoni firmati con file dedicato', () => {
    expect(src).toMatch(/stacco: '\/sounds\/stacco\.wav'/)
    expect(src).toMatch(/riaggancio: '\/sounds\/riaggancio\.wav'/)
  })
  it('suona accetta un gain opzionale (ri-aggancio attenuato su annullo)', () => {
    expect(src).toMatch(/opts\?: \{ gain\?: number \}/)
    expect(src).toMatch(/createGain/)
  })
})
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implementazione `sound.ts`:**

```ts
export type NomeSuono = 'tap' | 'fatta' | 'ua' | 'errore' | 'arrivo' | 'stacco' | 'riaggancio'
const FILES: Record<NomeSuono, string> = {
  tap: '/sounds/tap.wav', fatta: '/sounds/fatta.wav', ua: '/sounds/ua.wav',
  errore: '/sounds/errore.wav', arrivo: '/sounds/arrivo.wav',
  stacco: '/sounds/stacco.wav', riaggancio: '/sounds/riaggancio.wav',
}

/** Fire-and-forget: mai throw, mai await necessario. Max 1 suono per gesto (§9.2);
 *  DEROGA ratificata 23/07 (spec redesign §2.6): stacco+riaggancio sono due momenti
 *  dello STESSO gesto continuo di trascinamento — l'unica coppia ammessa.
 *  `gain` < 1 = variante attenuata (ri-aggancio dopo annullo). */
export function suona(nome: NomeSuono, opts?: { gain?: number }): void {
  try {
    if (!suoniAttivi() || !sbloccato || !ctx) return
    const buf = buffers.get(nome)
    if (!buf) return
    const src = ctx.createBufferSource()
    src.buffer = buf
    const g = ctx.createGain()
    g.gain.value = opts?.gain ?? 1
    src.connect(g)
    g.connect(ctx.destination)
    src.start()
  } catch { /* mai rompere l'app per un suono */ }
}
```

- [ ] **Step 4: Run → PASS** + `npx tsc --noEmit` zero.

- [ ] **Step 5: Generare le 2 coppie candidate.** `scripts/genera-suoni-cassetta.mjs` — sintesi OFFLINE in build (i file WAV committati sono asset; a runtime NESSUNA sintesi — riserva FE R6). WAV mono 16-bit 44.1kHz, <150ms:

```js
// Genera 2 coppie candidate di stacco/riaggancio (gate d'ascolto §6.4 della spec).
// Coppia A «metallo asciutto»: stacco = chirp discendente 2200→900Hz 60ms;
//   riaggancio = colpo 180Hz + partial 1400Hz, decadimento esponenziale 110ms.
// Coppia B «morbida»: stacco = noise burst filtrato 50ms; riaggancio = colpo 240Hz 90ms.
import { writeFileSync, mkdirSync } from 'node:fs'
const SR = 44100
function wav(samples) {
  const n = samples.length, buf = Buffer.alloc(44 + n * 2)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8)
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40)
  samples.forEach((s, i) => buf.writeInt16LE(Math.max(-1, Math.min(1, s)) * 32767, 44 + i * 2))
  return buf
}
const dur = (ms) => Math.floor(SR * ms / 1000)
const env = (i, n, k = 6) => Math.exp(-k * i / n)
const chirp = (ms, f0, f1) => Array.from({ length: dur(ms) }, (_, i) => {
  const t = i / SR, f = f0 + (f1 - f0) * (i / dur(ms))
  return Math.sin(2 * Math.PI * f * t) * env(i, dur(ms), 4) * 0.6
})
const colpo = (ms, f, partial) => Array.from({ length: dur(ms) }, (_, i) => {
  const t = i / SR
  return (Math.sin(2 * Math.PI * f * t) * 0.7 + (partial ? Math.sin(2 * Math.PI * partial * t) * 0.25 : 0)) * env(i, dur(ms), 7)
})
const noise = (ms) => Array.from({ length: dur(ms) }, (_, i) => (Math.random() * 2 - 1) * env(i, dur(ms), 8) * 0.4)
mkdirSync('public/sounds/candidati', { recursive: true })
writeFileSync('public/sounds/candidati/coppiaA-stacco.wav', wav(chirp(60, 2200, 900)))
writeFileSync('public/sounds/candidati/coppiaA-riaggancio.wav', wav(colpo(110, 180, 1400)))
writeFileSync('public/sounds/candidati/coppiaB-stacco.wav', wav(noise(50)))
writeFileSync('public/sounds/candidati/coppiaB-riaggancio.wav', wav(colpo(90, 240, null)))
console.log('4 candidati in public/sounds/candidati/')
```

Run: `node scripts/genera-suoni-cassetta.mjs`. Copiare provvisoriamente la coppia A come default: `cp public/sounds/candidati/coppiaA-stacco.wav public/sounds/stacco.wav` (idem riaggancio) — così l'app funziona già; la scelta finale li sovrascrive.

- [ ] **Step 6: Cablaggio nell'hook** (`useDragRiordino.ts`) — punti ESATTI (riserve UX 2+7, FE R6):

```ts
// import: import { suona } from '@/design-system/v3/sound'
// ref di gesto: const staccoSuonatoRef = useRef(false)

// In onSollevata, accanto a vibra('light') (riga ~315):
    vibra('light')
    suona('stacco')
    staccoSuonatoRef.current = true

// In concludi(annullato):
//  – ramo `!mosso && !annullato` (apre sheet): nessun suono (nessun lift percepito come spostamento).
//  – ramo `annullato` (pointercancel), PRIMA di atterra(0, 0):
        if (staccoSuonatoRef.current) suona('riaggancio', { gain: 0.4 })  // attenuato: «non è cambiato niente»
//  – ramo DROP, insieme a setAnnuncio(...rilasciata...):
        suona('riaggancio')
        vibra('medium')   // haptic di successo (riserva UX 7): il laboratorio è rumoroso
// In coda a ogni ramo: staccoSuonatoRef.current = false
```

(Verificare che `vibra` accetti `'medium'` in `v3/haptic.ts`; se i livelli sono altri, usare il livello di conferma esistente più vicino — MAI inventare livelli nuovi.)

- [ ] **Step 7: Deroga §9.2 nella spec DS v3** — in `docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md`, sezione §9.2, aggiungere la riga: «**Deroga (ratifica 23/07/2026, spec redesign §2.6):** il trascinamento cassetta suona DUE volte — stacco al lift, clack al drop (attenuato sull'annullo) — perché sono due momenti dello stesso gesto continuo. Unica coppia ammessa.»

- [ ] **Step 8: Verifica + commit** — suite verde, tsc zero. `feat(cassette): suoni stacco/ri-aggancio + haptic drop (D5, deroga §9.2)`

- [ ] **Step 9: 🛑 GATE D'ASCOLTO** — consegnare a Francesco i 4 file di `public/sounds/candidati/` (coppia A «metallo asciutto» vs coppia B «morbida»), fargli scegliere; copiare la coppia scelta su `public/sounds/{stacco,riaggancio}.wav`, commit `feat(cassette): coppia suoni ratificata`. NON proseguire al Task 4 senza scelta (i task successivi non dipendono dai file, ma il gate va chiuso in quest'ondata).

---

### Task 4: Ricerca «filtra e risali» (punto 6, §2.4)

**Files:**
- Modify: `src/components/features/cassette/PareteClient.tsx`
- Modify: `src/components/ds/Cassetta.tsx` (tipo `stato`: muore `'spenta'`)
- Test: `tests/unit/cassette/parete-client.test.tsx` (esiste — adattare), `tests/unit/ds-v3/cassetta.test.tsx` (se esiste)

**Interfaces:**
- Consumes: `filtraCassette(parete, query): Set<string>` (INVARIATA — restituisce gli id match).
- Produces: `Cassetta` prop `stato: 'normale' | 'accesa'` (il valore `'spenta'` viene RIMOSSO dal tipo e dal CSS — spec §2.4: muore, non resta zombie). `PareteClient` nuovo comportamento: con ricerca attiva le non-match si SMONTANO e le match risalgono in testa mantenendo l'ordine relativo.

- [ ] **Step 1: Test failing** (adattare `parete-client.test.tsx` — i test esistenti sulla ricerca «che accende» vanno RISCRITTI, non affiancati: il comportamento vecchio muore per ratifica 22/07):

```tsx
describe('ricerca «filtra e risali» (ratifica 22/07, spec redesign §2.4)', () => {
  it('con ricerca attiva le non pertinenti SPARISCONO e le trovate risalgono in ordine relativo', async () => {
    render(<PareteClient parete={[c1SenzaMatch, c2ConMatch, c3ConMatch]} />)
    await digita('esposito')            // helper esistente del file per l'input di ricerca
    vi.advanceTimersByTime(250)         // oltre il debounce di 180ms
    const nomi = screen.getAllByRole('button', { name: /cassetta/i }).map((b) => b.getAttribute('aria-label'))
    expect(nomi.join(' ')).not.toMatch(/C1/)
    expect(nomi.findIndex((n) => /C2/.test(n ?? ''))).toBeLessThan(nomi.findIndex((n) => /C3/.test(n ?? '')))
  })

  it('riga conteggio: «2 cassette trovate» / «1 cassetta trovata» / vuoto con invito', async () => {
    render(<PareteClient parete={[c1SenzaMatch, c2ConMatch, c3ConMatch]} />)
    await digita('esposito'); vi.advanceTimersByTime(250)
    expect(screen.getByRole('status')).toHaveTextContent('2 cassette trovate')
  })

  it('il valore che filtra è debounced (~180ms): a 100ms la parete è ancora intera', async () => {
    render(<PareteClient parete={[c1SenzaMatch, c2ConMatch]} />)
    await digita('esposito'); vi.advanceTimersByTime(100)
    expect(screen.getAllByRole('button', { name: /cassetta/i })).toHaveLength(2)
  })

  it('long-press durante la ricerca: hint «Svuota la ricerca…» al posto del fallimento silenzioso', async () => {
    render(<PareteClient parete={[c2ConMatch, c3ConMatch]} />)
    await digita('esposito'); vi.advanceTimersByTime(250)
    await longPress(primaCassetta())    // helper esistente del file per il gesto
    expect(screen.getByRole('status')).toHaveTextContent('Svuota la ricerca per spostare le cassette')
  })
})
```

(I nomi degli helper — `digita`, `longPress` — vanno letti dal file di test esistente e riusati; se mancano, crearli sul pattern degli altri test touch del file. Il test usa `vi.useFakeTimers()` in `beforeEach` come già fanno i test del long-press 300ms.)

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implementazione in `PareteClient.tsx`:**

```tsx
// Debounce del filtro (riserva FE R4): l'input resta controllato ISTANTANEO (query),
// il riordino/smontaggio segue a 180ms — un FLIP per keystroke su 30 celle è il punto
// esatto dove si peggiora WebKit.
const [queryFiltro, setQueryFiltro] = useState('')
useEffect(() => {
  const t = setTimeout(() => setQueryFiltro(query), 180)
  return () => clearTimeout(t)
}, [query])

const cercato = queryFiltro.trim()
const attiva = cercato.length > 0
const accesi = useMemo(() => filtraCassette(parete, queryFiltro), [parete, queryFiltro])

// «Filtra e risali» (ratifica 22/07): le match risalgono in testa nell'ordine relativo
// di parete, le altre NON si rendono. A riposo l'ordine è quello del muro.
const visibili = useMemo(
  () => (attiva ? parete.filter((c) => accesi.has(c.id)) : parete),
  [attiva, parete, accesi],
)

// Riga conteggio (§2.4):
const annuncio = !attiva
  ? ''
  : visibili.length === 0
    ? `Niente per “${cercato}” — prova con meno lettere`
    : visibili.length === 1
      ? '1 cassetta trovata'
      : `${visibili.length} cassette trovate`

// Hint del drag bloccato (riserva UX 1): stato locale + timeout di rientro.
const [hintDrag, setHintDrag] = useState(false)
function segnalaDragBloccato() {
  vibra('light')
  setHintDrag(true)
  setTimeout(() => setHintDrag(false), 2500)
}
// La riga `role="status"` mostra l'hint QUANDO c'è (vince sul conteggio, stessa riga):
  {hintDrag ? 'Svuota la ricerca per spostare le cassette' : annuncio}

// Nel render della griglia: mappare su `visibili` (non più su cassetteRender/parete con
// stato spenta). L'ordine di render durante il drag resta `ordineDrag` (invariato — il
// drag non convive con la ricerca). layout="position" (riserva FE R4):
  {(ordineDrag ?? visibili.map((c) => c.id))
    .map((id) => perId.get(id))
    .filter((c): c is CassettaParete => !!c)
    .map((c) => (
      <motion.div key={c.id} layout="position" transition={molla.smooth} className="ds-cella-riordino"
        animate={{ opacity: idTrascinato === c.id ? trascinamento.opacitaBuca : 1 }}>
        <Cassetta
          id={c.id} nome={c.nome} colore={c.colore} lavoro={c.lavoro}
          stato={attiva ? 'accesa' : 'normale'}
          onTap={...invariato...}
          onSollevata={dragAbilitato ? (evento) => sollevaDrag(c.id, evento) : undefined}
          // Riserva UX 1: durante la ricerca il long-press NON apre più lo sheet in
          // silenzio mentre l'utente voleva spostare — segnala il perché. A ricerca
          // spenta resta il comportamento di sempre.
          onLongPressSheet={attiva ? segnalaDragBloccato : () => setSheet({ tipo: 'cassetta', id: c.id })}
        />
      </motion.div>
    ))}
```

Niente `AnimatePresence`: lo smontaggio dei non-match è SECCO (riserva FE R4 — mai popLayout in griglia). Tutte le visibili sono `stato='accesa'`.

- [ ] **Step 4: Morte di `'spenta'`.** In `Cassetta.tsx`: tipo `stato: 'normale' | 'accesa'`; rimuovere il ramo di stile/classe `spenta` dal componente e la regola `.ds-cassetta.is-spenta` (o equivalente — cercarla con grep `spenta` in `ds-v3.css`) dal CSS. Grep finale: `grep -rn "spenta" src/ tests/` → zero risultati (fuori dai commenti storici).

- [ ] **Step 5: Run → PASS** su tutta `tests/unit/cassette` + eventuali test di `Cassetta` adattati. `npx tsc --noEmit` zero.

- [ ] **Step 6: Commit** — `feat(cassette): ricerca filtra-e-risali + hint drag bloccato (punto 6, spec §2.4)`

---

### Task 5: «Metti un lavoro» dalla cassetta libera (punto 13, §2.5)

**Files:**
- Create: `src/app/api/cassette/lavori-liberi/route.ts`
- Modify: `src/components/features/cassette/CassettaSheet.tsx`
- Test: `tests/unit/api/cassette-lavori-liberi.test.ts` (nuovo), `tests/unit/cassette/cassetta-sheet.test.tsx` (esiste — aggiungere describe)

**Interfaces:**
- Produces: `GET /api/cassette/lavori-liberi` → `200 { lavori: Array<{ id: string; numero: string; dentista: string; pazienteAlias: string | null; urgenza: number }> }` ordinati per urgenza decrescente (semantica pile). 401 se non autenticato.
- Consumes: `POST /api/lavori/[id]/cassetta` body `{ cassetta_id }` (ESISTENTE — riuso, nessuna RPC nuova); `getFreshLabContext`, `getServiceClient`, `isSameOrigin` (pattern di `src/app/api/cassette/route.ts` — copiarne la testa di route: stessi guard, stesso ordine).

- [ ] **Step 1: Test failing della route** (pattern dei test API esistenti in `tests/unit/api/` — stesso mock del service client usato da `cassette-riordino.test.ts` o affine; leggerlo e riusarne il builder):

```ts
describe('GET /api/cassette/lavori-liberi (spec redesign §2.5)', () => {
  it('ritorna i lavori vivi del lab SENZA riga viva in cassette_lavori, ordinati per urgenza', async () => {
    mockLab({ labId: 'lab1' })
    mockQuery('lavori', [lavoro('l1', { stato: 'in_lavorazione' }), lavoro('l2', { stato: 'accettato' })])
    mockQuery('cassette_lavori', [{ lavoro_id: 'l2' }])    // l2 ha già cassetta
    const res = await GET(reqGet())
    expect(res.status).toBe(200)
    const { lavori } = await res.json()
    expect(lavori.map((l: { id: string }) => l.id)).toEqual(['l1'])
  })
  it('401 senza contesto lab', async () => {
    mockLabAssente()
    expect((await GET(reqGet())).status).toBe(401)
  })
})
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implementazione route** — stessa testa delle route cassette esistenti (auth → `assertLabOperativo`), poi:

```ts
// Stati VIVI = non chiusi: il set CHIUSI di parco-shared è la stessa verità (riuso, non copia).
// Un lavoro «senza cassetta» = nessuna riga in cassette_lavori con liberato_at IS NULL.
const [{ data: vive, error: errVive }, { data: lavori, error: errLavori }] = await Promise.all([
  svc.from('cassette_lavori').select('lavoro_id').eq('laboratorio_id', labId).is('liberato_at', null),
  svc.from('lavori')
    .select('id, numero_lavoro, stato, data_consegna_prevista, clienti(studio_nome, nome, cognome), pazienti(codice_paziente, nome_cognome)')
    .eq('laboratorio_id', labId).is('deleted_at', null)
    .not('stato', 'in', '(consegnato,annullato)'),
])
if (errVive || errLavori) return NextResponse.json({ errore: 'lettura_fallita' }, { status: 500 })
const occupati = new Set((vive ?? []).map((v) => v.lavoro_id))
const liberi = (lavori ?? []).filter((l) => !occupati.has(l.id))
// urgenza = giorni alla consegna (mancante → in fondo): stessa semantica d'ordinamento
// delle pile (prima chi scade prima).
liberi.sort((a, b) => (a.data_consegna_prevista ?? '9999') < (b.data_consegna_prevista ?? '9999') ? -1 : 1)
return NextResponse.json({ lavori: liberi.map(/* proiezione del contratto sopra, alias via stessa
  logica derivaAlias — importarla da parco-shared, ora esportata */) })
```

(Esportare `derivaAlias` da `parco-shared.ts` — al Task 1 era privata: renderla `export` con questo task, con un test di import.)

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Test failing dello sheet** (in `cassetta-sheet.test.tsx`):

```tsx
it('cassetta LIBERA: azione primaria «Metti un lavoro» → lista dei liberi → POST assegnazione', async () => {
  fetchMock.mockRoute('/api/cassette/lavori-liberi', { lavori: [{ id: 'l9', numero: '151', dentista: 'Studio Bruno', pazienteAlias: null, urgenza: 1 }] })
  fetchMock.mockRoute('/api/lavori/l9/cassetta', { esito: 'ok' })
  render(<CassettaSheet cassetta={cassettaLibera} … aperto />)
  await user.click(screen.getByRole('button', { name: /metti un lavoro/i }))
  await user.click(await screen.findByRole('button', { name: /n\.151/i }))
  expect(fetchMock).toHaveBeenCalledWith('/api/lavori/l9/cassetta', expect.objectContaining({
    method: 'POST', body: JSON.stringify({ cassetta_id: cassettaLibera.id }),
  }))
})
it('nessun lavoro libero → «Tutti i lavori hanno già una cassetta»', async () => { /* mock lista vuota, assert testo */ })
```

- [ ] **Step 6: Implementazione in `CassettaSheet.tsx`** — nel ramo cassetta LIBERA, sopra le azioni esistenti (rinomina/colore/sposta/butta via): azione primaria «Metti un lavoro» che apre una sottovista interna dello sheet (stato locale `vista: 'azioni' | 'metti'`, pattern già usato dallo sheet per il colore custom): al passaggio a `'metti'` fetch di `/api/cassette/lavori-liberi`, lista di righe-bottone `n.{numero} · {dentista}` (+ alias se c'è) con ricerca locale (input che filtra client-side su numero/dentista/alias) mostrata SOLO se `lavori.length > 8`; tap → `POST /api/lavori/{id}/cassetta` con `{ cassetta_id }` → su 200 `onCambiata()` (chiude e rilegge, racconto già a carico della route). Stato vuoto: riga quieta «Tutti i lavori hanno già una cassetta». Errore fetch/POST → riga d'errore quieta nello sheet (pattern errori esistente del file), MAI chiusura silenziosa.

- [ ] **Step 7: Run → PASS** + tsc zero. QA rapida Playwright su /cassette (390px): sheet libera → azione → assegna → cassetta si accende.

- [ ] **Step 8: Commit** — `feat(cassette): «Metti un lavoro» dallo sheet della libera (punto 13)`

---

## FASE B — Gate visivi 🛑 (mockup PRIMA del codice UI — workflow §0B)

### Task 6: Mockup rete + gancetto + targa (gate §6.2 della spec) 🛑

**Files:**
- Create: `docs/design/mockups/2026-07-24-rete-gancetto-targa.html`
- Create: `docs/design/mockups/screenshots/2026-07-24-rete-gancetto-targa/*.png`

**Interfaces:**
- Consumes: token `luce`/`notte` da `v3/tokens.ts` (copiati VERBATIM nel mockup, mai inventati); anatomia attuale `.ds-cassetta` da `ds-v3.css` come base.
- Produces: valori ratificati (passo maglia, spessore/colore filo, geometria gancetto, layout targa a 3 informazioni, casing paziente, disambiguatore) che i Task 8-10 copiano VERBATIM.

- [ ] **Step 1:** Costruire il mockup con ≥2 varianti di rete (per es. «filo sottile con riflesso» vs «filo pieno più marcato»), ciascuna × light/dark, con dentro: gancetto (2 geometrie candidate), targa nuova coi CASI LIMITE OBBLIGATORI (spec §6.2): nome cassetta lungo (>6ch), dentista ≥24 char, paziente alias lungo vs codice, collisione dentista+paziente (2 cassette gemelle col disambiguatore), griglia a 390px 3 colonne, gap home 12px (budget verticale gancetto ~10-12px), gancetto DISALLINEATO dal filo (il caso reale), casing alias (MAIUSCOLO dal DB vs Title Case reso). Includere una misura del delta-altezza cassetta (targa 3 info vs oggi) annotata nel mockup — vincolo accoppiato col budget home 390×660 (riserva FE R7).
- [ ] **Step 2:** Screenshot Playwright (script pattern `scratchpad/shot-*.mjs` della sessione 23/07) → cartella screenshots; light+dark per variante.
- [ ] **Step 3: 🛑 STOP** — consegnare a Francesco (SendUserFile render + screenshot), attendere scelta variante per variante. Verbalizzare la decisione in `docs/design/decisions/2026-07-24-rete-gancetto-targa.md`. Commit mockup+decisione.

### Task 7: Mockup striscia (gate §6.3 della spec) 🛑

**Files:**
- Create: `docs/design/mockups/2026-07-24-striscia-home.html` + screenshots + decisione.

- [ ] **Step 1:** ≥2 forme (per es. «pill quieta» vs «card con voce») × light/dark, OGNI forma mostrata nei 4 stati della gerarchia §3.4: allarme singolo con CTA · allarme AGGREGATO («3 scadenze oggi — Vedi ›») · racconto quieto tappabile («UÀ ha liberato C12») · SILENZIO (saluto pulito senza striscia — mostrare la home senza, per far vedere il respiro). Più il trial ambra.
- [ ] **Step 2:** Screenshot → cartella. **Step 3: 🛑 STOP** — scelta di Francesco, decisione a verbale, commit.

---

## FASE C — Parete visuale (SOLO dopo la ratifica del Task 6)

> I valori numerici/colore qui sotto sono i DEFAULT proposti nel mockup; se la variante
> ratificata diverge, i valori ratificati VINCONO e si copiano verbatim dal mockup
> (stessa regola del Task 10 storico: «non migliorarla, non derivarla»).

### Task 8: La rete disegnata (§2.1)

**Files:**
- Modify: `src/app/ds-v3.css` (regole `.ds-parete`, righe ~480-492)
- Test: `tests/unit/ds-v3/parete-fluida.test.ts` (aggiungere UN assert; le guardie esistenti NON si toccano qui)

**Interfaces:**
- Produces: custom property `--passo-maglia` (definita fluida SOLO in regola `.ds-parete-shell`, fallback px nella regola base — vincolo guardia cqw); pattern maglia su `.ds-parete` (bersaglio corretto: il muro, MAI la shell — riserva FE R1).

- [ ] **Step 1: Test failing** — aggiungere al describe di `parete-fluida.test.ts`:

```ts
it('la maglia usa --passo-maglia: fallback px nella regola base, fluida SOLO nella shell (riserva FE R1)', () => {
  expect(norm).toMatch(/\[data-ds="v3"\] \.ds-parete \{[^}]*--passo-maglia: 24px;/)
  expect(norm).toMatch(/\[data-ds="v3"\] \.ds-parete-shell \.ds-parete \{[^}]*--passo-maglia: clamp\(20px, 3\.4cqw, 28px\);/)
})
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implementazione CSS.** La regola light di `.ds-parete` diventa (filo ≥2px, stop morbidi anti-moiré, coppia stripe chiara/scura = rilievo del tondino; repeating-gradient, MAI SVG salvo diversa ratifica del mockup):

```css
[data-ds="v3"] .ds-parete {
  --passo-maglia: 24px;
  position: relative; border-radius: 18px; padding: 22px 16px 18px;
  background:
    repeating-linear-gradient(0deg,
      transparent 0 calc(var(--passo-maglia) - 3px),
      rgba(255,255,255,.75) calc(var(--passo-maglia) - 3px) calc(var(--passo-maglia) - 1px),
      rgba(50,40,25,.16) calc(var(--passo-maglia) - 1px) var(--passo-maglia)),
    repeating-linear-gradient(90deg,
      transparent 0 calc(var(--passo-maglia) - 3px),
      rgba(255,255,255,.75) calc(var(--passo-maglia) - 3px) calc(var(--passo-maglia) - 1px),
      rgba(50,40,25,.16) calc(var(--passo-maglia) - 1px) var(--passo-maglia)),
    var(--bg-deep);
}
[data-theme="dark"] [data-ds="v3"] .ds-parete {
  /* dark = flat (legge v3): un solo layer di filo appena chiaro, NIENTE riga-riflesso */
  background:
    repeating-linear-gradient(0deg, transparent 0 calc(var(--passo-maglia) - 2px), rgba(255,255,255,.07) calc(var(--passo-maglia) - 2px) var(--passo-maglia)),
    repeating-linear-gradient(90deg, transparent 0 calc(var(--passo-maglia) - 2px), rgba(255,255,255,.07) calc(var(--passo-maglia) - 2px) var(--passo-maglia)),
    var(--bg-deep);
}
/* passo fluido: SOLO nel perimetro shell (guardia cqw), stessa meccanica del gap */
[data-ds="v3"] .ds-parete-shell .ds-parete { --passo-maglia: clamp(20px, 3.4cqw, 28px); }
```

⚠️ La regola base `.ds-parete` cambia contenuto: l'assert 4 della guardia (`parete-fluida.test.ts:46`) che pretende il match verbatim `position: relative; border-radius: 18px; padding: 22px 16px 18px;` DEVE continuare a passare — la riga `--passo-maglia: 24px;` va messa PRIMA di `position: relative`, così la regex esistente (che àncora da `{` con `\s*`) va AGGIORNATA nello stesso commit per includere la custom property: sostituire in quel test `\{\s*position: relative` con `\{ --passo-maglia: 24px; position: relative`. È un adeguamento del testo guardato, NON un'abrogazione (le abrogazioni vere stanno nei Task 12/14).

- [ ] **Step 4: Run → PASS** (tutta `tests/unit/ds-v3`). Ombra cassette: verificare a occhio (Playwright screenshot 390/768/1280 × 2 temi) che l'ombra `.ds-cassetta` «cada» credibilmente sulla maglia; se il mockup ratificato prescrive una taratura d'ombra, applicarla qui.

- [ ] **Step 5: Commit** — `feat(cassette): rete metallica disegnata su .ds-parete (D1/D6, mockup 2026-07-24)`

### Task 9: Il gancetto SVG + stato «staccato» sul ghost (§2.2)

**Files:**
- Modify: `src/components/ds/Cassetta.tsx`
- Modify: `src/app/ds-v3.css` (morte `::before` linguetta vecchia, righe ~331-339)
- Modify: `src/components/features/cassette/PareteClient.tsx` (prop `staccata` sul clone ghost)
- Test: `tests/unit/ds-v3/cassetta.test.tsx`

**Interfaces:**
- Produces: `Cassetta` prop nuova `staccata?: boolean` (default false; true SOLO sul clone dentro `.ds-ghost`). Il gancetto è SVG inline `aria-hidden` DENTRO il button (mai `<img>` — riattiverebbe il DnD nativo neutralizzato a `Cassetta.tsx:395`; mai solo pseudo-elemento — riserva FE R3).

- [ ] **Step 1: Test failing:**

```tsx
it('il gancetto è un SVG aria-hidden dentro il button (mai <img>)', () => {
  render(<Cassetta {...base} />)
  const btn = screen.getByRole('button')
  const svg = btn.querySelector('svg.ds-gancetto')
  expect(svg).toBeTruthy()
  expect(svg?.getAttribute('aria-hidden')).toBe('true')
  expect(btn.querySelector('img')).toBeNull()
})
it('staccata: la classe di stato va sul gancetto (la rotazione la fa il CSS)', () => {
  render(<Cassetta {...base} staccata />)
  expect(screen.getByRole('button').querySelector('svg.ds-gancetto')?.classList.contains('is-staccato')).toBe(true)
})
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implementazione.** In `Cassetta.tsx`, primo figlio del button (al posto visivo della linguetta `::before`, che si rimuove dal CSS):

```tsx
{/* D1 — asola + gancetto (mockup 2026-07-24, geometria ratificata). SVG inline come le
    miniature (Cassetta.tsx:38): nessun bersaglio draggable nativo. Il budget verticale è
    ~10px sopra il bordo (gap home 12px, riserva FE R3): il viewBox sborda via top negativo. */}
<svg className={`ds-gancetto${staccata ? ' is-staccato' : ''}`} aria-hidden="true" viewBox="0 0 26 14">
  {/* piastra asolata */}
  <rect x="3" y="4" width="20" height="10" rx="3" className="piastra" />
  <rect x="9" y="6" width="8" height="3" rx="1.5" className="asola" />
  {/* gancetto metallico che aggancia il filo */}
  <path d="M11 6 q2 -5 4 0" className="gancio" />
</svg>
```

CSS (in `ds-v3.css`, al posto delle righe `::before` rimosse — la piastra eredita il colore della faccia via `fill: currentColor`-like con classi):

```css
[data-ds="v3"] .ds-gancetto {
  position: absolute; top: -10px; left: 50%; transform: translateX(-50%);
  width: 26px; height: 14px; pointer-events: none;
}
[data-ds="v3"] .ds-gancetto .piastra { fill: rgba(0,0,0,.22); }
[data-ds="v3"] .ds-gancetto .asola   { fill: rgba(0,0,0,.45); }
[data-ds="v3"] .ds-gancetto .gancio  { fill: none; stroke: #C9C4BC; stroke-width: 2; stroke-linecap: round; }
[data-theme="dark"] [data-ds="v3"] .ds-gancetto .gancio { stroke: #6E675F; }
/* stato staccato (solo sul ghost): il gancio si alza — transizione CSS, tempi da cssEase
   (v3/motion.ts) se il mockup prescrive movimento; reduced-motion la azzera già globalmente */
[data-ds="v3"] .ds-gancetto.is-staccato .gancio { transform: translateY(-2px) rotate(-8deg); transform-origin: 11px 6px; }
```

In `PareteClient.tsx`, il clone dentro `.ds-ghost` riceve `staccata` (riserva FE R3 — lo stato si rende sul GHOST, l'originale resta la «buca»):

```tsx
<Cassetta id={cassettaGhost.id} … stato="normale" staccata onTap={() => {}} />
```

- [ ] **Step 4: Run → PASS**; verificare che i 5 assert di `parete-fluida.test.ts` restino verdi (nessun cqw nuovo) e che il test «VIETA il tracking» di Cassetta non sia toccato. Screenshot 390px light+dark.

- [ ] **Step 5: Commit** — `feat(ds): gancetto SVG sulla Cassetta + stato staccato sul ghost (D1)`

### Task 10: La targa nuova (§2.3, punto 12)

**Files:**
- Modify: `src/components/ds/Cassetta.tsx` (righe targa/cont/aria-label ~366-409)
- Modify: `src/app/ds-v3.css` (`.ds-cassetta-targa`, `.ds-cassetta-cont`, clamp anti-invasione)
- Modify: `src/components/features/cassette/PareteClient.tsx` (prop `inCollisione`)
- Test: `tests/unit/ds-v3/cassetta.test.tsx`

**Interfaces:**
- Consumes: `lavoro.pazienteAlias` (Task 1), `targheInCollisione` (Task 1).
- Produces: `Cassetta` prop nuova `inCollisione?: boolean`; contenuto occupata = targa nome + riga `{dentista}` + riga `{alias|codice}` (+ `n.{numero}` in piccolo SOLO se `inCollisione`); il numero lavoro NON compare altrimenti (D4).

- [ ] **Step 1: Test failing:**

```tsx
const lavoro = { id: 'l1', numero: '147', dentista: 'Studio Esposito', paziente: 'PZ-0012', pazienteAlias: 'Rossi Mario', tipoDispositivo: null, descrizione: null }

it('targa D4: dentista + paziente (alias vince sul codice), MAI il numero lavoro', () => {
  render(<Cassetta {...base} lavoro={lavoro} />)
  const btn = screen.getByRole('button')
  expect(btn.textContent).toContain('Studio Esposito')
  expect(btn.textContent).toContain('Rossi Mario')
  expect(btn.textContent).not.toContain('PZ-0012')
  expect(btn.textContent).not.toContain('147')
})
it('senza alias: si mostra il codice', () => {
  render(<Cassetta {...base} lavoro={{ ...lavoro, pazienteAlias: null }} />)
  expect(screen.getByRole('button').textContent).toContain('PZ-0012')
})
it('collisione: appare il disambiguatore n.{numero}', () => {
  render(<Cassetta {...base} lavoro={lavoro} inCollisione />)
  expect(screen.getByRole('button').textContent).toContain('n.147')
})
it('aria-label D4: dentista e paziente, senza numero (salvo collisione)', () => {
  render(<Cassetta {...base} nome="C12" lavoro={lavoro} />)
  expect(screen.getByRole('button', { name: 'Cassetta C12, occupata: Studio Esposito, paziente Rossi Mario' })).toBeTruthy()
})
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implementazione.** In `Cassetta.tsx` (layout esatto e casing dalla variante ratificata del mockup — qui il default):

```tsx
// riga contenuto (al posto di `n.{numero} · {dentista}` a riga 409):
const pazienteReso = lavoro.pazienteAlias ?? lavoro.paziente
<span className="ds-cassetta-cont">
  <span className="ds-cassetta-dent">{lavoro.dentista}</span>
  <span className="ds-cassetta-paz">{pazienteReso}{inCollisione ? <span className="ds-cassetta-num"> n.{lavoro.numero}</span> : null}</span>
</span>
// aria-label (riga ~366):
  ? `Cassetta ${nome}, occupata: ${lavoro.dentista}, paziente ${pazienteReso}${inCollisione ? `, lavoro n.${lavoro.numero}` : ''}`
```

CSS: `.ds-cassetta-cont` diventa contenitore a 2 righe con troncamento PER RIGA (ellissi orizzontale, mai line-clamp che mescola le due informazioni):

```css
[data-ds="v3"] .ds-cassetta-cont { display: flex; flex-direction: column; gap: 1px; /* resto invariato */ }
[data-ds="v3"] .ds-cassetta-dent,
[data-ds="v3"] .ds-cassetta-paz { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
[data-ds="v3"] .ds-cassetta-num { font-weight: 600; opacity: .8; }
```

⚠️ Vincolo accoppiato (riserva FE R7): la targa a 2 righe di contenuto alza lo stack ~+16px → aggiornare IN COPPIA `padding-top: 44px` / `min-height: 104px` di `.ds-cassetta` coi valori MISURATI nel mockup ratificato (il Task 6 li annota), e rimisurare i casi limite del Gate L2 22/07 (invasione cavità a 390px). L'assert 4 di `parete-fluida.test.ts` NON guarda queste righe (guarda `.ds-parete`): nessun conflitto.

- [ ] **Step 4:** In `PareteClient.tsx`: `const collisioni = useMemo(() => targheInCollisione(parete), [parete])` e prop `inCollisione={collisioni.has(c.id)}` (sia griglia sia ghost).

- [ ] **Step 5: Run → PASS** su tutta la suite cassette/ds-v3 + tsc zero. Screenshot casi limite (nomi lunghi, collisione) 390px × 2 temi.

- [ ] **Step 6: Commit** — `feat(ds): targa cassetta dentista+paziente con alias e disambiguatore (D4, punto 12)`

---

## FASE D — La home

### Task 11: Colonne della parete → container query (riserva ARCH R7)

**Files:**
- Modify: `src/app/ds-v3.css` (righe ~495-497 e override home ~673)
- Test: `tests/unit/ds-v3/parete-fluida.test.ts`

- [ ] **Step 1: Test failing:**

```ts
it('le colonne della griglia rispondono al CONTAINER, non al viewport (riserva ARCH R7)', () => {
  expect(norm).toMatch(/@container \(min-width: 680px\) \{ \[data-ds="v3"\] \.ds-parete-shell \.ds-parete-grid \{ grid-template-columns: repeat\(4, 1fr\); \} \}/)
  expect(norm).toMatch(/@container \(min-width: 1060px\) \{ \[data-ds="v3"\] \.ds-parete-shell \.ds-parete-grid \{ grid-template-columns: repeat\(6, 1fr\); \} \}/)
  // le vecchie media query viewport sulle colonne NON devono più esistere:
  expect(norm).not.toMatch(/@media \(min-width: 768px\)\s*\{ \[data-ds="v3"\] \.ds-parete-grid/)
})
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implementazione.** Sostituire le due media query delle colonne (`ds-v3.css` ~495-497) con container query sulla shell (che è già `container-type: inline-size`). Soglie = content-box shell ai breakpoint attuali (shell 720 → content 680; shell 1120 → content 1060 — 40px di padding orizzontale, già misurato al punto 1 «gap cassette»):

```css
@container (min-width: 680px)  { [data-ds="v3"] .ds-parete-shell .ds-parete-grid { grid-template-columns: repeat(4, 1fr); } }
@container (min-width: 1060px) { [data-ds="v3"] .ds-parete-shell .ds-parete-grid { grid-template-columns: repeat(6, 1fr); } }
```

La regola base resta `repeat(3, 1fr)` (la guardia verbatim continua a passare). L'override home `.ua-stanza-parete .ds-parete-grid { grid-template-columns: repeat(3, 1fr); }` (~673) a questo punto è ridondante (la stanza è ≤480px → il container non supera mai 680) ma NON si rimuove qui: muore col Task 12 insieme a `StanzaParete`.

- [ ] **Step 4: Run → PASS** (tutta `tests/unit/ds-v3`) + verifica Playwright su `/cassette` (768→4 colonne, 1280→6, INVARIATO all'occhio).

- [ ] **Step 5: Commit** — `feat(cassette): colonne parete in container query (pre-embed, riserva ARCH R7)`

### Task 12: L'embed della parete vera nella home (D2, §3.1) — il cuore dell'ondata

**Files:**
- Modify: `src/components/features/cassette/PareteClient.tsx` (prop `contesto`)
- Modify: `src/components/features/home/StanzePager.tsx` + `HomeV3.tsx`
- Delete: `src/components/features/home/StanzaParete.tsx` + `tests/unit/stanza-parete.test.tsx`
- Modify: `src/app/ds-v3.css` (stanza parete scrollabile; morte cap celle)
- Create: `docs/design/decisions/2026-07-25-abrogazione-guardie-stanza-parete.md`
- Test: `tests/unit/home/stanze-pager.test.tsx` (esiste — estendere), `tests/unit/ds-v3/parete-fluida.test.ts` (assert 5 ABROGATA)

**Interfaces:**
- Consumes: `PareteClient` con `scrollerRef` (Task 2); `vistaHome`/`serveParete` esistenti (INVARIATI — i dati arrivano già da `dashboard/page.tsx`).
- Produces: `PareteClient` prop nuova `contesto?: 'pagina' | 'stanza'` (default `'pagina'`, comportamento identico a oggi). In `'stanza'`: niente header di pagina (né back né ☰ — la stanza vive nella home), refresh su focus/visibility SOSPESO quando `attivo === false` (prop `attivo?: boolean`), scroll interno del contenitore.

- [ ] **Step 1: Test failing del contesto** (in `parete-client.test.tsx`):

```tsx
describe('contesto stanza (spec §3.1)', () => {
  it('in stanza: nessun header di pagina (niente «Indietro», niente «Tutto il resto»)', () => {
    render(<PareteClient parete={[c1]} contesto="stanza" attivo />)
    expect(screen.queryByRole('button', { name: 'Indietro' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Tutto il resto' })).toBeNull()
  })
  it('refresh gated (riserva ARCH R2): con attivo=false il focus NON chiama router.refresh', () => {
    const { refreshSpy } = mockRouter()
    render(<PareteClient parete={[c1]} contesto="stanza" attivo={false} />)
    fireEvent(window, new Event('focus'))
    expect(refreshSpy).not.toHaveBeenCalled()
  })
  it('con attivo=true il focus rilegge (comportamento di /cassette conservato)', () => {
    const { refreshSpy } = mockRouter()
    render(<PareteClient parete={[c1]} contesto="stanza" attivo />)
    fireEvent(window, new Event('focus'))
    expect(refreshSpy).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implementazione `PareteClient`:**

```tsx
// firma:
export function PareteClient(props: {
  parete: CassettaParete[]
  contesto?: 'pagina' | 'stanza'
  attivo?: boolean                       // solo per contesto='stanza'; default true
  scrollerRef?: RefObject<HTMLElement | null>
}) {
  const { parete, contesto = 'pagina', attivo = true } = props
// refresh gated (riserva ARCH R2): mai rifare l'intera dashboard mentre l'utente sta
// sulle pile. `attivoRef` per non ri-registrare i listener a ogni swipe.
  const attivoRef = useRef(attivo)
  useEffect(() => { attivoRef.current = attivo })
  useEffect(() => {
    const rileggi = () => {
      if (document.visibilityState === 'visible' && attivoRef.current) router.refresh()
    }
    …listener invariati…
  }, [router])
// header: renderizzato SOLO in contesto 'pagina'
  {contesto === 'pagina' && (<header …invariato…</header>)}
```

- [ ] **Step 4: Embed nel pager.** In `HomeV3.tsx`: la stanza parete diventa (al posto di `<StanzaParete parete={parete} />`):

```tsx
// Il contenitore scrollabile della stanza È lo scroller del riordino (Task 2).
// Mount DIFFERITO (riserva ARCH R3): finché l'utente non si avvicina alla stanza, il
// contenuto pieno non si monta — col peek morto (Task 13) la stanza è del tutto fuori
// schermo. Il pre-mount parte in idle DOPO il primo paint (requisito UX: il primo swipe
// non deve stutterare — mai mount sincrono a metà gesto).
const stanzaParete = (
  <StanzaParete2 parete={parete} attiva={/* dal pager, vedi sotto */} />
)
```

`StanzaParete2` è un componente locale di `StanzePager.tsx` (non un file nuovo: vive dove vive il pager che gli dà `attiva`):

```tsx
function StanzaParete(props: { parete: CassettaParete[]; attiva: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  // mount differito: si monta al primo idle o al primo avvicinamento (attiva), poi RESTA
  const [montata, setMontata] = useState(false)
  useEffect(() => {
    if (montata) return
    if (props.attiva) { setMontata(true); return }
    const idle = 'requestIdleCallback' in window
      ? window.requestIdleCallback(() => setMontata(true))
      : window.setTimeout(() => setMontata(true), 300)
    return () => { 'cancelIdleCallback' in window ? window.cancelIdleCallback(idle as number) : clearTimeout(idle as number) }
  }, [props.attiva, montata])
  return (
    <div ref={scrollRef} className="ua-stanza-parete-scroll">
      {montata ? <PareteClient parete={props.parete} contesto="stanza" attivo={props.attiva} scrollerRef={scrollRef} /> : null}
    </div>
  )
}
```

In `StanzePager.tsx` la prop `parete: ReactNode` diventa `parete: CassettaParete[]` e il pannello stanza-parete monta `StanzaParete` locale passando `attiva={stanzaAttiva === 'parete'}` (lo stato `attiva` il pager lo possiede già per `inert`). `HomeV3` smette di comporre il nodo e passa l'array. La forma «solo parete» di `HomeV3` monta direttamente `<PareteClient parete={parete} contesto="stanza" attivo />` dentro un div `.ua-stanza-parete-scroll` (niente pager). Il vecchio `StanzaParete.tsx` (anteprima cap-8) SI CANCELLA col suo test.

- [ ] **Step 5: CSS della stanza scrollabile.** La legge «no-scroll verticale in entrambe le stanze» DECADE per la stanza parete piena (dichiarato in spec §3.1). In `ds-v3.css`:

```css
/* La stanza parete piena scorre DENTRO il proprio contenitore (spec §3.1): overscroll
   contain per non far rimbalzare la home, pan-y per lasciare al pager lo swipe orizzontale. */
[data-ds="v3"] .ua-stanza-parete-scroll {
  flex: 1; min-height: 0; overflow-y: auto;
  overscroll-behavior-y: contain;
  touch-action: pan-y pan-x;
}
```

Rimuovere: le regole `.ua-stanza-parete`/`.ua-stanza-parete-corpo`/`.ds-cella-parete-home`/`.ua-parete-titolo` e il cap `@media` (righe ~664-690 — morte con l'anteprima). ⚠️ Con queste rimozioni l'assert 5 di `parete-fluida.test.ts` («la home resta FUORI dal perimetro: nessuna regola fluida tocca .ua-stanza-parete») perde il suo oggetto (`regole.length` diventa 0 → il test FALLISCE by design): ABROGARLA sostituendola con la guardia nuova:

```ts
it('la stanza parete della home è il contenitore di scroll del riordino (decisione 2026-07-25)', () => {
  expect(norm).toMatch(/\.ua-stanza-parete-scroll \{[^}]*overflow-y: auto;[^}]*overscroll-behavior-y: contain;/)
})
```

e incidere `docs/design/decisions/2026-07-25-abrogazione-guardie-stanza-parete.md`: perché l'assert 5 muore (la stanza-parete anteprima non esiste più; la parete in-home è ORA nel perimetro fluido della shell by design), con rimando a spec §5.4 e riserve ARCH R6/FE R2.

- [ ] **Step 6:** Estendere `stanze-pager.test.tsx`: la stanza parete monta il contenuto dopo idle (fake timers → `montata`), `inert` resta sul pannello non attivo (test esistente), il deep-link `?stanza=parete` monta subito (`attiva=true` iniziale).

- [ ] **Step 7: Run → PASS** su home+cassette+ds-v3; `npx tsc --noEmit` zero; `npx next build` OK (il build è il primo posto dove un import circolare HomeV3↔StanzePager esploderebbe).

- [ ] **Step 8: Commit** — `feat(home): la stanza parete È la parete vera (D2) — StanzaParete anteprima rimossa`

### Task 13: La linguetta «Le cassette» + morte del peek (D7, §3.2)

**Files:**
- Create: `src/components/features/home/LinguettaCassette.tsx`
- Modify: `src/components/features/home/StanzePager.tsx`, `HomeV3.tsx`
- Modify: `src/app/ds-v3.css` (morte peek 28px; stile linguetta dal mockup C2 ratificato)
- Test: `tests/unit/home/linguetta-cassette.test.tsx` (nuovo)

**Interfaces:**
- Produces: `LinguettaCassette` props `{ onVai: () => void; visibile: boolean }` — stato interno (timer 5s, apprendimento) TUTTO dentro (mai in HomeV3 — riserva ARCH R8). Export helper puri testabili: `linguettaAppresa(): boolean`, `registraAccessoParete(): void` (localStorage `ua_linguetta_v3`, conteggio; ≥3 → appresa — riserva UX 3b; pattern `ua_sounds_v3`, per-device, NESSUNA migration).
- Consumes: `vaiA('parete')` del pager (già esistente, privato → si passa come callback `onVai`).

- [ ] **Step 1: Test failing:**

```tsx
describe('LinguettaCassette (D7, mockup C2 ratificato)', () => {
  beforeEach(() => { localStorage.clear(); vi.useFakeTimers() })

  it('appare al mount, si ritira dopo ~5s (aria-hidden e fuori dall albero)', () => {
    render(<LinguettaCassette onVai={() => {}} visibile />)
    expect(screen.getByRole('button', { name: /le cassette/i })).toBeTruthy()
    act(() => vi.advanceTimersByTime(5600))   // 5000 + uscita
    expect(screen.queryByRole('button', { name: /le cassette/i })).toBeNull()
  })

  it('hit-area ≥44px anche se il disegno è ~26px (riserva UX 3a): il button porta la classe con l estensione', () => {
    render(<LinguettaCassette onVai={() => {}} visibile />)
    expect(screen.getByRole('button', { name: /le cassette/i }).className).toContain('ds-linguetta')
  })

  it('apprendimento (riserva UX 3b): dopo 3 accessi registrati non compare più', () => {
    registraAccessoParete(); registraAccessoParete(); registraAccessoParete()
    render(<LinguettaCassette onVai={() => {}} visibile />)
    expect(screen.queryByRole('button', { name: /le cassette/i })).toBeNull()
  })

  it('il tap chiama onVai e registra l accesso', () => {
    const onVai = vi.fn()
    render(<LinguettaCassette onVai={onVai} visibile />)
    fireEvent.click(screen.getByRole('button', { name: /le cassette/i }))
    expect(onVai).toHaveBeenCalled()
    expect(JSON.parse(localStorage.getItem('ua_linguetta_v3') ?? '0')).toBe(1)
  })

  it('visibile=false (stanza parete attiva): mai renderizzata', () => {
    render(<LinguettaCassette onVai={() => {}} visibile={false} />)
    expect(screen.queryByRole('button', { name: /le cassette/i })).toBeNull()
  })
})
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implementazione `LinguettaCassette.tsx`:**

```tsx
'use client'
// D7 (mockup 2026-07-23-invito-swipe-linguetta-rifinita.html, variante C2 ratificata):
// linguetta verticale basso-destra, ~26px visivi + hit-area 44px, appare al mount della
// home, resta ~5s, si ritira (molla; reduced-motion → dissolvenza). Si SPEGNE per sempre
// dopo 3 accessi riusciti alla parete (riserva UX 3b) — persistenza per-device in
// localStorage (nessuna migration, pattern ua_sounds_v3). Mai focus-steal; da ritirata
// esce dall'albero (unmount, non visibility). Montata in PORTALE su body (riserva FE R5:
// il wrapper container-type:size della home ne farebbe il containing block e la clipperebbe).
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { molla } from '@/design-system/v3/motion'

const KEY = 'ua_linguetta_v3'
const ACCESSI_APPRESA = 3
const MS_IN_VISTA = 5000

export function linguettaAppresa(): boolean {
  try { return Number(localStorage.getItem(KEY) ?? '0') >= ACCESSI_APPRESA } catch { return false }
}
export function registraAccessoParete(): void {
  try {
    const n = Number(localStorage.getItem(KEY) ?? '0')
    if (n < ACCESSI_APPRESA) localStorage.setItem(KEY, String(n + 1))
  } catch { /* privato/quota: la linguetta continuerà a comparire — innocuo */ }
}

export function LinguettaCassette(props: { onVai: () => void; visibile: boolean }) {
  const [inVista, setInVista] = useState(false)
  const reduced = useReducedMotion()
  useEffect(() => {
    if (!props.visibile || linguettaAppresa()) return
    setInVista(true)
    const t = setTimeout(() => setInVista(false), MS_IN_VISTA)
    return () => clearTimeout(t)
  }, [props.visibile])
  if (typeof document === 'undefined') return null
  return createPortal(
    <div data-ds="v3" style={{ display: 'contents' }}>
      <AnimatePresence>
        {props.visibile && inVista && (
          <motion.button
            type="button"
            className="ds-linguetta"
            initial={reduced ? { opacity: 0 } : { x: '110%' }}
            animate={reduced ? { opacity: 1 } : { x: 0 }}
            exit={reduced ? { opacity: 0 } : { x: '110%' }}
            transition={molla.smooth}
            onClick={() => { registraAccessoParete(); setInVista(false); props.onVai() }}
          >
            <span className="fre" aria-hidden="true">‹</span>
            <span className="mini-rete" aria-hidden="true" />
            <span className="eti">Le cassette</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  )
}
```

CSS (valori dal mockup C2, verbatim; hit-area col padding trasparente):

```css
/* D7 — linguetta C2 (mockup 2026-07-23). Il button è LARGO 44px (hit-area di legge);
   il disegno (card 26px) è il suo bordo destro — il resto è tocco invisibile. */
[data-ds="v3"] .ds-linguetta {
  position: fixed; right: 0; bottom: 84px; z-index: 40;
  width: 44px; min-height: 96px;
  display: flex; flex-direction: column; align-items: flex-end; justify-content: center;
  background: none; border: none; padding: 0; cursor: pointer;
}
[data-ds="v3"] .ds-linguetta::before {
  content: ''; position: absolute; right: 0; top: 0; bottom: 0; width: 26px;
  background: var(--card); border: 1px solid var(--line); border-right: none;
  border-radius: 14px 0 0 14px; box-shadow: -6px 5px 14px -8px rgba(50,40,25,.3);
}
[data-theme="dark"] [data-ds="v3"] .ds-linguetta::before { box-shadow: -6px 5px 14px -8px rgba(0,0,0,.55); }
[data-ds="v3"] .ds-linguetta .fre { position: relative; font-size: 13px; font-weight: 800; color: var(--red); width: 26px; text-align: center; }
[data-ds="v3"] .ds-linguetta .mini-rete {
  position: relative; width: 13px; height: 18px; margin: 6px 6.5px; border-radius: 2px; opacity: .45;
  background:
    repeating-linear-gradient(0deg, var(--faint) 0 1px, transparent 1px 5px),
    repeating-linear-gradient(90deg, var(--faint) 0 1px, transparent 1px 5px);
}
[data-ds="v3"] .ds-linguetta .eti {
  position: relative; writing-mode: vertical-rl; width: 26px; text-align: center;
  font-size: 10px; font-weight: 700; letter-spacing: .13em; color: var(--muted); text-transform: uppercase;
}
```

- [ ] **Step 4: Morte del peek.** In `ds-v3.css`: `.ua-stanza { flex: 0 0 100%; … }` (era `calc(100% - 28px)`); la regola `:last-child { scroll-snap-align: end }` resta innocua ma si rimuove (senza peek start==end). I ProgressDots restano. In `StanzePager.tsx`: chi arriva alla stanza parete (IO o dot) chiama `registraAccessoParete()` — punto esatto: nel setter della stanza attiva, quando `stanza === 'parete'` e la precedente era `pile`. Montare `<LinguettaCassette visibile={stanzaAttiva === 'pile'} onVai={() => vaiA('parete')} />` nel pager; in `HomeV3` forma «solo pile»: `<LinguettaCassette visibile onVai={() => router.push('/cassette')} />`.

- [ ] **Step 5: Run → PASS** (nuovo test + stanze-pager) + tsc zero.

- [ ] **Step 6: Commit** — `feat(home): linguetta «Le cassette» C2 + morte del peek 28px (D7)`

### Task 14: Scala verticale fluida + pile centrate (D8, §3.3)

**Files:**
- Modify: `src/components/features/home/HomeV3.tsx` (blocco `<style>` righe ~128-156)
- Test: `tests/unit/home/home-fluida.test.tsx` (nuovo — guardia testuale sul blocco style, pattern parete-fluida)

- [ ] **Step 1: Test failing** (guardia della NUOVA legge — sostituisce la protezione «home fuori perimetro» abrogata):

```ts
// La home v3 è FLUIDA (spec §3.3, decisione 2026-07-25): wrapper container-type:size,
// blocchi in clamp con floor px non negoziabili, degrado scroll P3 conservato.
const srcHome = readFileSync(join(process.cwd(), 'src/components/features/home/HomeV3.tsx'), 'utf8')
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
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implementazione.** Il blocco `<style>` di `HomeV3` diventa (numeri = default; taratura finale in QA con misure Playwright computate, come il punto 1 «gap cassette» — coefficienti da ritoccare coi dati, MAI a occhio):

```css
.ua-home { position: relative; z-index: 1; width: 100%; max-width: 480px; margin: 0 auto;
           padding: clamp(12px, 2.6cqh, 24px) 24px; display: flex; flex-direction: column; min-height: 100dvh; }
/* wrapper fluido: la flex gli dà altezza definita → cqh risolve. ATTENZIONE (riserva FE R5):
   niente position:fixed DISCENDENTE — la linguetta è in portale su body apposta. */
.ua-home .corpo { flex: 1; min-height: 0; display: flex; flex-direction: column; container-type: size; }
/* pile centrate (D8): il blocco assorbe lo slack e si centra nello spazio residuo */
.ua-home .pile { flex: 1; display: flex; flex-direction: column; justify-content: center;
                 gap: clamp(8px, 2.2cqh, 16px); margin-top: clamp(8px, 1.8cqh, 16px); }
.ua-home .pile .ds-pila { padding: clamp(11px, 1.9cqh, 16px) 18px; }
.ua-home .pile .ds-pila-num { font-size: clamp(38px, 6.5cqh, 52px); }
.ua-home .striscia-slot { margin-top: clamp(8px, 1.8cqh, 16px); }
.ua-home .foot { margin-top: clamp(8px, 1.8cqh, 16px); display: flex; flex-direction: column; align-items: center;
                 gap: 8px; padding-bottom: env(safe-area-inset-bottom); }
/* P3: il degrado a scroll RESTA — la fluida riduce i casi, non abroga la rete di sicurezza */
@media (max-width: 767px) { .ua-home { min-height: 100dvh; height: auto; overflow-y: auto; } }
```

Nel JSX: avvolgere `stanzaPile`/pager in `<div className="corpo">…</div>` (il `foot` resta FUORI dal corpo — è fisso in fondo, e contiene il TastoPiù che non deve rimpicciolire: floor sul font del saluto = scala chiusa `tipografia`, il saluto NON entra nei clamp). Rimuovere l'intero blocco `@media (max-height: 780px)`.

- [ ] **Step 4: Run → PASS**; QA Playwright: home intera senza scroll a 390×660, 390×755, 390×844, 768×1024 — misure computate (`getBoundingClientRect` di `.foot` dentro il viewport) annotate nel commit; light+dark.

- [ ] **Step 5: Commit** — `feat(home): scala verticale fluida + pile centrate (D8, input R3b)`

### Task 15: 🛑 QA DEVICE DI METÀ ONDATA (riserva FE R8)

Dopo i Task 12-14, PRIMA della striscia: deploy su branch di anteprima (worktree → `npx next build` + server locale con harness Playwright `webServer.cwd` sul worktree — pattern 23/07) e prova di Francesco su Android (Xiaomi 17):
- [ ] Swipe pile↔parete con la parete piena (nessun cambio stanza durante il drag cassetta)
- [ ] Drag con scroll annidato: auto-scroll ai bordi della STANZA, drop sull'indice giusto
- [ ] Tastiera della ricerca in-home aperta: nessun cambio stanza accidentale
- [ ] Linguetta: appare/si ritira/si spegne dopo 3 accessi; suoni stacco/clack
- [ ] 🛑 STOP: esito a verbale (decisione o fix-list) prima di proseguire.

### Task 16: La striscia nuova (D3, §3.4 — SOLO dopo la ratifica del Task 7)

> ⚠️ **SUPERSESSIONE 26/07/2026 — l'AGGREGATO DESCRITTO QUI SOTTO NON SI IMPLEMENTA PIÙ.**
> Ovunque questo piano dica «N scadenze oggi — Vedi ›» con `href: '/lavori'` (qui nel Task 16, e
> nel Task 7 alla riga ~724) la specifica è **superata**. Motivo, verificato in codice e non
> ipotizzato: `src/app/(app)/lavori/page.tsx:36` — `/lavori` senza `?pila=` valida fa
> `redirect('/dashboard')`, quindi quella CTA riportava l'utente alla home da cui era partito, per
> QUALSIASI aggregato. In più il livello 1 non è omogeneo (materiale e pagamento sono predicati di
> stato senza finestra temporale: restano accesi per settimane, quindi «2+ allarmi» è lo stato di
> riposo di un laboratorio, non l'eccezione).
> **Forma in vigore, ratificata da Francesco il 26/07 dopo panel a 2 advisor:** la striscia
> **NOMINA il primo allarme acceso** — `forte`/`testo`/`azione` suoi, verbatim — e **CONTA gli
> altri** nel campo `altri?: number` di `SegnaleStriscia`; il **trial ≤3 giorni, se acceso, nomina
> per primo**. Il conteggio NON va concatenato in `testo` (il blocco di testo è troncato con
> ellissi a 390px: sarebbe la prima cosa a sparire) — viaggia come campo suo e la UI lo rende in un
> nodo che non si restringe. Copy del conteggio: `altri === 1` → «e un'altra» · `altri > 1` →
> «e altre N».
> Verbale emendato: `docs/design/decisions/2026-07-24-striscia-home.md` (§Comportamenti confermati).
> Codice già in vigore: `src/lib/dashboard/striscia.ts` (`scegliSegnale`, `candidatiLivello1`),
> commit `a3bf963`. **Restano validi** di questo Task 16: silenzio, racconto liberazione, dedup
> `eventoId`, forma F2 e coreografia V1.
> ⚠️ Nota di merito da mettere a verbale al gate estetico: la riserva UX 5a («mai un allarme
> nascosto dietro un altro») ora è soddisfatta nel senso **debole** — gli altri allarmi sono
> *contati*, non *nominati*. Il testo del piano qui sotto la enuncia ancora nel senso forte.

**Files:**
- Modify: `src/lib/dashboard/striscia.ts`
- Modify: `src/components/ds/StrisciaStato.tsx` + `HomeV3.tsx` (caso silenzio)
- Modify: `src/app/(app)/dashboard/page.tsx` (ingresso `liberazioneRecente`)
- Test: `tests/unit/dashboard/striscia.test.ts` (esiste — estendere)

**Interfaces:**
- Produces: `SegnaleStriscia` guadagna `silenzio?: true` (nessuna striscia — la home non renderizza lo slot) e `eventoId?: string` (dedup racconto client-side). `IngressiStriscia` guadagna `liberazioneRecente?: { cassettaId: string; nome: string; quando: string } | null` (query nel Promise.all di dashboard/page.tsx: ultima riga `cassette_lavori` con `liberato_per='consegna'` e `liberato_at > now()-24h`, join nome cassetta).
- Consumes: gerarchie `GERARCHIE` esistenti (si RISCRIVONO in testa, i candidati s1-s9 restano).

- [ ] **Step 1: Test failing** (in `striscia.test.ts`):

```ts
describe('striscia D3 (spec §3.4)', () => {
  it('aggregazione (riserva UX 5a): 2+ allarmi di livello 1 → «N scadenze oggi — Vedi ›»', () => {
    const s = scegliSegnale('titolare', ingressi({ ritardo: si, provaOggi: si }))
    expect(s.forte).toBe('3 scadenze oggi')   // conteggio dai candidati accesi
    expect(s.azione?.href).toBe('/lavori')
  })
  it('trial ≤3gg ESCALA a livello 1 e non viene mai affamato da un allarme singolo? No: entra nell aggregato', () => {
    const s = scegliSegnale('titolare', ingressi({ ritardo: si, trial: { giorniRimasti: 2 } }))
    expect(s.forte).toContain('scadenze')     // aggregato: il trial ci sta dentro
  })
  it('racconto (riserva UX 5c): liberazione <24h → quieto, tappabile, con eventoId', () => {
    const s = scegliSegnale('titolare', ingressi({ liberazioneRecente: { cassettaId: 'c1', nome: 'C12', quando: unOraFa } }))
    expect(s.testo).toContain('UÀ ha liberato C12')
    expect(s.azione?.href).toBe('/dashboard?stanza=parete')
    expect(s.eventoId).toBe('lib-c1-' + unOraFa)
  })
  it('silenzio (D3): nessun ingresso → silenzio:true, MAI il vecchio s9 «Tutto a posto»', () => {
    expect(scegliSegnale('titolare', ingressiVuoti()).silenzio).toBe(true)
  })
})
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implementazione in `striscia.ts`:** i candidati s1-s7 restano; si aggiunge il collettore di livello 1:

```ts
// D3 §3.4 — livello 1 con AGGREGAZIONE (riserva UX 5a): mai un allarme nascosto dietro
// un altro. Trial ≤3gg escala qui (riserva UX 5b). 1 solo allarme → il suo candidato
// originale (copy invariata); 2+ → aggregato.
const LIVELLO1_PER_RUOLO: Record<string, Candidato[]> = {
  titolare: [s1, s2, s3, s4, s5, s6, s7],
  admin_rete: [s1, s2, s3, s4, s5, s6, s7],
  front_desk: [s2, s3, s4, s1, s5, s6],
  tecnico: [s2, s3, s4, s6],
}
function candidatiLivello1(ruolo: string, i: IngressiStriscia): SegnaleStriscia[] {
  const perRuolo = LIVELLO1_PER_RUOLO[ruolo] ?? LIVELLO1_PER_RUOLO.tecnico
  const accesi = perRuolo.map((c) => c(i)).filter((s): s is SegnaleStriscia => !!s)
  // Escalation trial ≤3gg (riserva UX 5b) — solo per i ruoli che vedono il trial:
  const g = i.trial?.giorniRimasti
  if ((ruolo === 'titolare' || ruolo === 'admin_rete') && g !== undefined && g !== null && g >= 0 && g <= 3) {
    const t = sTrial(i)
    if (t) accesi.push(t)
  }
  return accesi
}
const sRaccontoLiberazione: Candidato = (i) =>
  i.liberazioneRecente
    ? { attenzione: false, forte: null, testo: `UÀ ha liberato ${i.liberazioneRecente.nome}`,
        azione: { etichetta: 'Guarda ›', href: '/dashboard?stanza=parete' },
        eventoId: `lib-${i.liberazioneRecente.cassettaId}-${i.liberazioneRecente.quando}` }
    : null

export function scegliSegnale(ruolo: string, i: IngressiStriscia): SegnaleStriscia {
  // 1) allarmi di livello 1 (già filtrati per ruolo), aggregati se 2+
  const allarmi = candidatiLivello1(ruolo, i)
  if (allarmi.length >= 2) return {
    attenzione: true, forte: `${allarmi.length} scadenze oggi`, testo: 'da guardare',
    azione: { etichetta: 'Vedi ›', href: '/lavori' },
  }
  if (allarmi.length === 1) return allarmi[0]
  // 2) trial fuori ultima finestra · account · racconti · SILENZIO (mai più s9 di default)
  for (const c of [sTecAccount, sTitTecnici, sTrial, sPareteIntro, sRaccontoLiberazione, s8]) {
    const s = c(i); if (s) return s
  }
  return { attenzione: false, forte: null, testo: '', azione: null, silenzio: true }
}
```

**Step 3-bis:** il vecchio array `GERARCHIE` muore (sostituito da `LIVELLO1_PER_RUOLO` + la catena fissa del punto 2); s9 «Tutto a posto» MUORE (il silenzio è la nuova quiete); s8 (DdC) resta come racconto. `getSegnaleStriscia` (riga 247) resta col contratto attuale ma passa dal nuovo `scegliSegnale`.

- [ ] **Step 4: UI.** `StrisciaStato`: forma dal mockup ratificato del Task 7 (valori verbatim); dedup racconto client-side: se `segnale.eventoId` è in `localStorage['ua_racconti_visti']` (array, cap 20) → il componente si rende come silenzio; al primo render con eventoId nuovo lo scrive. In `HomeV3`: `{!segnale.silenzio && <div className="striscia-slot">…</div>}` (il saluto respira — D3). In `dashboard/page.tsx`: aggiungere al Promise.all la query `liberazioneRecente` (SOLO se `serveParete` o sempre? SEMPRE: il racconto vale anche in modo solo-pile).

- [ ] **Step 5: Run → PASS** su `tests/unit/dashboard` + home; tsc zero. Screenshot dei 4 stati × 2 temi.

- [ ] **Step 6: Commit** — `feat(home): striscia «solo quando serve + racconti UÀ» con aggregazione (D3)`

### Task 17: Chiusura ondata (FASI 7-11)

- [ ] **Step 1:** FASE 7 completa: `npx tsc --noEmit` + `npx vitest run` (suite INTERA) + `npx next build` — output reali nel report.
- [ ] **Step 2:** FASE 8: `/code-review` + `superpowers:requesting-code-review` (review whole-branch).
- [ ] **Step 3:** FASE 9: QA Playwright 390/768/1280 × light/dark su: /cassette (rete, gancetto, targhe coi casi limite, ricerca filtra-e-risali, metti-un-lavoro, drag+suoni) e home (3 forme di «La tua home», linguetta, pile centrate, striscia 4 stati, swipe→parete vera, drag in stanza).
- [ ] **Step 4:** FASE 9b: GATE ESTETICO L2 sulla superficie dell'ondata (checklist `docs/design/audit-ui-ux/CHECKLIST-DS-V3-UI-UX.md`, 12 sezioni × 3 viewport × 2 temi); screenshot before/after in `docs/design/screenshots/<data>-redesign-parete-home/`.
- [ ] **Step 5:** 🛑 Merge SOLO su richiesta esplicita di Francesco (FASE 10: merge → push → CI verde → verifica uachelab.com).
- [ ] **Step 6:** FASE 11 (BP-1): MEMORY.md + ROADMAP-UFFICIALE.md + eventuale decision record residuo.

---

## Self-review del piano (fatta il 23/07)

- **Copertura spec:** D1→T6/8/9 · D2→T12 · D3→T16 · D4→T1/10 · D5→T3 · D6→T8 · D7→T13 · D8→T14 · §2.4→T4 · §2.5→T5 · §3.1 scroller→T2, colonne→T11, refresh/mount→T12 · guardie §5.4→T8/12/14 + decision record · gate §6.2/6.3/6.4→T6/7/3 · QA device→T15. Fuori piano (dichiarato): nessuna voce.
- **Tipi coerenti:** `pazienteAlias` (T1) consumato da T4 (pagliaio), T5 (route), T10 (targa) con lo stesso nome; `Scroller`/`creaScroller` (T2) consumati da T12 (`scrollerRef`); `contesto`/`attivo` (T12) coerenti con `LinguettaCassette.visibile` (T13); `eventoId`/`silenzio` (T16) consumati da StrisciaStato/HomeV3.
- **Punti a taratura QA dichiarati** (mai «a occhio»): coefficienti clamp del T14, passo maglia T8, delta-altezza targa T10 — tutti con misura Playwright computata, come il precedente del punto 1.
