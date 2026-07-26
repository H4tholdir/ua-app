# Tappa 3 — Un tema solo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** l'app ha **una sola** regola per decidere se è chiara o scura — segue il telefono, salvo che l'utente la blocchi da **un unico punto** (Impostazioni) — e ogni altro interruttore sparisce.

**Architecture:** una fonte sola (`src/lib/preferenze/tema.ts`) tiene i tre stati e la chiave; lo script inline di `ThemeInitializer` la risolve **prima della prima pittura** e scrive `data-theme` su `<html>`; tutto il resto **legge** quell'attributo — CSS compreso — invece di risolvere il tema per conto proprio. I sei punti che oggi decidono il tema diventano zero, meno l'unica opzione in Impostazioni e l'eccezione dichiarata del catalogo DS.

**Tech Stack:** Next.js 16 App Router · TypeScript strict · Vitest + jsdom · DS **v2.3** su `/impostazioni` (non è fra le route migrate a v3)

**Spec:** `docs/superpowers/specs/2026-07-26-un-tema-solo-e-la-barra-lo-segue-design.md`
**Decisioni:** `docs/design/decisions/2026-07-26-un-tema-solo.md` (D1-D8)
**Worktree:** `.claude/worktrees/un-tema-solo` — branch `worktree-un-tema-solo`

## Global Constraints

- **Chiave nuova `ua-tema` con tre valori** (`sistema` | `chiaro` | `scuro`), predefinito `sistema`. La vecchia `ua-theme` si **ignora e si cancella**: conteneva `light`/`dark` scritti da un interruttore a due stati, dove «Automatico» non era nemmeno offerto — quel valore non esprime la volontà di bloccare il tema.
- **Il denominatore comune è `data-theme` su `<html>`**, mai la classe `dark`: `admin-nav.tsx:36,44` scrive solo l'attributo. Ogni CSS che oggi si aggancia a `.dark` continua a funzionare perché `ThemeInitializer` scrive **entrambi**, ma il codice nuovo legge l'attributo.
- **`/impostazioni` è DS v2.3.** Token da `src/design-system/tokens.ts` e stile inline con `var(--x, fallback)`, come `SceltaHome.tsx`. **MAI** componenti o token v3 lì dentro (regola di convivenza §14).
- **Variante A ratificata** (D8): righe col pallino identiche a «La tua home», **più una frase di stato**. Nessun componente nuovo. La forma B arriverà gratis con `ChipScelta` quando `/impostazioni` passerà a v3.
- **Il catalogo `/ds-v3-catalogo` TIENE il suo interruttore** — eccezione dichiarata, non un buco: serve a confrontare i componenti nei due temi ed è una pagina che l'utente non incontra.
- **`public/offline.html` legge la chiave**: va aggiornato alla chiave nuova nello stesso lavoro, altrimenti la pagina del momento peggiore si sfasa in silenzio.
- **Non toccare** `appleWebApp.statusBarStyle` né `.retry` di `offline.html`.
- **Comandi dal worktree** `/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app/.claude/worktrees/un-tema-solo`. ⚠️ Un worktree nuovo nasce senza `.env.local`/`.env.test`: senza copiarli dal repo principale `next build` fallisce su `/api/admin/labs`.

---

## Struttura dei file

