# A4 — Cache Versioning Automatico Service Worker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sostituire il bump manuale del nome cache nel Service Worker (`ua-v1 → ua-v2`) con un versioning automatico legato all'identità del build, così che ogni deploy invalidi da solo la cache del deploy precedente.

**Architecture:** `public/sw.js` diventa un file generato (gitignored). Il sorgente vero è `scripts/sw-template.js`, con un placeholder `__BUILD_ID__` al posto del nome cache letterale. Uno script Node (`scripts/generate-sw.mjs`) risolve un build-id (Vercel env var → git sha locale → timestamp di fallback, oppure `'dev'` fisso in sviluppo) e scrive `public/sw.js` sostituendo il placeholder. Lo script gira automaticamente via i lifecycle hook npm `prebuild`/`predev`.

**Tech Stack:** Node.js ESM (`.mjs`), nessuna nuova dipendenza npm. Test con Vitest (già in uso nel progetto).

## Global Constraints

- Nessuna nuova dipendenza npm da installare — solo moduli core Node (`node:fs`, `node:child_process`, `node:path`, `node:url`).
- Il comportamento di `fetch`/`install`/`activate`/push notification esistente in `sw.js` NON cambia — solo la riga `CACHE_NAME` diventa dinamica.
- Nessuna pulizia/TTL della cache va aggiunta — esplicitamente fuori scope (vedi spec §1 e §5).
- Ogni fallback nella risoluzione del build-id deve essere "safe": nessun passo può far fallire la build con un'eccezione non gestita.
- `npx tsc --noEmit`, `npx vitest run`, `npx next build` devono restare puliti (0 errori) ad ogni task che li tocca.

---

## File Structure

| File | Responsabilità |
|---|---|
| `scripts/sw-template.js` (nuovo) | Sorgente di verità del Service Worker, tracciato in git. Identico all'attuale `public/sw.js` tranne il placeholder `__BUILD_ID__` nel nome cache. |
| `scripts/generate-sw.mjs` (nuovo) | Espone `resolveBuildId()` (logica pura di risoluzione build-id, testabile via dependency injection) e `generateServiceWorker()` (legge il template, scrive `public/sw.js`). Include anche il blocco CLI (`--dev` flag) eseguito solo quando lo script è invocato direttamente. |
| `tests/unit/generate-sw.test.ts` (nuovo) | Test Vitest per `resolveBuildId()` e `generateServiceWorker()`. |
| `public/sw.js` (rimosso dal tracking git) | Diventa un artefatto generato — non più modificato a mano. |
| `.gitignore` (modificato) | Aggiunta riga `public/sw.js`. |
| `package.json` (modificato) | Aggiunti script `prebuild` e `predev`. |

---

### Task 1: Creare `scripts/sw-template.js`

**Files:**
- Create: `scripts/sw-template.js`

**Interfaces:**
- Produces: file statico con placeholder testuale `__BUILD_ID__` al posto del valore letterale del nome cache — usato da Task 2 (`generateServiceWorker`).

- [ ] **Step 1: Creare il file con il contenuto attuale di `public/sw.js`, sostituendo solo la riga del nome cache**

Contenuto esatto di `scripts/sw-template.js`:

```js
const CACHE_NAME = 'ua-__BUILD_ID__'
const PRECACHE = ['/offline.html', '/manifest.json']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  // Non cachare API routes
  if (url.pathname.startsWith('/api/')) return
  // Non cachare routes esterne
  if (url.origin !== self.location.origin) return
  // Non intercettare navigazione (SSR pages) — causava refresh loop su /dashboard
  if (request.mode === 'navigate') return
  // Non cachare bundle Next.js (cambiano ad ogni deploy)
  if (url.pathname.startsWith('/_next/')) return
  // Non cachare le fetch RSC di Next.js (router.refresh(), navigazione client-side,
  // prefetch dei Link): sono payload differenziali dei React Server Components, non
  // pagine HTML da servire offline. Next le marca esso stesso `Cache-Control:
  // no-cache, must-revalidate` e le distingue con l'header `RSC` — intercettarle qui
  // le serviva dalla cache stale-while-revalidate, causando UI non aggiornata dopo
  // ogni mutazione (POST/PATCH) finché non si ricaricava manualmente la pagina
  // (bug scoperto durante B2 — Contabilità Clienti, 03/07/2026).
  if (request.headers.has('RSC') || request.headers.has('Next-Router-State-Tree')) return

  e.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(c => c.put(request, clone))
          }
          return response
        })
        .catch(() => caches.match('/offline.html').then(r => r ?? new Response('Offline', { status: 503 })))

      return cached ?? networkFetch
    })
  )
})

