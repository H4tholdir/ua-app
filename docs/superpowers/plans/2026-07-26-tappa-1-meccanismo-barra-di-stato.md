# Tappa 1 — Il meccanismo della barra di stato — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** far sì che il colore della barra di stato Android segua **dal vivo** il tema risolto dell'app, senza toccare `manifest.json` né `offline.html` — così la prova sul device di Francesco è a variabile singola.

**Architecture:** un modulo (`colore-barra-sistema.ts`) deriva i due colori dai token v3 ed espone un **upsert** sui `meta[name="theme-color"]`. `ThemeInitializer.tsx` — script inline sincrono in `<head>`, quindi eseguito **prima della prima pittura** — risolve il tema, lo applica a `<html>`, imposta il colore della barra e installa un `MutationObserver` su `data-theme` che lo riallinea a ogni cambio. `layout.tsx` smette di dichiarare `themeColor`, così nell'app esiste **un solo** `theme-color` e nessun tag posseduto da React.

**Tech Stack:** Next.js 16 (App Router) · TypeScript strict · Vitest + jsdom · token DS v3 (`src/design-system/v3/tokens.ts`)

**Spec:** `docs/superpowers/specs/2026-07-26-un-tema-solo-e-la-barra-lo-segue-design.md` (§5, §6 tappa 1)
**Worktree:** `.claude/worktrees/un-tema-solo` — branch `worktree-un-tema-solo`

## Global Constraints

- **Nessun hex letterale nel codice nuovo.** I due colori si derivano da `luce.bg` e `notte.bg` di `src/design-system/v3/tokens.ts`. Ridigitarli crea l'ennesimo posto che tiene il colore di fondo — è il modo esatto in cui la voce A5 si è riaperta.
- **`public/manifest.json` e `public/offline.html` NON si toccano in questa tappa.** È il vincolo che rende la prova sul device discriminante: il colore cotto nel WebAPK non ha nulla verso cui aggiornarsi.
- **Non toccare `appleWebApp.statusBarStyle`** (`src/app/layout.tsx:22`): altra piattaforma, e `safe-area-inset-top` non esiste in `src/`.
- **Upsert, mai `querySelector` e basta.** L'ordine fra i tag emessi da Next e lo script inline non è un contratto: un `querySelector` che trova `null` è un no-op silenzioso che funziona in una build e non nell'altra.
- **La condizione è `data-theme === 'dark' ? scuro : chiaro`.** Mai il contrario: `src/app/ds-v3-catalogo/page.tsx:172` fa `removeAttribute('data-theme')`, quindi l'attributo può essere **assente**, non `"light"`.
- **Nelle stringhe di script e nei blocchi `<style>{…}` non usare MAI backtick nei commenti**: chiudono il template literal e producono l'errore oscuro `TS1381`. Apici singoli.
- **La chiave `ua-theme` resta a due valori in questa tappa.** I tre stati (`sistema`/`chiaro`/`scuro`) e la chiave nuova `ua-tema` arrivano nella tappa 3: qui non si cambia la semantica del tema, solo chi dipinge la barra.
- **Commit format del progetto:** `feat(scope): messaggio` / `test(scope): messaggio`, con `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` in coda.
- **Tutti i comandi si lanciano da** `/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app/.claude/worktrees/un-tema-solo`.

---

## Struttura dei file

| File | Responsabilità |
|---|---|
| `src/design-system/colore-barra-sistema.ts` | **Nuovo.** Unica fonte dei due colori di barra (derivati dai token) e unica implementazione dell'upsert. Nessuna conoscenza di React, di storage o di come si risolve il tema |
| `src/components/layout/ThemeInitializer.tsx` | **Modificato.** Risolve il tema prima della pittura e lo applica; da ora imposta anche il colore della barra e resta in ascolto. Esporta la stringa dello script così che il test possa eseguire **esattamente** il codice che gira in produzione |
| `src/app/layout.tsx` | **Modificato.** Smette di dichiarare `themeColor` nell'export `viewport` |
| `tests/unit/colore-barra-sistema.test.ts` | **Nuovo.** Comportamento dell'upsert, comportamento dello script inline eseguito in jsdom, e il controllo che `layout.tsx` non dichiari più `themeColor` |

**Perché lo script è esportato come stringa.** La logica dell'upsert esiste per forza in due forme: TypeScript per il modulo, e testo dentro lo script inline (che non può importare nulla). Esportando la stringa, il test esercita **entrambe** — e se un giorno divergono, il test lo dice.