| File | Responsabilità |
|---|---|
| `src/lib/preferenze/tema.ts` | **Nuovo.** I tre stati, la chiave, la risoluzione. Nessun DOM, nessun React: pura logica, testabile da sola. Gemello di `src/lib/preferenze/home.ts`, che è il precedente in repo |
| `src/components/layout/ThemeInitializer.tsx` | **Modificato.** Legge la chiave nuova, cancella la vecchia, risolve e scrive `data-theme` + classe + colore barra |
| `src/hooks/useTheme.ts` | **Modificato.** Espone `modo`, `temaRisolto`, `impostaModo`. Il listener di sistema agisce **solo** quando `modo === 'sistema'` |
| `src/components/features/impostazioni/SceltaTema.tsx` | **Nuovo.** L'unica opzione, variante A + frase di stato. Gemello di `SceltaHome.tsx`, **senza** la parte di rete: la preferenza è locale |
| `src/app/(app)/impostazioni/page.tsx` | **Modificato.** Monta `SceltaTema` accanto a `SceltaHome` |
| `src/app/(auth)/*/…-form.tsx` (4 file) | **Modificati.** Smettono di risolvere il tema; la tavolozza si aggancia a `<html>` |
| `src/app/globals.css` | **Modificato.** `.login-root[data-login-theme=…]` → `html[data-theme=…] .login-root` |
| `AppHeader.tsx` · `SchedaNavRail.tsx` · `UserProfileSheet.tsx` · `admin-nav.tsx` | **Modificati.** Via gli interruttori e la memoria separata |
| `blocked/page.tsx` · `billing-content.tsx` | **Modificati.** Via il tema fisso |
| `src/components/ui/sonner.tsx` | **Modificato.** Il tema dei toast viene dal nostro, non da `next-themes` |
| `public/offline.html` | **Modificato.** Chiave nuova |
| `tests/unit/un-tema-solo-e-la-barra-lo-segue.test.ts` | **Esteso.** Censimento degli scrittori di tema (§7.3 punti 10-11) |

---

### Task 1: I tre stati, in un posto solo

**Files:**
- Create: `src/lib/preferenze/tema.ts`
- Test: `tests/unit/preferenze-tema.test.ts`

**Interfaces:**
- Produces:
  - `type ModoTema = 'sistema' | 'chiaro' | 'scuro'`
  - `CHIAVE_TEMA = 'ua-tema'` · `CHIAVE_VECCHIA = 'ua-theme'`
  - `isModoTema(v: unknown): v is ModoTema`
  - `risolviTema(modo: ModoTema, sistemaScuro: boolean): 'light' | 'dark'`

- [ ] **Step 1: Scrivi il test che fallisce**

```typescript
import { describe, it, expect } from 'vitest'
import { isModoTema, risolviTema, CHIAVE_TEMA, CHIAVE_VECCHIA } from '@/lib/preferenze/tema'

describe('isModoTema — porta stretta', () => {
  it('accetta i tre stati previsti', () => {
    for (const v of ['sistema', 'chiaro', 'scuro']) expect(isModoTema(v)).toBe(true)
  })

  it('rifiuta i valori della vecchia chiave e ogni altra cosa', () => {
    for (const v of ['light', 'dark', '', null, undefined, 0, {}]) expect(isModoTema(v)).toBe(false)
  })
})

describe('risolviTema — sistema, chiaro, scuro', () => {
  it('con sistema segue il telefono', () => {
    expect(risolviTema('sistema', true)).toBe('dark')
    expect(risolviTema('sistema', false)).toBe('light')
  })

  it('bloccato, ignora il telefono in entrambi i versi', () => {
    expect(risolviTema('chiaro', true)).toBe('light')
    expect(risolviTema('scuro', false)).toBe('dark')
  })
})

describe('Le chiavi', () => {
  it('la nuova non e la vecchia', () => {
    expect(CHIAVE_TEMA).toBe('ua-tema')
    expect(CHIAVE_VECCHIA).toBe('ua-theme')
    expect(CHIAVE_TEMA).not.toBe(CHIAVE_VECCHIA)
  })
})
```

- [ ] **Step 2: Lancia e verifica che fallisca**

```bash
npx vitest run tests/unit/preferenze-tema.test.ts
```

Atteso: **FAIL** — modulo non risolvibile.

- [ ] **Step 3: Scrivi il modulo**

```typescript
// L'UNICA regola con cui questa app decide se e' chiara o scura.
// Prima ce n'erano quattro (ua-theme, prefers-color-scheme nudo sulle schermate
// di accesso, ua-admin-theme, due superfici a tema fisso) e sette posti che la
// applicavano: v. docs/superpowers/specs/2026-07-26-un-tema-solo-e-la-barra-lo-segue-design.md §3.
export type ModoTema = 'sistema' | 'chiaro' | 'scuro'

export const CHIAVE_TEMA = 'ua-tema'

// La chiave vecchia si IGNORA e si cancella: conteneva light/dark scritti da un
// interruttore a DUE stati, dove «Automatico» non era nemmeno offerto. Quel
// valore non esprime la volonta' di bloccare il tema — la esprimerebbe per caso.
export const CHIAVE_VECCHIA = 'ua-theme'

export const MODO_PREDEFINITO: ModoTema = 'sistema'

export function isModoTema(valore: unknown): valore is ModoTema {
  return valore === 'sistema' || valore === 'chiaro' || valore === 'scuro'
}

export function risolviTema(modo: ModoTema, sistemaScuro: boolean): 'light' | 'dark' {
  if (modo === 'chiaro') return 'light'
  if (modo === 'scuro') return 'dark'
  return sistemaScuro ? 'dark' : 'light'
}
```