// ---------------------------------------------------------------------------
// Push notifications — Task B7
// ---------------------------------------------------------------------------

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const { title = 'UÀ', body = '', url = '/' } = data

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-72.png',
      data: { url },
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const notifUrl = event.notification.data?.url ?? '/'
      for (const client of windowClients) {
        if (client.url.includes(notifUrl) && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(notifUrl)
    })
  )
})
```

- [ ] **Step 2: Verificare che il file sia identico a `public/sw.js` tranne la riga 1**

Run: `diff <(sed '1d' scripts/sw-template.js) <(sed '1d' public/sw.js)`
Expected: nessun output (nessuna differenza oltre alla prima riga)

- [ ] **Step 3: Commit**

```bash
git add scripts/sw-template.js
git commit -m "feat(sw): add sw-template.js as source of truth with build-id placeholder"
```

---

### Task 2: Creare `scripts/generate-sw.mjs` con `resolveBuildId()` (TDD)

**Files:**
- Create: `scripts/generate-sw.mjs`
- Test: `tests/unit/generate-sw.test.ts`

**Interfaces:**
- Consumes: nessuna dipendenza da altri task.
- Produces: `resolveBuildId({ isDev, env, execSyncFn }) → string` — usata da `generateServiceWorker` (Task 3) e testata direttamente qui. Precedenza: `isDev` → `'dev'`; altrimenti `env.VERCEL_GIT_COMMIT_SHA` troncato a 8 caratteri se presente; altrimenti `execSyncFn('git rev-parse --short=8 HEAD')` trimmata; altrimenti `String(Date.now())`.

- [ ] **Step 1: Scrivere i test per `resolveBuildId` (falliranno — la funzione non esiste ancora)**

Creare `tests/unit/generate-sw.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { resolveBuildId } from '../../scripts/generate-sw.mjs'

describe('resolveBuildId', () => {
  it('restituisce "dev" quando isDev è true, ignorando env e git', () => {
    const result = resolveBuildId({
      isDev: true,
      env: { VERCEL_GIT_COMMIT_SHA: 'deadbeef1234' },
      execSyncFn: () => {
        throw new Error('non deve essere chiamato in modalità dev')
      },
    })
    expect(result).toBe('dev')
  })

  it('usa VERCEL_GIT_COMMIT_SHA troncato a 8 caratteri quando presente', () => {
    const result = resolveBuildId({
      isDev: false,
      env: { VERCEL_GIT_COMMIT_SHA: 'deadbeef1234567890' },
      execSyncFn: () => {
        throw new Error('non deve essere chiamato se VERCEL_GIT_COMMIT_SHA è presente')
      },
    })
    expect(result).toBe('deadbeef')
  })

  it('usa git rev-parse quando VERCEL_GIT_COMMIT_SHA è assente', () => {
    const result = resolveBuildId({
      isDev: false,
      env: {},
      execSyncFn: () => 'a1b2c3d4\n',
    })
    expect(result).toBe('a1b2c3d4')
  })

  it('usa Date.now() come fallback quando git fallisce', () => {
    const before = Date.now()
    const result = resolveBuildId({
      isDev: false,
      env: {},
      execSyncFn: () => {
        throw new Error('not a git repository')
      },
    })
    const after = Date.now()
    const parsed = Number(result)
    expect(Number.isNaN(parsed)).toBe(false)
    expect(parsed).toBeGreaterThanOrEqual(before)
    expect(parsed).toBeLessThanOrEqual(after)
  })
})
```

- [ ] **Step 2: Eseguire i test e verificare che falliscano**

Run: `npx vitest run tests/unit/generate-sw.test.ts`
Expected: FAIL — `Cannot find module '../../scripts/generate-sw.mjs'` (il file non esiste ancora)

- [ ] **Step 3: Creare `scripts/generate-sw.mjs` con `resolveBuildId` implementata**

```js
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const TEMPLATE_PATH = resolve(ROOT, 'scripts/sw-template.js')
const OUTPUT_PATH = resolve(ROOT, 'public/sw.js')