---

### Task 1: Il modulo del colore e il suo upsert

**Files:**
- Create: `src/design-system/colore-barra-sistema.ts`
- Test: `tests/unit/colore-barra-sistema.test.ts`

**Interfaces:**
- Consumes: `luce`, `notte` da `src/design-system/v3/tokens.ts` (già esistenti: `luce.bg === '#F4F0E7'`, `notte.bg === '#171411'`)
- Produces:
  - `COLORE_BARRA: { readonly light: string; readonly dark: string }`
  - `type TemaRisolto = 'light' | 'dark'`
  - `impostaColoreBarra(tema: TemaRisolto): void`

- [ ] **Step 1: Scrivi il test che fallisce**

Crea `tests/unit/colore-barra-sistema.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { COLORE_BARRA, impostaColoreBarra } from '@/design-system/colore-barra-sistema'
import { luce, notte } from '@/design-system/v3/tokens'

function metaTemi(): string[] {
  return Array.from(document.querySelectorAll('meta[name="theme-color"]'))
    .map(m => m.getAttribute('content') ?? '')
}

describe('COLORE_BARRA — deriva dal fondo, non lo ridigita', () => {
  it('vale esattamente il fondo dei token v3', () => {
    expect(COLORE_BARRA.light).toBe(luce.bg)
    expect(COLORE_BARRA.dark).toBe(notte.bg)
  })
})

describe('impostaColoreBarra — upsert, mai no-op silenzioso', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
  })

  it('crea il meta quando non ce ne sono', () => {
    expect(metaTemi()).toHaveLength(0)

    impostaColoreBarra('dark')

    expect(metaTemi()).toEqual([COLORE_BARRA.dark])
  })

  it('aggiorna TUTTI i meta presenti, non solo il primo', () => {
    document.head.innerHTML =
      '<meta name="theme-color" content="#D90012">' +
      '<meta name="theme-color" content="#D90012" media="(prefers-color-scheme: dark)">'

    impostaColoreBarra('light')

    expect(metaTemi()).toEqual([COLORE_BARRA.light, COLORE_BARRA.light])
  })

  it('non ne crea un secondo se ce n_e gia uno', () => {
    document.head.innerHTML = '<meta name="theme-color" content="#D90012">'

    impostaColoreBarra('dark')

    expect(metaTemi()).toHaveLength(1)
    expect(metaTemi()[0]).toBe(COLORE_BARRA.dark)
  })

  it('non tocca i meta di altro nome', () => {
    document.head.innerHTML = '<meta name="description" content="UA">'

    impostaColoreBarra('dark')

    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('UA')
    expect(metaTemi()).toEqual([COLORE_BARRA.dark])
  })
})
```

- [ ] **Step 2: Lancia il test e verifica che fallisca**

```bash
npx vitest run tests/unit/colore-barra-sistema.test.ts
```

Atteso: **FAIL** — `Failed to resolve import "@/design-system/colore-barra-sistema"`.

- [ ] **Step 3: Scrivi l'implementazione minima**

Crea `src/design-system/colore-barra-sistema.ts`:

```typescript
// Il colore della barra di stato di sistema E il fondo della superficie corrente.
// REGOLA ZERO: qui non si scrive nessun colore a mano — si deriva dai token v3.
// Se il fondo cambia, la barra cambia con lui: e' questa la relazione che la voce A5
// aveva perso quando il backlog aveva conservato un valore invece di una regola.
import { luce, notte } from '@/design-system/v3/tokens'

export const COLORE_BARRA = { light: luce.bg, dark: notte.bg } as const

export type TemaRisolto = 'light' | 'dark'

/**
 * Upsert del colore della barra di stato.
 *
 * Aggiorna il content di TUTTI i meta[name="theme-color"] presenti e ne crea uno
 * se non ce n'e' nessuno. Non e' pignoleria: l'ordine fra i tag emessi da Next e
 * lo script inline in <head> non e' un contratto (React solleva e riordina i meta
 * rispetto al JSX), quindi un querySelector che trova null sarebbe un no-op
 * silenzioso — funzionante in una build e rotto nell'altra.
 */
export function impostaColoreBarra(tema: TemaRisolto): void {
  const colore = tema === 'dark' ? COLORE_BARRA.dark : COLORE_BARRA.light
  const esistenti = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')

  if (esistenti.length === 0) {
    const meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    meta.setAttribute('content', colore)
    document.head.appendChild(meta)
    return
  }

  esistenti.forEach(meta => meta.setAttribute('content', colore))
}
```