- [ ] **Step 4: Lancia e verifica che passi**

```bash
npx vitest run tests/unit/preferenze-tema.test.ts
```

Atteso: **PASS**, 5 test.

- [ ] **Step 5: Commit**

```bash
git add src/lib/preferenze/tema.ts tests/unit/preferenze-tema.test.ts
git commit -m "feat(tema): i tre stati in un posto solo, con la chiave nuova

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Lo script inline usa la chiave nuova e cancella la vecchia

**Files:**
- Modify: `src/components/layout/ThemeInitializer.tsx`
- Test: `tests/unit/colore-barra-sistema.test.ts` (i test esistenti su `SCRIPT_TEMA` vanno adeguati)

**Interfaces:**
- Consumes: `CHIAVE_TEMA`, `CHIAVE_VECCHIA` da Task 1 · `COLORE_BARRA` (già esistente)
- Produces: `SCRIPT_TEMA` invariato nella firma

- [ ] **Step 1: Adegua i test esistenti e aggiungi i nuovi**

In `tests/unit/colore-barra-sistema.test.ts`, sostituisci `localStorage.setItem('ua-theme', 'light')` con `localStorage.setItem('ua-tema', 'chiaro')` (e `'dark'` → `'scuro'`), poi aggiungi:

```typescript
it('cancella la chiave vecchia, cosi nessuno resta bloccato per accidente', () => {
  localStorage.setItem('ua-theme', 'dark')
  sistemaScuro(false)

  eseguiScript()

  expect(localStorage.getItem('ua-theme')).toBeNull()
  expect(document.documentElement.getAttribute('data-theme')).toBe('light')
})

