# A4 — Cache versioning automatico nel Service Worker

**Data:** 03 luglio 2026
**Backlog:** `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` — A4 (🟠 Alto, parzialmente risolto 03/07/2026)
**Stato:** In design → implementazione

---

## 1. Contesto

`public/sw.js` usa oggi `const CACHE_NAME = 'ua-v2'`, bumpato a mano ad ogni deploy che richiede l'invalidazione della cache (`ua-v1 → ua-v2`). La parte "escludere le fetch RSC dalla cache" di A4 è già stata risolta durante B2 (commit `7fc181b`) — le fetch RSC di `router.refresh()`/navigazione client-side non vengono più intercettate, eliminando la causa principale di crescita illimitata della cache (le "60+ varianti RSC" citate nel backlog originale).

**Scope di questo documento:** solo la parte rimasta aperta, ovvero automatizzare il bump del nome della cache legandolo all'identità del build, invece del bump manuale.

**Fuori scope (decisione presa in brainstorming):** nessuna pulizia/TTL delle entry in cache. Con le fetch RSC già escluse, ciò che resta cacheable è un set piccolo e fisso di asset statici di `public/` (manifest.json, icone, splash, offline.html) le cui chiavi (stessa URL ad ogni deploy) vengono sovrascritte, non accumulate — non c'è un problema reale di crescita da risolvere oggi (YAGNI).

---

## 2. Design

### 2.1 Struttura file

- **`scripts/sw-template.js`** (nuovo, tracciato in git) — sorgente di verità del Service Worker. Contenuto identico all'attuale `public/sw.js`, con l'unica modifica:
  ```js
  const CACHE_NAME = 'ua-__BUILD_ID__'
  ```
- **`scripts/generate-sw.mjs`** (nuovo, tracciato in git) — legge `scripts/sw-template.js`, sostituisce il placeholder `__BUILD_ID__` con l'id risolto (vedi §2.2), scrive il risultato in `public/sw.js`.
- **`public/sw.js`** — rimosso dal tracking git (`git rm --cached public/sw.js`), aggiunto a `.gitignore`. Diventa un artefatto generato, come `.next/` o `node_modules/`.
- **`package.json`** — nuovi script:
  ```json
  "prebuild": "node scripts/generate-sw.mjs",
  "predev": "node scripts/generate-sw.mjs"
  ```
  npm esegue automaticamente `prebuild` prima di `build` e `predev` prima di `dev` (lifecycle hook nativo, nessuna configurazione aggiuntiva).

### 2.2 Risoluzione del build-id

In `generate-sw.mjs`, con un flag `--dev` passato dallo script `predev` per distinguere il contesto:

```
se --dev:
  buildId = 'dev'
altrimenti (contesto build/prebuild):
  1. process.env.VERCEL_GIT_COMMIT_SHA troncato a 8 caratteri, se presente
  2. altrimenti: `git rev-parse --short HEAD` (via child_process execSync), se non lancia eccezioni
  3. altrimenti (nessun git disponibile, es. ambiente sandboxed): Date.now()
```

Risultato: `CACHE_NAME` = `ua-a1b2c3d4` in produzione (Vercel), `ua-<8 char sha locale>` per build locali, `ua-dev` in sviluppo.

Nessuna delle tre fonti deve mai far fallire la build: ogni passo è avvolto in modo che un errore penda al fallback successivo, mai un'eccezione non gestita.

### 2.3 Comportamento invariato

La logica esistente in `activate` (elimina tutte le cache con nome diverso dal `CACHE_NAME` corrente) resta identica:

```js
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})
```

Con un `CACHE_NAME` sempre diverso ad ogni deploy, questa logica ora purga automaticamente la cache del deploy precedente — sostituendo il bump manuale.

### 2.4 Migrazione una tantum

1. `git rm --cached public/sw.js`
2. Aggiungere `public/sw.js` a `.gitignore`
3. Copiare il contenuto attuale di `public/sw.js` in `scripts/sw-template.js`, applicando la sostituzione del placeholder
4. Verificare che `npm run dev` e `npm run build` rigenerino correttamente `public/sw.js` da zero (clone pulito o dopo `rm public/sw.js` manuale)

---

## 3. Testing / Verifica

- `npm run dev` (o `node scripts/generate-sw.mjs --dev` isolato) → `public/sw.js` generato con `CACHE_NAME = 'ua-dev'`
- `npm run build` in locale → `public/sw.js` generato con un hash breve reale (non il placeholder, non vuoto)
- Simulazione ambiente Vercel: `VERCEL_GIT_COMMIT_SHA=abc123def456 node scripts/generate-sw.mjs` → verifica che il valore venga troncato a 8 caratteri e usato
- Simulazione fallback: eseguire lo script in una directory senza `.git` e senza `VERCEL_GIT_COMMIT_SHA` → verifica che non lanci eccezioni e produca comunque un `CACHE_NAME` valido (branch timestamp)
- `npx tsc --noEmit` — nessuna regressione (lo script è `.mjs` non tipizzato, ma non deve rompere altri file)
- `npx vitest run` — nessuna regressione sui test esistenti
- `npx next build` — build production pulita con lo script prebuild integrato
- Verifica manuale Playwright/devtools: registrare il SW, controllare in Application → Cache Storage che il nome della cache corrisponda al build-id atteso

---

## 4. Rischi e mitigazioni

| Rischio | Mitigazione |
|---|---|
| Sviluppatore fa `git clone` fresco e lancia qualcosa senza mai eseguire `dev`/`build` | `public/sw.js` non esiste finché non si esegue uno dei due script — accettabile, il SW è opzionale per l'app (nessun path critico dipende dalla sua presenza al primo avvio) |
| `execSync('git rev-parse ...')` lancia in ambienti senza git nel PATH | Fallback a `Date.now()`, mai un crash della build |
| Qualcuno modifica a mano `public/sw.js` pensando sia il sorgente | File gitignored + commento in testa a `scripts/sw-template.js` che indica dove modificare davvero |

---

## 5. Fuori scope (esplicitamente, per chiarezza futura)

- Pulizia/TTL delle entry in cache — vedi §1, nessun problema reale da risolvere oggi
- Modifiche alla logica di `fetch`/`install`/push notification esistente in `sw.js` — invariate, solo la riga `CACHE_NAME` cambia