- [ ] **Step 4: Lancia il test e verifica che passi**

```bash
npx vitest run tests/unit/colore-barra-sistema.test.ts
```

Atteso: **PASS**, 5 test verdi.

- [ ] **Step 5: Commit**

```bash
git add src/design-system/colore-barra-sistema.ts tests/unit/colore-barra-sistema.test.ts
git commit -m "feat(tema): modulo colore barra di sistema, derivato dai token v3

Upsert su tutti i meta theme-color, con creazione se assenti: l'ordine dei
tag emessi da Next rispetto allo script inline non e' un contratto, quindi
un querySelector che trova null sarebbe un no-op silenzioso.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Lo script inline imposta il colore e resta in ascolto

**Files:**
- Modify: `src/components/layout/ThemeInitializer.tsx` (intero file, oggi 16 righe)
- Test: `tests/unit/colore-barra-sistema.test.ts` (si aggiunge un `describe`)

**Interfaces:**
- Consumes: `COLORE_BARRA` da Task 1
- Produces:
  - `SCRIPT_TEMA: string` — il sorgente esatto dello script inline, esportato perché il test possa eseguirlo
  - `ThemeInitializer(): JSX.Element` — invariata nella firma

- [ ] **Step 1: Scrivi il test che fallisce**

Aggiungi in coda a `tests/unit/colore-barra-sistema.test.ts`:

```typescript
import { SCRIPT_TEMA } from '@/components/layout/ThemeInitializer'

function eseguiScript(): void {
  new Function(SCRIPT_TEMA)()
}

function sistemaScuro(scuro: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: scuro && query.includes('dark'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

describe('SCRIPT_TEMA — il codice che gira davvero, prima della prima pittura', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.classList.remove('dark')
    localStorage.clear()
    sistemaScuro(false)
  })

  it('senza preferenza, segue il sistema chiaro', () => {
    eseguiScript()

    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(metaTemi()).toEqual([COLORE_BARRA.light])
  })

  it('senza preferenza, segue il sistema scuro', () => {
    sistemaScuro(true)

    eseguiScript()

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(metaTemi()).toEqual([COLORE_BARRA.dark])
  })

  it('la preferenza salvata vince sul sistema', () => {
    sistemaScuro(true)
    localStorage.setItem('ua-theme', 'light')

    eseguiScript()

    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(metaTemi()).toEqual([COLORE_BARRA.light])
  })

  it('aggiorna il meta gia emesso da Next invece di aggiungerne un altro', () => {
    document.head.innerHTML = '<meta name="theme-color" content="#D90012">'
    sistemaScuro(true)

    eseguiScript()

    expect(metaTemi()).toEqual([COLORE_BARRA.dark])
  })

  it('segue dal vivo il cambio di data-theme — e questa e la cosa da provare sul device', async () => {
    eseguiScript()
    expect(metaTemi()).toEqual([COLORE_BARRA.light])

    document.documentElement.setAttribute('data-theme', 'dark')
    await new Promise(r => setTimeout(r, 0))

    expect(metaTemi()).toEqual([COLORE_BARRA.dark])
  })

  it('con data-theme RIMOSSO torna chiaro, non scuro (caso ds-v3-catalogo)', async () => {
    localStorage.setItem('ua-theme', 'dark')
    eseguiScript()
    expect(metaTemi()).toEqual([COLORE_BARRA.dark])

    document.documentElement.removeAttribute('data-theme')
    await new Promise(r => setTimeout(r, 0))

    expect(metaTemi()).toEqual([COLORE_BARRA.light])
  })

  it('non contiene colori scritti a mano', () => {
    expect(SCRIPT_TEMA).toContain(COLORE_BARRA.light)
    expect(SCRIPT_TEMA).toContain(COLORE_BARRA.dark)
    expect(SCRIPT_TEMA).not.toContain('#D90012')
  })
})
```

- [ ] **Step 2: Lancia il test e verifica che fallisca**

```bash
npx vitest run tests/unit/colore-barra-sistema.test.ts
```

Atteso: **FAIL** — `SCRIPT_TEMA` non è esportato da `ThemeInitializer`.

- [ ] **Step 3: Riscrivi `ThemeInitializer.tsx`**

Sostituisci l'intero contenuto di `src/components/layout/ThemeInitializer.tsx`:

```tsx
// Script inline che applica il tema PRIMA del render per evitare FOUC, e che da
// qui in avanti tiene allineato anche il colore della barra di stato di sistema.
// SECURITY NOTE: dangerouslySetInnerHTML is safe — stringa statica, nessun input utente.
//
// Perche' il colore della barra sta QUI e non in un componente client: questo script
// e' sincrono in <head>, quindi gira prima della prima pittura. Un componente React
// arriverebbe dopo l'idratazione, cioe' dopo che l'utente ha gia' visto il colore
// sbagliato.
//
// ATTENZIONE: dentro questa stringa NON si possono usare backtick nei commenti —
// chiudono il template literal e producono un TS1381 oscuro. Apici singoli.
import { COLORE_BARRA } from '@/design-system/colore-barra-sistema'