it('un valore non previsto nella chiave nuova ricade su sistema', () => {
  localStorage.setItem('ua-tema', 'turchese')
  sistemaScuro(true)

  eseguiScript()

  expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
})
```

- [ ] **Step 2: Lancia e verifica che fallisca**

```bash
npx vitest run tests/unit/colore-barra-sistema.test.ts
```

Atteso: **FAIL** sui due nuovi e sui tre adeguati.

- [ ] **Step 3: Aggiorna `SCRIPT_TEMA`**

Nel blocco dello storage, sostituisci il corpo con:

```js
  var m=null;
  try{
    m=localStorage.getItem('ua-tema');
    /* la chiave vecchia si cancella: v. tema.ts, CHIAVE_VECCHIA */
    localStorage.removeItem('ua-theme');
  }catch(e){}
  try{
  var sis=!!window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;
  var d=m==='scuro'||(m!=='chiaro'&&sis);
```

Il resto (classe, `data-theme`, colore barra, osservatore) resta identico.

- [ ] **Step 4: Lancia e verifica che passi**

```bash
npx vitest run tests/unit/colore-barra-sistema.test.ts
```

Atteso: **PASS**.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/ThemeInitializer.tsx tests/unit/colore-barra-sistema.test.ts
git commit -m "feat(tema): lo script inline passa alla chiave a tre stati

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: `useTheme` a tre stati

**Files:**
- Modify: `src/hooks/useTheme.ts`
- Test: `tests/unit/use-theme.test.tsx` (crealo se non esiste)

**Interfaces:**
- Consumes: Task 1
- Produces: `useTheme(): { modo: ModoTema; temaRisolto: 'light'|'dark'; impostaModo(m: ModoTema): void }`

🛑 **`toggle()` e `isDark` spariscono.** Sono l'interruttore a due stati: lasciarli in vita significherebbe lasciare in vita i punti di accesso che questa tappa esiste per togliere. Ogni chiamante va aggiornato (Task 5) — sono errori di compilazione, quindi nessuno può sfuggire.

- [ ] **Step 1: Scrivi il test che fallisce**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme } from '@/hooks/useTheme'

function sistemaScuro(scuro: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (q: string) => ({
      matches: scuro && q.includes('dark'), media: q, onchange: null,
      addListener: () => {}, removeListener: () => {},
      addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
    }),
  })
}

describe('useTheme — tre stati, una regola', () => {
  beforeEach(() => { localStorage.clear(); sistemaScuro(false) })

  it('parte da sistema quando non c_e nessuna preferenza', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.modo).toBe('sistema')
  })

  it('bloccare il tema lo scrive e lo risolve', () => {
    const { result } = renderHook(() => useTheme())

    act(() => result.current.impostaModo('scuro'))

    expect(result.current.modo).toBe('scuro')
    expect(result.current.temaRisolto).toBe('dark')
    expect(localStorage.getItem('ua-tema')).toBe('scuro')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('tornare ad Automatico rimette il telefono al comando', () => {
    sistemaScuro(true)
    const { result } = renderHook(() => useTheme())

    act(() => result.current.impostaModo('chiaro'))
    expect(result.current.temaRisolto).toBe('light')

    act(() => result.current.impostaModo('sistema'))
    expect(result.current.temaRisolto).toBe('dark')
  })
})
```

- [ ] **Step 2: Lancia e verifica che fallisca**

```bash
npx vitest run tests/unit/use-theme.test.tsx
```

Atteso: **FAIL** — `modo`/`impostaModo` non esistono.

- [ ] **Step 3: Riscrivi l'hook**

Sostituisci il corpo di `src/hooks/useTheme.ts` mantenendo il pattern anti-mismatch già commentato nel file (stato iniziale allineato al server, lettura reale dopo il mount), e applicando `data-theme` **e** la classe `dark` come fa oggi `applyTheme`. Il listener di `matchMedia` agisce **solo** se `modo === 'sistema'`.

- [ ] **Step 4: Lancia e verifica che passi**

```bash
npx vitest run tests/unit/use-theme.test.tsx
```

Atteso: **PASS**, 3 test.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useTheme.ts tests/unit/use-theme.test.tsx
git commit -m "feat(tema): useTheme a tre stati, via toggle e isDark

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: L'opzione in Impostazioni (variante A + frase di stato)

**Files:**
- Create: `src/components/features/impostazioni/SceltaTema.tsx`
- Modify: `src/app/(app)/impostazioni/page.tsx`
- Test: `tests/unit/scelta-tema.test.tsx`

**Interfaces:**
- Consumes: Task 1, Task 3
- Produces: `<SceltaTema />` — nessuna prop: la preferenza è locale, non arriva dal server

🛑 **DS v2.3.** Stile inline con `var(--x, fallback)`, `font-family: 'DM Sans', sans-serif`, righe da 44px: copia l'anatomia di `SceltaHome.tsx`, **non** quella dei componenti v3. Differenza: **niente** `fetch`, niente stato di salvataggio, niente rollback — la preferenza non passa dal server e non può fallire.

- [ ] **Step 1: Scrivi il test che fallisce**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SceltaTema } from '@/components/features/impostazioni/SceltaTema'