export function resolveBuildId({ isDev = false, env = process.env, execSyncFn = execSync } = {}) {
  if (isDev) return 'dev'

  const vercelSha = env.VERCEL_GIT_COMMIT_SHA
  if (vercelSha) return vercelSha.slice(0, 8)

  try {
    const gitSha = execSyncFn('git rev-parse --short=8 HEAD', { encoding: 'utf-8' }).trim()
    if (gitSha) return gitSha
  } catch {
    // git non disponibile o non è un repository — si passa al fallback successivo
  }

  return String(Date.now())
}
```

- [ ] **Step 4: Eseguire i test e verificare che passino**

Run: `npx vitest run tests/unit/generate-sw.test.ts`
Expected: PASS — 4 test verdi

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-sw.mjs tests/unit/generate-sw.test.ts
git commit -m "feat(sw): add resolveBuildId with Vercel/git/timestamp fallback chain"
```

---

### Task 3: Aggiungere `generateServiceWorker()` a `scripts/generate-sw.mjs` (TDD)

**Files:**
- Modify: `scripts/generate-sw.mjs`
- Test: `tests/unit/generate-sw.test.ts`

**Interfaces:**
- Consumes: `resolveBuildId()` da Task 2 (stesso file).
- Produces: `generateServiceWorker({ isDev, templatePath, outputPath }) → string` (ritorna il buildId usato) — scrive il contenuto del template con `__BUILD_ID__` sostituito in `outputPath`. Usata dal blocco CLI (Task 4, stesso file).

- [ ] **Step 1: Aggiungere i test per `generateServiceWorker` (falliranno — la funzione non esiste ancora)**

Aggiungere in fondo a `tests/unit/generate-sw.test.ts` (dopo il blocco `describe('resolveBuildId', ...)` già presente):

```ts
import { mkdtempSync, writeFileSync as writeFileSyncNode, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { generateServiceWorker } from '../../scripts/generate-sw.mjs'

describe('generateServiceWorker', () => {
  it('scrive il file di output sostituendo il placeholder con il build id', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sw-gen-test-'))
    try {
      const templatePath = join(dir, 'sw-template.js')
      const outputPath = join(dir, 'sw.js')
      writeFileSyncNode(templatePath, "const CACHE_NAME = 'ua-__BUILD_ID__'\n")

      const buildId = generateServiceWorker({ isDev: true, templatePath, outputPath })

      expect(buildId).toBe('dev')
      expect(readFileSync(outputPath, 'utf-8')).toBe("const CACHE_NAME = 'ua-dev'\n")
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
```

Nota: i due import in cima al file (`resolveBuildId` e `generateServiceWorker`, entrambi da `'../../scripts/generate-sw.mjs'`) vanno uniti in un unico import — il file finale `tests/unit/generate-sw.test.ts` deve avere una sola riga `import { resolveBuildId, generateServiceWorker } from '../../scripts/generate-sw.mjs'` in cima, non due righe duplicate.

- [ ] **Step 2: Eseguire i test e verificare che il nuovo test fallisca**

Run: `npx vitest run tests/unit/generate-sw.test.ts`
Expected: FAIL — `generateServiceWorker is not a function` (o export mancante), gli altri 4 test di `resolveBuildId` restano PASS

- [ ] **Step 3: Aggiungere `generateServiceWorker` a `scripts/generate-sw.mjs`**

Aggiungere dopo la funzione `resolveBuildId` (già presente dal Task 2):

```js
export function generateServiceWorker({ isDev = false, templatePath = TEMPLATE_PATH, outputPath = OUTPUT_PATH } = {}) {
  const buildId = resolveBuildId({ isDev })
  const template = readFileSync(templatePath, 'utf-8')
  const output = template.replace('__BUILD_ID__', buildId)
  writeFileSync(outputPath, output, 'utf-8')
  return buildId
}
```

- [ ] **Step 4: Eseguire tutti i test e verificare che passino**