export const SCRIPT_TEMA = `(function(){try{
  var s=localStorage.getItem('ua-theme');
  var d=s==='dark'||(!s&&window.matchMedia('(prefers-color-scheme: dark)').matches);
  var h=document.documentElement;
  if(d){h.classList.add('dark');h.setAttribute('data-theme','dark');}
  else{h.classList.remove('dark');h.setAttribute('data-theme','light');}
  var CHIARO='${COLORE_BARRA.light}',SCURO='${COLORE_BARRA.dark}';
  function barra(){
    /* la condizione e' 'dark' ? scuro : chiaro — mai il contrario: data-theme puo'
       essere ASSENTE (ds-v3-catalogo lo rimuove), e assente significa chiaro. */
    var c=h.getAttribute('data-theme')==='dark'?SCURO:CHIARO;
    var m=document.querySelectorAll('meta[name="theme-color"]');
    if(!m.length){
      var n=document.createElement('meta');
      n.setAttribute('name','theme-color');
      n.setAttribute('content',c);
      document.head.appendChild(n);
      return;
    }
    for(var i=0;i<m.length;i++){m[i].setAttribute('content',c);}
  }
  barra();
  new MutationObserver(barra).observe(h,{attributes:true,attributeFilter:['data-theme']});
}catch(e){}})();`

export function ThemeInitializer() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }}
    />
  )
}
```

- [ ] **Step 4: Lancia il test e verifica che passi**

```bash
npx vitest run tests/unit/colore-barra-sistema.test.ts
```

Atteso: **PASS**, 12 test verdi (5 di Task 1 + 7 nuovi).

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/ThemeInitializer.tsx tests/unit/colore-barra-sistema.test.ts
git commit -m "feat(tema): la barra di stato segue il tema dal vivo

Lo script inline, che gira prima della prima pittura, imposta il colore
della barra e installa un MutationObserver su data-theme di <html>:
copre ogni scrittore di tema presente e futuro senza patchare i chiamanti
uno per uno (admin-nav scrive solo l'attributo, mai la classe).

La condizione e' 'dark' ? scuro : chiaro perche' ds-v3-catalogo RIMUOVE
l'attributo, e assente significa chiaro. Scritta al contrario, quella
pagina si prenderebbe una barra scura in tema chiaro.

SCRIPT_TEMA e' esportato perche' il test esegua esattamente il codice che
gira in produzione, invece di una sua riscrittura.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: `layout.tsx` smette di dichiarare il colore

**Files:**
- Modify: `src/app/layout.tsx:27-34`
- Test: `tests/unit/colore-barra-sistema.test.ts` (si aggiunge un `describe`)

**Interfaces:**
- Consumes: niente dai task precedenti
- Produces: nessuna interfaccia — rimuove `viewport.themeColor`, così nell'app esiste **un solo** `theme-color`, creato dallo script

- [ ] **Step 1: Scrivi il test che fallisce**

Aggiungi in coda a `tests/unit/colore-barra-sistema.test.ts`:

```typescript
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('layout.tsx — nessun theme-color posseduto da React', () => {
  const sorgente = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf-8')

  it('l_export viewport non dichiara themeColor', () => {
    const blocco = sorgente.slice(
      sorgente.indexOf('export const viewport'),
      sorgente.indexOf('export default function RootLayout'),
    )

    expect(blocco).not.toContain('themeColor')
  })

  it('non contiene piu il rosso della barra', () => {
    expect(sorgente).not.toContain('#D90012')
  })

  it('conserva viewportFit cover, che serve alla PWA', () => {
    expect(sorgente).toContain("viewportFit: 'cover'")
  })

  it('non tocca statusBarStyle di Apple, che e un altra piattaforma', () => {
    expect(sorgente).toContain("statusBarStyle: 'default'")
  })
})
```

- [ ] **Step 2: Lancia il test e verifica che fallisca**

```bash
npx vitest run tests/unit/colore-barra-sistema.test.ts
```

Atteso: **FAIL** su due test — `l_export viewport non dichiara themeColor` e `non contiene piu il rosso della barra`.

- [ ] **Step 3: Rimuovi la riga**

In `src/app/layout.tsx`, l'export `viewport` passa da:

```typescript
export const viewport: Viewport = {
  themeColor: '#D90012',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}
