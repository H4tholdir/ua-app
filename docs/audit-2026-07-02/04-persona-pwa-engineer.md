# Audit PWA — Prospettiva: Ingegnere PWA Mobile (RE-AUDIT)
**Data:** 2 luglio 2026 | **Versione app:** V1.8.x | **Auditor:** Senior PWA Engineer (10y React Native/Flutter/PWA)
**Baseline confrontata:** `docs/audit-2026-05-21/04-persona-pwa-engineer.md` (21 maggio 2026, score 7.8/10 → 78/100)
**Target dichiarato:** 9+/10

---

## Verdetto in una riga

**Score: 8.4/10 (84/100)** — in miglioramento da 7.8/10, **ma il target 9+/10 NON è raggiunto**: il bug più grave della baseline (Service Worker che non intercetta la navigazione) è **ancora presente, verificato empiricamente in produzione con Playwright**, e due dei tre problemi esplicitamente nominati nel task (SW navigate intercept, cache versioning statico) risultano irrisolti a 6 settimane dalla segnalazione.

---

## 1. Stato dei 3 problemi nominati nel task

| # | Problema (baseline 21/05) | Stato oggi | Evidenza |
|---|---|---|---|
| 1 | SW non intercetta la navigazione | ❌ **NON RISOLTO** | `/public/sw.js:30` — `if (request.mode === 'navigate') return` è ancora presente, identico alla baseline. Verificato in produzione: offline + hard navigation → `chrome-error://chromewebdata/` (errore nativo del browser), NON `/offline.html`. Verificato anche per client-side soft-navigation (click su `<Link>`): stesso fallimento. |
| 2 | Cache versioning statico (`ua-v1`) | ⚠️ **PARZIALMENTE NON RISOLTO** | `/public/sw.js:1` — `const CACHE_NAME = 'ua-v2'`. È stato incrementato manualmente da v1 a v2 (probabilmente ad hoc durante un deploy), ma **non è un build timestamp** e non c'è logica di TTL/rollout graduale come raccomandato nella baseline. Resta un numero hardcoded — il prossimo deploy richiederà un altro bump manuale o gli utenti resteranno bloccati sulla cache vecchia. |
| 3 | manifest.json theme_color sbagliato (#0F1E52 invece di #D90012) | ❌ **NON RISOLTO** | `/public/manifest.json:8` — `"theme_color": "#0F1E52"` confermato live (`curl https://uachelab.com/manifest.json`). Il mismatch con `viewport.themeColor = '#D90012'` in `src/app/layout.tsx:22` persiste. Anche `/public/offline.html` usa ancora `#0F1E52` — il brand rosso UÀ non appare mai nella cornice OS (barra di stato Android, splash Android) né nella pagina offline. |

**Sintesi:** dei 3 problemi specificamente richiamati dal task, **0 su 3 sono stati sistemati**. Questo è il dato più importante del re-audit.

---

## 2. Cosa è stato risolto dal 21 maggio (miglioramenti reali)

| Problema baseline | Stato | Evidenza |
|---|---|---|
| viewport-fit=cover mancante | ✅ **RISOLTO** | `src/app/layout.tsx:27` — `viewportFit: 'cover'`. Confermato live: `document.querySelector('meta[name="viewport"]').content` → `"...viewport-fit=cover"`. |
| Nessun splash screen iOS | ✅ **RISOLTO** | `src/app/layout.tsx:36-49` — 7 varianti `<link rel="apple-touch-startup-image">` per i device size principali, asset generati in `/public/splash/` via `scripts/generate-splash.mjs`. Confermato live: 7 link splash caricati nel DOM. |
| Safe-area-inset mancante su BottomNavPill | ✅ **RISOLTO** | `src/components/layout/BottomNavPill.tsx:402,442` — `bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))'` su entrambi gli stati del pill. |
| Nessun Web Push Notification | ✅ **RISOLTO** | `/public/sw.js:55-83` (handler `push` + `notificationclick`), `src/lib/notifications/push.ts` (VAPID + `web-push`), `src/components/features/notifications/PushRegistrar.tsx`. Architettura solida: lazy-init delle VAPID keys per non far crashare la build CI se mancanti. |
| Nessun aria-live per feedback | ✅ **PARZIALMENTE RISOLTO** | 5 file usano `aria-live` oggi contro 0 alla baseline. Non ho verificato la copertura completa di ogni toast, ma la direzione è corretta. |

Questi 5 fix sono reali e verificati sia da codice sia da comportamento live — è la parte positiva del re-audit.

---

## 3. Problemi residui — ranking per impatto PWA

### 🔴 1. Service Worker non intercetta la navigazione (CRITICO, invariato dalla baseline)
**File:** `/public/sw.js:29-30`
```javascript
// Non intercettare navigazione (SSR pages) — causava refresh loop su /dashboard
if (request.mode === 'navigate') return
```
**Test eseguito (Playwright, produzione, viewport 390×844):**
1. Visitate `/dashboard` e `/lavori` online → popolata cache `ua-v2` con richieste RSC (`_rsc=...`) e alcuni asset statici.
2. `context.setOffline(true)` → `page.goto('https://uachelab.com/lavori')` → **`net::ERR_INTERNET_DISCONNECTED`**, pagina finale `chrome-error://chromewebdata/`.
3. Stesso test con soft-navigation (click su `<a href="/lavori">` da `/dashboard` già caricata offline) → **stesso fallimento**, `chrome-error://chromewebdata/`.

**Perché è più grave di come descritto in baseline:** non chiamare `event.respondWith()` per le richieste `navigate` significa che il browser gestisce la richiesta con il suo comportamento di default. Offline, questo produce la **pagina di errore nativa di Chrome**, non `/offline.html`. La pagina offline custom del progetto (con branding UÀ e bottone "Riprova") **non viene mai mostrata per una navigazione reale** — è raggiungibile solo come fallback per fetch di asset statici falliti (riga 44), uno scenario molto meno comune.

**Nota positiva incidentale:** il SW cachea comunque le risposte RSC (`_rsc=...`) generate dal prefetch dei `<Link>` di Next.js, perché queste sono `fetch` con `mode` diverso da `navigate` e quindi non escluse dalla riga 30. Questo dato (verificato via `caches.open('ua-v2').then(c => c.keys())`, 60+ URL con payload RSC) mostra che l'infrastruttura di cache "funzionerebbe" se solo la riga 30 non facesse early-return sul caso più importante.

**Impatto business:** un tecnico che perde connessione in laboratorio (scenario realistico, molti capannoni con Wi-Fi debole) e prova a ricaricare `/lavori` per consultare lo stato di un lavoro già visto in giornata **vede la schermata di errore del browser**, non un'app che "funziona offline". Viola il principio fondante del progetto ("non deve preoccuparsi più di niente").

---

### 🟠 2. Nessun Background Sync — rischio perdita dati (invariato dalla baseline)
**File:** N/A — funzionalità assente (nessun `registration.sync`, nessun listener `sync` nel SW, nessuna coda IndexedDB in `src/lib`).

**Impatto:** identico a quanto segnalato il 21/05. Se un tecnico registra una consegna lavoro (`ConsegnaButton`) mentre la connessione cade a metà operazione, non c'è retry automatico né persistenza locale del payload: il dato va perso silenziosamente finché l'utente non nota che l'azione non è andata a buon fine. Per un dominio con obblighi MDR/tracciabilità (Allegato XIII), questo è un rischio di compliance oltre che UX.

---

### 🟠 3. Cache versioning statico + accumulo non controllato di payload RSC
**File:** `/public/sw.js:1`
```javascript
const CACHE_NAME = 'ua-v2'
```
**Problema doppio:**
- Nessun build timestamp iniettato: il bump `ua-v1 → ua-v2` è manuale, quindi ogni deploy futuro rischia di servire asset stale finché qualcuno non ricorda di incrementare la stringa a mano.
- La strategia cache-first della riga 34-48 mette in cache **ogni** richiesta GET same-origin non esclusa, incluse le centinaia di varianti RSC con query string `_rsc=<hash>` generate dal prefetch dei Link (osservate 60+ entry distinte in cache dopo pochi minuti di navigazione normale). Senza TTL né limite di entry, la cache cresce in modo illimitato e con voci quasi-duplicate (stessa route, hash RSC diverso) che non vengono mai invalidate finché non cambia `CACHE_NAME`.

**Fix minimo consigliato:** iniettare `process.env.NEXT_PUBLIC_BUILD_ID` (o timestamp) nel nome cache via uno step di build che riscrive `sw.js`, ed escludere le query string `_rsc=` dalla strategia di caching (o applicare uno stale-while-revalidate con limite di entry) per evitare crescita illimitata.

---

## 4. Osservazioni aggiuntive (fuori dal ranking top-3, ma rilevanti)

- **manifest.json theme_color mismatch** (`#0F1E52` vs `#D90012` in layout.tsx) — cosmetico ma visibile: barra di stato Android e schermata "aggiungi a home" mostrano ancora il blu vecchio brand invece del rosso UÀ. File: `/public/manifest.json:8`, `/public/offline.html` (meta theme-color).
- **Nessun Cache-Control immutabile per asset statici** — `curl -I https://uachelab.com/icons/icon-192.png` → `cache-control: public, max-age=0, must-revalidate`. Stesso comportamento su bundle `/_next/static/`. Raccomandazione baseline (Priority 3) non implementata in `next.config.ts` (nessuna regola `headers()` per `/icons/:path*` o `/_next/static/:path*`).
- **Lazy loading immagini non dichiarativo** — 4 tag `<img>` raw senza `loading="lazy"` sopravvivono in `src/components/features/lavori/form/TabImmagini.tsx:433` e `:592` (più `src/app/portale/[token]/page.tsx:357` e `RichiestaClientForm.tsx:250`). La maggioranza dell'app usa correttamente `next/image` (7 file), quindi la superficie del problema si è ridotta rispetto alla baseline ma non è a zero.
- **`will-change` per animazioni transform**: ancora 0 occorrenze nel codebase (`grep -rn willChange src` → nessun match). Raccomandazione Priority 1 (#4) della baseline non implementata.
- **Errore React hydration #418 ricorrente in produzione** (non-PWA, ma impatta Best Practices/CWV): visitando `/dashboard` in produzione, la console mostra ripetutamente `Minified React error #418` (mismatch testo server/client). Non è uno issue PWA in senso stretto, ma degrada l'affidabilità percepita e vale la pena segnalarlo al team frontend — non viene contato nello score PWA di questo audit.

---

## 5. PWA Score — Breakdown comparativo

| Area | Baseline 21/05 | Re-audit 02/07 | Δ | Nota |
|---|---|---|---|---|
| Core PWA (manifest + SW) | 85/100 | 78/100 | 🔻 -7 | Manifest ancora incoerente col brand; SW navigate intercept ancora rotto — il fix "facile" più volte segnalato non è mai stato applicato |
| Offline Experience | 65/100 | 60/100 | 🔻 -5 | Verificato empiricamente: navigazione offline produce errore nativo browser, non `/offline.html`. Nessun background sync |
| Installation (A2HS) | 72/100 | 88/100 | 🔺 +16 | viewport-fit=cover + splash iOS + safe-area risolti e verificati live |
| Web Push / Re-engagement | 0/100 (assente) | 90/100 | 🔺 +90 | Implementazione solida: VAPID lazy-init, push_subscriptions, notificationclick handler |
| Performance (CWV-relevant) | 72/100 | 75/100 | 🔺 +3 | Lazy loading ancora parziale, will-change assente, ma superficie ridotta (next/image su 7/11 immagini) |
| Accessibility | 88/100 | 90/100 | 🔺 +2 | aria-live introdotto (5 file) |
| Security | 92/100 | 92/100 | ─ | Invariato, nessuna regressione |

**Overall: 84/100 → 8.4/10**

La media pesata sale rispetto al 78/100 di baseline grazie a Web Push (nuovo, peso alto) e installazione iOS, ma **Core PWA e Offline Experience peggiorano relativamente** perché lo stesso identico bug critico continua a essere segnalato-e-ignorato mentre il resto dell'app avanza — il gap tra "quello che l'app promette" (installabile, offline-first) e "quello che l'app fa" (crash su navigazione offline) resta aperto.

**Perché non 9+:** il criterio discriminante per il target è "la navigazione offline funziona?" La risposta, verificata con test Playwright reali in produzione, è **no**. Non è possibile assegnare 9+/10 a una PWA il cui comportamento offline documentato (`/offline.html`, "La dashboard e la lista lavori sono disponibili se le hai visitate di recente") è **falso per ogni navigazione reale** — l'utente non vede mai quel messaggio, vede l'errore del browser.

---

## 6. Raccomandazione prioritaria unica

Se si può fare solo una cosa prima della prossima release: **applicare il fix già scritto nella baseline del 21/05** per `/public/sw.js:29-30` (branch `navigate` con `caches.match(request)` + fallback `/offline.html`, esattamente come proposto 6 settimane fa). È un fix di poche righe, a rischio basso, con impatto diretto sul principio fondante del prodotto ("dal momento in cui un odontotecnico inizia a usare UÀ, non deve preoccuparsi più di niente"). Il fatto che sia rimasto identico da maggio a luglio suggerisce che sia stato perso di vista tra le altre priorità (Web Push, splash screen) piuttosto che deliberatamente rimandato.

---

**Auditor:** Senior PWA Engineer
**Data:** 2 luglio 2026
**Metodo:** Ispezione codice (`sw.js`, `manifest.json`, `layout.tsx`, `next.config.ts`, `BottomNavPill.tsx`, `push.ts`) + test comportamentali Playwright in produzione (installabilità, offline hard-navigation, offline soft-navigation, viewport 390×844, cache introspection via `caches.keys()`) + verifica header HTTP live (`curl -I`).