Run: `npx vitest run tests/unit/generate-sw.test.ts`
Expected: PASS — 5 test verdi (4 di `resolveBuildId` + 1 di `generateServiceWorker`)

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-sw.mjs tests/unit/generate-sw.test.ts
git commit -m "feat(sw): add generateServiceWorker to write public/sw.js from template"
```

---

### Task 4: Aggiungere il blocco CLI a `scripts/generate-sw.mjs`

**Files:**
- Modify: `scripts/generate-sw.mjs`

**Interfaces:**
- Consumes: `generateServiceWorker()` da Task 3 (stesso file).
- Produces: comportamento eseguibile da riga di comando (`node scripts/generate-sw.mjs` e `node scripts/generate-sw.mjs --dev`) — usato da Task 5 (script npm `prebuild`/`predev`).

- [ ] **Step 1: Aggiungere il blocco CLI in fondo a `scripts/generate-sw.mjs`**

```js
const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
  const isDev = process.argv.includes('--dev')
  const buildId = generateServiceWorker({ isDev })
  console.log(`[generate-sw] public/sw.js generato con CACHE_NAME='ua-${buildId}'`)
}
```

- [ ] **Step 2: Eseguire lo script manualmente in modalità dev e verificare l'output**

Run: `node scripts/generate-sw.mjs --dev`
Expected output: `[generate-sw] public/sw.js generato con CACHE_NAME='ua-dev'`

Run: `grep "CACHE_NAME" public/sw.js`
Expected: `const CACHE_NAME = 'ua-dev'`

- [ ] **Step 3: Eseguire lo script manualmente in modalità build (senza `--dev`) e verificare l'output**

Run: `node scripts/generate-sw.mjs`
Expected output: `[generate-sw] public/sw.js generato con CACHE_NAME='ua-<8 caratteri hex>'` (hash reale dell'HEAD corrente, es. `ua-a1b2c3d4`)

Run: `grep "CACHE_NAME" public/sw.js`
Expected: `const CACHE_NAME = 'ua-<stesso hash>'`

- [ ] **Step 4: Ripristinare `public/sw.js` al contenuto tracciato in git (non ancora migrato, resta il file originale per ora)**

Run: `git checkout public/sw.js`
Expected: nessun output, `git status` non mostra più modifiche a `public/sw.js`

- [ ] **Step 5: Eseguire l'intera suite di test per verificare nessuna regressione**

Run: `npx vitest run`
Expected: tutti i test PASS (219 esistenti + 5 nuovi = 224)

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-sw.mjs
git commit -m "feat(sw): add CLI entry point to generate-sw.mjs with --dev flag"
```

---

### Task 5: Wiring npm + migrazione `public/sw.js` a file generato

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Untrack: `public/sw.js` (resta su disco, esce dal tracking git)

**Interfaces:**
- Consumes: `node scripts/generate-sw.mjs` / `node scripts/generate-sw.mjs --dev` da Task 4.
- Produces: nessuna interfaccia di codice — questo task è infrastrutturale (fine catena).

- [ ] **Step 1: Aggiungere gli script `prebuild` e `predev` a `package.json`**

Nel blocco `"scripts"` di `package.json`, aggiungere le due righe (posizione: prima di `"dev"` e prima di `"build"`, così è chiaro a cosa si riferiscono):

```json
  "scripts": {
    "predev": "node scripts/generate-sw.mjs --dev",
    "dev": "next dev",
    "prebuild": "node scripts/generate-sw.mjs",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:unit": "vitest run tests/unit",
    "test:unit:watch": "vitest tests/unit",
    "test:e2e": "playwright test",
    "test:coverage": "vitest run --coverage",
    "seed:e2e": "tsx scripts/seed-e2e.ts",
    "prepare": "husky"
  },
```

- [ ] **Step 2: Aggiungere `public/sw.js` a `.gitignore`**

In `.gitignore`, aggiungere una nuova sezione subito dopo il blocco `# === NEXT.JS ===` esistente in cima al file:

```
# === SERVICE WORKER GENERATO (vedi scripts/generate-sw.mjs) ===
# Sorgente vero: scripts/sw-template.js — public/sw.js viene rigenerato
# automaticamente da npm predev/prebuild, non va mai modificato a mano.
public/sw.js
```

- [ ] **Step 3: Rimuovere `public/sw.js` dal tracking git (il file resta su disco)**

Run: `git rm --cached public/sw.js`
Expected: `rm 'public/sw.js'`

- [ ] **Step 4: Rigenerare `public/sw.js` tramite lo script npm e verificare il contenuto**