```

a:

```typescript
// Nessun themeColor qui: il colore della barra di stato lo imposta lo script
// inline di ThemeInitializer, che gira prima della prima pittura e lo tiene
// allineato al tema risolto. Dichiararlo anche qui creerebbe un secondo
// theme-color posseduto da React, rimontabile a ogni navigazione.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}
```

- [ ] **Step 4: Lancia il test e verifica che passi**

```bash
npx vitest run tests/unit/colore-barra-sistema.test.ts
```

Atteso: **PASS**, 16 test verdi.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx tests/unit/colore-barra-sistema.test.ts
git commit -m "feat(tema): via themeColor dall'export viewport

Cosi' nell'app esiste UN SOLO meta theme-color, creato dallo script inline
e da nessun altro. React non ne possiede piu' nessuno, quindi il rimontaggio
su navigazione client-side e' impossibile per costruzione, non improbabile.

Senza JS resta il fallback naturale: nessun meta, e Chrome usa il theme_color
del manifest.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Verifica completa (BP-2 FASE 7)

**Files:** nessuno — è un cancello, non una modifica.

**Interfaces:**
- Consumes: tutto quanto sopra
- Produces: l'evidenza che serve per decidere il merge

- [ ] **Step 1: TypeScript**

```bash
npx tsc --noEmit
```

Atteso: **nessun output** (zero errori). ⚠️ Se compare `TS1381`, è un backtick finito in un commento dentro `SCRIPT_TEMA`: sostituirlo con apici singoli.

- [ ] **Step 2: Suite completa**

```bash
npx vitest run
```

Atteso: **3306 passed / 19 skipped** o più (erano 3290 + 16 nuovi). Zero falliti. Riporta il numero **reale**, mai quello scritto qui.

- [ ] **Step 3: Build di produzione**

```bash
npx next build
```

Atteso: build completata senza errori.

- [ ] **Step 4: Verifica a occhio dell'HTML emesso**

```bash
npx next start -p 3020 -H 0.0.0.0
```

In un'altra shell:

```bash
curl -s http://localhost:3020/login | grep -o 'theme-color[^>]*' | head -5
```

Atteso: **nessuna riga** — il meta non è nell'HTML servito, perché lo crea lo script a runtime. Se comparisse un `theme-color` con `#D90012`, l'export `viewport` non è stato ripulito davvero.

⚠️ Ferma il server quando hai finito.

- [ ] **Step 5: Commit di chiusura, se ci sono residui**

```bash
git status --porcelain
```

Se pulito, non commettere nulla. Se ci sono residui non intenzionali, valutarli prima di aggiungerli.

---

### Task 5: Merge, deploy e prova sul device — 🛑 RICHIEDE L'OK DI FRANCESCO

**Files:** nessuno.

🛑 **Non eseguire questo task senza un via libera esplicito di Francesco.** Il merge pubblica in produzione, ed è lui a dover fare la prova.