describe('SceltaTema — l_unico punto in cui si blocca il tema', () => {
  beforeEach(() => { localStorage.clear() })

  it('offre le tre scelte, con Automatico predefinita', () => {
    render(<SceltaTema />)

    expect(screen.getByRole('radio', { name: /automatico/i })).toBeChecked()
    expect(screen.getByRole('radio', { name: /sempre chiaro/i })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: /sempre scuro/i })).not.toBeChecked()
  })

  it('scegliere scrive la preferenza e sposta la spunta', () => {
    render(<SceltaTema />)

    fireEvent.click(screen.getByRole('radio', { name: /sempre scuro/i }))

    expect(localStorage.getItem('ua-tema')).toBe('scuro')
    expect(screen.getByRole('radio', { name: /sempre scuro/i })).toBeChecked()
  })

  it('dice sempre che cosa sta seguendo adesso', () => {
    render(<SceltaTema />)
    expect(screen.getByText(/ora segue il telefono/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: /sempre chiaro/i }))
    expect(screen.queryByText(/ora segue il telefono/i)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Lancia e verifica che fallisca**

```bash
npx vitest run tests/unit/scelta-tema.test.tsx
```

Atteso: **FAIL** — componente inesistente.

- [ ] **Step 3: Scrivi il componente e montalo**

Riga «Tema» in `page.tsx` accanto a `<SceltaHome />`, dentro la stessa scheda. Le tre etichette: **Automatico** (con `— come il telefono`), **Sempre chiaro**, **Sempre scuro**. Sotto, la frase di stato: `Ora segue il telefono: chiaro.` / `Bloccato sul chiaro.` / `Bloccato sullo scuro.`

- [ ] **Step 4: Lancia e verifica che passi**

```bash
npx vitest run tests/unit/scelta-tema.test.tsx
```

Atteso: **PASS**, 3 test.

- [ ] **Step 5: Commit**

```bash
git add src/components/features/impostazioni/SceltaTema.tsx "src/app/(app)/impostazioni/page.tsx" tests/unit/scelta-tema.test.tsx
git commit -m "feat(tema): l'unica opzione, in Impostazioni (variante A ratificata)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: La bonifica — spariscono i cinque punti di accesso

🛑 **Vincolo di sequenza (spec §6):** questo task e il Task 4 vanno **nello stesso deploy**. Rimuovere gli interruttori prima che l'opzione esista lascerebbe un intervallo in cui il tema si cambia solo da `localStorage`.

**Files:**
- Modify: `src/components/layout/AppHeader.tsx` (riga 124 + prop `showThemeToggle` e ogni chiamante)
- Modify: `src/components/features/lavori/scheda-v3/SchedaNavRail.tsx:128`
- Modify: `src/components/layout/UserProfileSheet.tsx` (riga 68 + il blocco «Tema» ~217-243)
- Modify: `src/app/admin/admin-nav.tsx` (interruttore + `ua-admin-theme`)
- Delete: `src/components/layout/ThemeToggleButton.tsx` **se** nessuno lo monta più
- Modify: `src/app/(auth)/login/login-form.tsx` (sole/luna riga ~312-317 + `isDark` locale), `reset-form.tsx`, `forgot-form.tsx`, `invite-form.tsx`
- Modify: `src/app/globals.css` (`.login-root[data-login-theme=…]` → `html[data-theme=…] .login-root`)
- Modify: `src/app/blocked/page.tsx:37`, `src/app/billing/billing-content.tsx:158`
- Modify: `src/components/ui/sonner.tsx`

- [ ] **Step 1: Togli gli interruttori e lascia che il compilatore trovi i chiamanti**

```bash
npx tsc --noEmit
```

Ogni uso di `toggle`/`isDark` è un errore: è la lista di lavoro, e nessuno può sfuggire.

- [ ] **Step 2: Aggancia le schermate di accesso a `<html>`**

In `globals.css`, le due tavolozze passano da `.login-root[data-login-theme="light|dark"]` a `html[data-theme="light|dark"] .login-root`. Nei quattro form spariscono `isDark`, il listener di `matchMedia` e l'attributo `data-login-theme`.

**Perché:** `data-login-theme` è pilotato da stato React e al primo render vale `light` → **lampo chiaro** in tema scuro. `data-theme` su `<html>` è già scritto **prima della pittura**.

- [ ] **Step 3: Togli i due temi fissi e sistema i toast**

`blocked/page.tsx:37` e `billing-content.tsx:158` smettono di imporre un tema. In `sonner.tsx`, `useTheme` di `next-themes` (che non ha alcun provider montato, quindi vale sempre `"system"`) è sostituito dal nostro `temaRisolto`.

- [ ] **Step 4: Aggiorna `public/offline.html` alla chiave nuova**

Nello script: `localStorage.getItem('ua-tema')`, e `var scuro = salvato === 'scuro'`. Il commento che avvisava di questo passaggio va rimosso: è fatto.

- [ ] **Step 5: Verifica**

```bash
npx tsc --noEmit
npx vitest run
```

Atteso: zero errori, suite verde.

- [ ] **Step 6: Commit**

```bash
git add -A src public
git commit -m "feat(tema): bonifica — spariscono i cinque punti di accesso

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: La guardia del censimento

**Files:**
- Modify: `tests/unit/un-tema-solo-e-la-barra-lo-segue.test.ts`

Aggiungi il blocco §7.3 punti 10-11 della spec. 🛑 **Non asserire su `prefers-color-scheme`**: dopo questa tappa sono proprio `tema.ts`, `useTheme.ts` e `ThemeInitializer.tsx` a doverlo interrogare. Si assert sulle **operazioni che un risolutore non può evitare**:

- `localStorage.getItem`/`setItem` con una chiave di tema compare **solo** in `useTheme.ts` e `ThemeInitializer.tsx` (più `offline.html`, che è HTML statico e va nominato a parte);
- le scritture di `data-theme` e di `classList` su `document.documentElement` compaiono **solo** in `useTheme.ts`, `ThemeInitializer.tsx` e `ds-v3-catalogo/page.tsx` (**l'eccezione dichiarata**);
- `ua-admin-theme` e `data-login-theme` **non esistono più**; `next-themes` non è importato da `src/`.

- [ ] **Step 1: Scrivi le asserzioni** · **Step 2: verifica che falliscano su un file civetta** · **Step 3: rendile verdi** · **Step 4: commit**

---

### Task 7: Verifica, QA e gate estetico

- [ ] **Step 1:** `npx tsc --noEmit` · `npx vitest run` · `npx next build` — output reale, tutti e tre (BP-2 FASE 7).
- [ ] **Step 2: QA browser** — 390/768/1280 × light/dark su `/impostazioni`, `/login`, `/blocked`, `/billing`, `/admin`, più una pagina qualsiasi dell'app per i toast.
- [ ] **Step 3: GATE ESTETICO L2 (FASE 9b)** sulle superfici toccate. ⚠️ **`blocked` e `billing` sono UI nuova**: prendono una resa **mai esistita** (la sospensione in chiaro, l'abbonamento in scuro). Vanno guardate con attenzione e, se non reggono, si torna da Francesco prima del merge — non si spedisce una variante mai rivista della schermata di laboratorio sospeso.
- [ ] **Step 4: Screenshot before/after** in `docs/design/screenshots/2026-07-26-tema-unico/` (⚠️ `.gitignore` riga 62 ignora `*.png`: `git add -f`).
- [ ] **Step 5:** merge + push + CI/CD verdi + verifica su `uachelab.com` (FASE 10), poi **BP-1**: `MEMORY.md` e la voce A5 del backlog.

---

## Self-Review

**Copertura della spec.** §4.1-4.2 tre stati e chiave nuova → Task 1-2. §4.3 fonte sola letta prima della pittura → Task 2-3. §4.4 autenticazione agganciata a `<html>` → Task 5 step 2. §4.5 nessuna eccezione (`blocked`/`billing`) → Task 5 step 3. §4.6 opzione in Impostazioni → Task 4. §3.2 bonifica dei sei punti → Task 5 (il sesto, il catalogo, **resta** per decisione dichiarata). §7.3 censimento → Task 6. D8 variante A → Task 4.

**Segnaposto:** i Task 5 e 6 descrivono modifiche meccaniche guidate dal compilatore invece di riportare ogni riga: la lista di lavoro la produce `tsc`, ed è esatta. Ogni punto ha però il file, la riga e il **perché**.

**Coerenza dei nomi:** `ModoTema`, `CHIAVE_TEMA`, `CHIAVE_VECCHIA`, `MODO_PREDEFINITO`, `isModoTema`, `risolviTema`, `modo`, `temaRisolto`, `impostaModo`, `SceltaTema` — stessa grafia in tutti i task.

**Fuori da questa tappa:** `color-scheme` mai dichiarato · `safe-area-inset-top` · iOS · `--bg-deep` sotto la barra · il portale pubblico (`portale/[token]/layout.tsx:15`, fondo `#F8F9FA` cotto a mano) · la strisciolina di 1px sotto la barra di stato (**non è nostra**: nessun bordo, nessun velo nel codice; sospetto separatore di sistema, da chiudere con l'osservazione in tema scuro).