Run: `npm run predev`
Expected output include: `[generate-sw] public/sw.js generato con CACHE_NAME='ua-dev'`

Run: `git status public/sw.js`
Expected: nessun output (il file è ora ignorato, `git status` non lo elenca più né come modificato né come untracked)

- [ ] **Step 5: Verificare che `npm run build` rigeneri correttamente `public/sw.js` con un build-id reale**

Run: `npm run build`
Expected: la build passa (`✓ Compiled successfully` o equivalente), e tra le prime righe di output compare `[generate-sw] public/sw.js generato con CACHE_NAME='ua-<8 caratteri hex>'`

Run: `grep "CACHE_NAME" public/sw.js`
Expected: `const CACHE_NAME = 'ua-<8 caratteri hex, uguale a git rev-parse --short=8 HEAD>'`

- [ ] **Step 6: Commit**

La rimozione di `public/sw.js` dal tracking è già staged dallo Step 3 (`git rm --cached`). Basta aggiungere le altre due modifiche e committare insieme:

```bash
git add package.json .gitignore
git commit -m "chore(sw): wire prebuild/predev hooks, untrack generated public/sw.js"
```

---

### Task 6: Verifica finale completa

**Files:**
- Nessun file nuovo — solo verifica end-to-end di tutto il lavoro dei Task 1-5.

**Interfaces:**
- Consumes: tutto il lavoro dei Task 1-5.
- Produces: conferma che l'intera pipeline (dev, build, test, tsc) funziona senza regressioni.

- [ ] **Step 1: Verificare TypeScript**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 2: Verificare l'intera suite di test**

Run: `npx vitest run`
Expected: tutti i test PASS (219 preesistenti + 5 nuovi di `generate-sw.test.ts` = 224)

- [ ] **Step 3: Verificare la build di produzione end-to-end**

Run: `rm public/sw.js && npm run build`
Expected: la build rigenera `public/sw.js` da zero (simulando un clone pulito dove il file gitignored non esiste ancora) e completa con successo

- [ ] **Step 4: Verificare il comportamento in dev**

Run: `rm public/sw.js && npm run predev`
Expected: `public/sw.js` rigenerato con `CACHE_NAME = 'ua-dev'`

- [ ] **Step 5: Confermare la copertura del fallback senza git**

Il fallback "git non disponibile → `Date.now()`" è già verificato dal test automatico scritto al Task 2 Step 1 (`'usa Date.now() come fallback quando git fallisce'`), che inietta un `execSyncFn` che lancia un'eccezione — non serve una controprova manuale separata, sarebbe una duplicazione. Rieseguirlo qui solo come conferma:

Run: `npx vitest run tests/unit/generate-sw.test.ts -t "fallback quando git fallisce"`
Expected: 1 test PASS

- [ ] **Step 6: Verifica finale di git status pulito**

Run: `git status`
Expected: working tree pulito (nessun file modificato non commesso, `public/sw.js` non compare essendo gitignored)

- [ ] **Step 7: Commit finale (se `Step 3`/`Step 4` hanno lasciato `public/sw.js` rigenerato sul disco, nessuna azione necessaria — è gitignored)**

Nessun commit necessario in questo task — è puramente di verifica. Se tutti gli step precedenti sono PASS, il piano è completo.

---

## Riepilogo copertura spec

| Sezione spec | Task |
|---|---|
| §2.1 Struttura file (`sw-template.js`, `generate-sw.mjs`, gitignore, package.json) | Task 1, 2, 3, 4, 5 |
| §2.2 Risoluzione build-id (Vercel → git → timestamp, `--dev` fisso) | Task 2, 4 |
| §2.3 Comportamento `activate` invariato | Task 1 (nessuna modifica alla logica, solo `CACHE_NAME`) |
| §2.4 Migrazione una tantum (git rm --cached, gitignore, rigenerazione) | Task 5 |
| §3 Testing/Verifica (dev, build, Vercel sim, fallback sim, tsc, vitest, next build) | Task 4, 5, 6 |
| §4 Rischi e mitigazioni (fallback mai crash, file opzionale al primo clone) | Task 2 (test fallback), Task 6 Step 3-4 (simulazione clone pulito) |
| §5 Fuori scope (TTL/pulizia) | Nessun task — correttamente escluso |