- [ ] **Step 1: Merge su `main` e push**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
git checkout main
git merge --no-ff worktree-un-tema-solo
git push origin main
```

- [ ] **Step 2: Attendi CI e deploy verdi, e verifica il sito**

Non procedere finché `uachelab.com` non serve la versione nuova.

- [ ] **Step 3: Consegna a Francesco il protocollo di prova**

🛑 **La prova vale SOLO su Android, con l'app INSTALLATA dall'icona** (device di Francesco: Android 16, Chrome 150). Le altre combinazioni misurano cose diverse e darebbero un verdetto inutilizzabile:
- **scheda del browser** su Android → `theme-color` tinge la barra dell'**indirizzo**, non quella di stato;
- **iPhone in standalone** → la barra segue `apple-mobile-web-app-status-bar-style`, **non** `theme-color`: un falso negativo garantito su codice Android corretto.

Cinque passi, **in quest'ordine**:

1. **Chiudi UÀ dai recenti** (o forza arresto). Senza questo Android ripristina il task, il documento vecchio resta vivo, non arriva nessun HTML nuovo: falso negativo garantito.
2. Apri l'app e **riferisci il colore della barra in cima**.
3. 🛑 **Con la sessione aperta, DA DENTRO L'APP** (mai dalla schermata di accesso), tocca l'interruttore chiaro/scuro e **riferisci se la barra cambia dal vivo**. È l'osservazione decisiva.
   **Dove si trova, verificato:** la home **non** ha il sole/luna in testata (non monta `AppHeader`). L'interruttore è nel **pannello del profilo** — avatar in alto a destra → voce **«Tema»** (`UserProfileSheet.tsx:243`, montato in `(app)/layout.tsx:78`, quindi presente su tutte le pagine dell'area app).
   **Perché non dal login:** in questa tappa il suo sole/luna muta solo stato React e non scrive `data-theme`, quindi l'osservatore non scatta e la barra non si muove **per costruzione**. Premerlo lì produrrebbe la frase «non cambia» che questo intero rollout esiste per non farsi dire per sbaglio.
   ⚠️ Il pannello del profilo copre parte dello schermo: guardare **la striscia in cima**, che resta visibile.
4. Naviga fra due pagine e **riferisci se la barra regge**.
5. 🛑 **Non giudicare dallo splash, e nemmeno dal primo mezzo secondo.** In questa tappa il manifest è ancora `#D90012`, quindi **al lancio la barra è rossa per definizione**, per il tempo che la pagina impiega a dipingere — poi diventa del colore giusto. Un revisore ha classificato questo come il rischio **più alto** di referto sbagliato: chi guarda di sfuggita, o fa lo screenshot al lancio, vede rosso su codice corretto. Vale anche per la **scheda nel selettore app**, che resta rossa finché Android non rigenera il pacchetto.

- [ ] **Step 4: Registra l'esito**

| Esito | Significato | Cosa segue |
|---|---|---|
| La barra cambia dal vivo | Il meta **è** onorato nelle PWA installate su Android — la lacuna documentale del §3.3 della ricerca è chiusa **empiricamente** | Tappa 2 come da spec |
| Il colore cambia all'apertura ma **non** al tocco | Il meta è letto una volta per navigazione | Tappa 3 prima della 2: con «Automatico» predefinito i due meta con `media` diventano corretti |
| La barra resta rossa | Il meta **non** è onorato: comanda solo il manifest | Tappa 2 direttamente, e la barra non seguirà il tema — decisione da rifare con Francesco |

Scrivi l'esito nel §6 dello spec e in `memory/MEMORY.md` (BP-1), con la data e la frase esatta riferita da Francesco.

---

## Self-Review

**Copertura della spec (tappa 1).** §5.1 modulo senza hex → Task 1. §5.2 upsert → Task 1 (TS) e Task 2 (script). §5.3 rimozione `themeColor` → Task 3. §5.4 observer con la trappola del `removeAttribute` → Task 2, step 1 e 3. §6 protocollo di prova con il vincolo «da dentro l'app» → Task 5. §7.1 punti 2, 4 e 5 della guardia (niente hex, niente `themeColor`, script che interpola) → Task 2 e 3. §7.4 punti 12 e 14 (comportamento in jsdom, upsert che crea) → Task 1 e 2.

**Fuori da questa tappa, per costruzione:** `manifest.json`, `offline.html`, i tre stati, la bonifica dei punti di accesso, il censimento §7.3. Sono tappa 2 e 3.

**Segnaposto:** nessuno. Ogni step che tocca codice mostra il codice per intero.

**Coerenza dei nomi:** `COLORE_BARRA`, `TemaRisolto`, `impostaColoreBarra`, `SCRIPT_TEMA` sono usati con la stessa grafia in tutti i task e nei test.

**Nota sui test:** gli apostrofi nei nomi dei test sono resi con un trattino basso (`l_export`, `ce n_e`) per non doversi preoccupare dell'escaping dentro stringhe già ricche di apici. È una scelta di leggibilità, non un vincolo tecnico.
