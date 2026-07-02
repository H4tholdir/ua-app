# Audit Tecnico Sistematico — RE-AUDIT Follow-up

**Data:** 2026-07-02 | **Auditor:** Claude QA Systematic (re-audit) | **Baseline confrontato:** `docs/audit-2026-05-21/11-technical-systematic.md` (7.3/10)

---

## 0. Metodologia e nota ambientale

Il piano originale prevedeva verifica live via Playwright su https://uachelab.com per ≥15 pagine. Durante il tentativo, il browser MCP risultava condiviso con una sessione reale attiva (navigazioni impreviste verso `/portale/[token]`, `/richiedi/[token]`, login/logout non richiesti da questo agente) — confermato anche puntando un dev server locale isolato, che veniva comunque dirottato verso URL di produzione: si tratta quindi di un processo browser condiviso con un utente/monitor reale, non un bug applicativo. Per non contaminare l'audit con azioni di terzi, il browsing interattivo è stato interrotto dopo la conferma, e **un bug reale è comunque stato osservato dal vivo in produzione** (hydration error, vedi §2) prima dell'interruzione.

L'audit è proseguito con **verifica sistematica del codice sorgente** (stesso metodo usato nel baseline 2026-05-21, che era anch'esso code-based) su tutte le 31 pagine sotto `src/app/(app)/`, con lettura diretta di `page.tsx`, `loading.tsx`, `error.tsx` e dei componenti client principali per ciascuna, più cross-check su `src/design-system/tokens.ts`, `src/design-system/motion.ts` e `src/app/globals.css`. Dove utile, sono stati verificati anche i corrispondenti endpoint API per determinare se un'azione CRUD "vista in UI" ha un backend funzionante o è irraggiungibile/orfana.

---

## 1. Punteggio medio e confronto con baseline

| Metrica | Baseline 2026-05-21 | Re-audit 2026-07-02 | Target |
|---|---|---|---|
| **Punteggio medio (31 pagine)** | **7.3/10** | **6.5/10** | 9+/10 |
| Pagine senza loading skeleton | 18/31 (58%) | **~0-1/31** — coverage quasi totale (32 file `loading.tsx`) | 0 |
| Pagine senza error boundary dedicato | Coverage parziale, non sistematico | **31/31 con `error.tsx`** (33 file totali, incluso root) | 31/31 ✅ |
| DELETE visibile a livello pagina | 0/31 (0%) | **4/31** (magazzino/[id], listino, pazienti/[id], tecnici) | tutte le entità con lifecycle |
| Route CRUD che puntano a pagine inesistenti (404) | 0 note | **5 nuove** (vedi §3.2) | 0 |
| Bug di hydration confermati live | 0 noti | **1 confermato + 8 pattern a rischio identico** (vedi §2) | 0 |

**Il punteggio medio è SCESO di 0.8 punti rispetto al baseline, allontanandosi dal target 9+/10 anziché avvicinarsi.** La causa non è un arretramento nella qualità strutturale — anzi, la copertura loading/error è passata da parziale a quasi completa, un miglioramento netto e verificabile — ma il refactor Design System v2.3 (~170 file toccati) ha introdotto **una nuova classe di bug funzionali** (route CRUD che puntano a pagine mai create, un'entità intera irraggiungibile dalla UI, un hydration bug sistemico) che non esistevano nel baseline. In sintesi: **l'infrastruttura è migliorata, la correttezza funzionale è peggiorata.**

---

## 2. I 3 bug noti dal baseline — stato di risoluzione

| # | Bug | Stato | Evidenza |
|---|---|---|---|
| 1 | **"Invita tecnico" → `/impostazioni`** invece di flow dedicato | ❌ **NON RISOLTO** | `src/app/(app)/tecnici/page.tsx:49` (bottone header) e `:117` (CTA empty state) puntano entrambi ancora a `href="/impostazioni"`. Il commento originale `// Pulsante "Invita tecnico" nell'header — BUG #9` è ancora presente in riga 46. `/impostazioni/page.tsx` non contiene alcuna stringa "invita"/"invite". L'unico endpoint di invito esistente nel repo è `POST /api/admin/invite` (`src/app/api/admin/invite/route.ts:11-18`), protetto da `verifyAdmin()` che richiede `ruolo === 'admin_sistema'` — **riservato a Francesco, non al titolare del laboratorio**. Nessun flow dedicato (`/impostazioni/team`, `/tecnici/invita`, modal) è mai stato creato. |
| 2 | **Query subquery non supportata in `/ordini`** | ⚠️ **MITIGATO, non fixato** (tech debt residuo) | `src/app/(app)/ordini/page.tsx:109` esegue ancora `.lt('scorta_attuale', svc.from('magazzino').select('scorta_minima'))` — chiamata HTTP reale verso PostgREST ad ogni caricamento pagina, sempre errata/inefficiente. Il risultato viene scartato a riga 122 (`void articoliData // sopprimi warning`). Il valore corretto mostrato all'utente proviene dal fallback JS a righe 114-125 (carica fino a 500 articoli e filtra client-side). **Conclusione precisa: bug ancora presente come query morta/sprecata ad ogni page-load; l'output finale visto dall'utente è corretto solo grazie al fallback.** |
| 3 | **Error boundary coverage** (`grep -rl error.tsx src/app`) | ✅ **RISOLTO — miglioramento netto** | 33 file `error.tsx` (31 pagine `(app)` + root `(app)/error.tsx` + 1 orfano) tutti con contenuto reale: o `export { default } from '@/components/ui/ErrorPage'` (componente condiviso con `motion/react` + `motionTokens`, animazione corretta) o l'implementazione custom del root con bottoni "Riprova"/"Torna alla dashboard". Nessuno stub vuoto. Analogamente 32 file `loading.tsx`, quasi tutti skeleton reali (vedi §4.3 per i difetti di conformità DS trovati comunque). |

---

## 3. Nuovi bug critici (introdotti o scoperti in questo giro)

### 3.1 Hydration bug live in produzione — React error #418 su `/dashboard`

Osservato **dal vivo** in produzione (console error reale, non da codice): `Minified React error #418` (mismatch testo SSR/CSR) al caricamento di `/dashboard`.

**Causa confermata:** `src/components/features/dashboard/DashboardTitolare.tsx:114-119`
```ts
function getGreeting(): string {
  const h = new Date().getHours()
  if (h >= 6 && h < 12) return 'Buongiorno'
  if (h >= 12 && h < 17) return 'Buon pomeriggio'
  return 'Buonasera'
}
```
usata a riga 886 (`{getGreeting()}, {nomeUtente}`). Il server Vercel gira in UTC, il client in Europe/Rome (UTC+2 in estate): tra le **12:00 e le 13:59 ora locale**, il server (ancora 10:00-11:59 UTC, `h<12`) produce "Buongiorno" mentre il client produce "Buon pomeriggio" → mismatch testuale garantito ogni giorno in quella fascia. Nessun `useEffect`/`useState` di mitigazione, nessun `suppressHydrationWarning`.

**Non è un caso isolato — 9 occorrenze dello stesso pattern (`new Date()` in rendering server-first) trovate:**

| File:riga | Funzione | Rischio |
|---|---|---|
| `DashboardTitolare.tsx:107-108` | `formatData` (label oggi/domani) | Reale |
| `DashboardTitolare.tsx:114-119` | `getGreeting` — **causa confermata #418** | Reale |
| `DashboardTitolare.tsx:632` | `toLocaleDateString` in `FatturatoSection` | Reale |
| `DashboardTitolare.tsx:883` | `toLocaleDateString('it-IT',{weekday:'long'...})` | Reale |
| `DashboardTecnico.tsx:86-92,167` | `getDataOggi`, nessuna mitigazione | Reale |
| `DashboardTecnico.tsx:262-269` | stessa funzione ma con `suppressHydrationWarning` — **incoerente**: la stessa funzione è usata senza protezione ~100 righe sopra | Band-aid parziale |
| `SpotlightCard.tsx:37-46` | `formatOra`, diff giorni | Reale |
| `TaskItem.tsx:47-54` | label oggi/domani | Reale |
| `AnnullaConsegnaBanner.tsx:16-19` (usato in `lavori/[id]/page.tsx`) | countdown `Date.now() - new Date(...)` | Reale, quasi garantito anche solo per lo scarto di tempo server→hydrate |
| `DashboardTitolare.tsx:677-683` / `DashboardShell.tsx:32-36` | `useState` lazy init che legge `localStorage.getItem('ua-dashboard-view')` | Reale per utenti con preferenza salvata (contenuto diverso tra render server e client) |

Innocuo per confronto: `LavoroUrgente.tsx:34-40`, `LavoroCard.tsx:280`, `LavoroTimeline.tsx:40` formattano date **fisse dal DB**, non "adesso" — round-trip simmetrico, non hydration bug.

Nota collaterale (bug di correttezza dati, non hydration): `agenda/page.tsx:74-78` e `dashboard/page.tsx:117` calcolano "oggi" con `new Date().toISOString().split('T')[0]` in **UTC** su un Server Component puro — può includere/escludere un giorno di appuntamenti/consegne nella fascia oraria vicino alla mezzanotte italiana.

**Conclusione:** debito sistemico introdotto/non risolto nel refactor, non un incidente isolato. Il pattern corretto (`useState(null)` + valorizzazione in `useEffect`, o `suppressHydrationWarning` mirato) non è mai stato applicato in modo coerente.

### 3.2 Route CRUD che puntano a pagine inesistenti (404 garantiti)

| File:riga | Link | Route di destinazione | Esiste? |
|---|---|---|---|
| `src/app/(app)/magazzino/page.tsx:71` | CTA empty-state "aggiungi articolo" | `/magazzino/nuovo` | ❌ Non esiste — cade nella dynamic route `[id]` con `id="nuovo"`, query fallisce, redirect a `/magazzino`. **Create magazzino impossibile da UI** nonostante `POST /api/magazzino` funzioni. |
| `src/app/(app)/listino/page.tsx:51` | Bottone "Nuova voce" | `/listino/nuovo` | ❌ Non esiste. `POST /api/listino` funziona ma è irraggiungibile da UI. |
| `src/app/(app)/qualita/rischi/page.tsx:175` | Link "Modifica →" | `/qualita/rischi/[id]` | ❌ Directory `qualita/rischi/[id]/` non esiste. |
| `src/app/(app)/rete/page.tsx:149` | CTA empty-state "Crea rete" | `/rete/nuova` | ❌ Route inesistente. |
| `src/app/(app)/rete/page.tsx:277` | Link "Gestisci rete →" | `/rete/[id]` | ❌ Route inesistente. |

Cinque 404 concreti raggiungibili con un solo click da utenti reali, su funzionalità CREATE/UPDATE presentate come disponibili in UI.

### 3.3 Entità irraggiungibile dalla UI — pazienti

**BUG CRITICO, già taggato ma mai risolto nel codice:** `src/components/features/pazienti/PazientiSearchList.tsx:164-219` — ogni riga della lista è un `<li><div>` semplice, **senza `Link`/`href`/`onClick`** (a differenza di `ClientiSearchList.tsx:151-253`, che usa correttamente `<Link href={\`/clienti/${cliente.id}\`}>`). Risultato: `pazienti/[id]/page.tsx` esiste, ha R/U/D funzionanti, ma **è irraggiungibile da qualunque punto della UI** (zero occorrenze di `pazienti/${` in tutto `src/`). Il commento `src/app/(app)/pazienti/page.tsx:66`: `/* Search + lista lato client — BUG #13 */` conferma che il problema è noto internamente da tempo e non è mai stato corretto.

### 3.4 Feature "morta" — pagine orfane e feature irraggiungibili

- `src/app/(app)/qualita/incidenti/nuovo/page.tsx` — form di creazione incidente MDR **funzionante** (POST reale, validazione, era valutato 9/10 nel baseline) ma **nessun link nell'app punta a questa route** (`grep -rn "incidenti/nuovo" src/app` non trova riferimenti); raggiungibile solo digitando l'URL a mano.
- `src/app/(app)/tecnici/[id]/{loading,error}.tsx` esistono ma **non esiste `tecnici/[id]/page.tsx`** — file morti, nessuna pagina da coprire.
- `src/app/(app)/qualita/incidenti/error.tsx` orfano — nessun `page.tsx`/`loading.tsx` nella stessa cartella.

### 3.5 Fornitori API mancante — blocca creazione ordini

`src/components/features/ordini/NuovoOrdineSheet.tsx:122-125` — `fetch('/api/fornitori')` verso una route **inesistente nel repo** (verificato: nessun `src/app/api/fornitori/`). L'errore è ingoiato da `.catch(() => {})` con fallback silenzioso `{ fornitori: [] }`. Risultato: il select "Fornitore" nel form nuovo ordine è **sempre vuoto** in produzione, e i bottoni di invio ordine via WhatsApp/Email sono **sempre disabilitati**. Solo "Salva come bozza" funziona.

### 3.6 Altri gap CRUD

- **Nessun DELETE/archivio per clienti**: `src/app/api/clienti/[id]/route.ts` espone solo `GET`/`PATCH`, nessun `DELETE`; non esiste `ClienteArchiviaButton` (a differenza di `PazienteArchiviaButton.tsx`, che esiste).
- **Nessun DELETE a livello pagina per lavori**: solo transizioni di stato, nessuna cancellazione/archiviazione esposta.
- **UPDATE magazzino assente da UI**: né `MagazzinoSearchList.tsx` né `magazzino/[id]/page.tsx` hanno un trigger di modifica, pur esistendo `PATCH /api/magazzino/[id]`.
- **`fatture/[id]/page.tsx`**: nessuna azione (niente segna-pagata, niente download PDF/XML — `pdf_url` caricato a riga 22 ma mai usato in JSX). L'azione "segna pagata" esiste solo da `scadenzario/[cliente_id]` — incoerenza di superficie funzionale sulla stessa entità.
- **`src/app/api/ordini/[id]/route.ts`**: nessun handler DELETE; nessuna UI per annullare/evadere un ordine dopo la creazione.
- **Agenda 100% read-only**: nessun link dagli item verso il lavoro collegato (`agenda/page.tsx:181-301`, ogni item è un `<div>` non cliccabile), empty state senza CTA.

---

## 4. Regressioni Design System v2.3 (~170 file toccati)

### 4.1 Colore esplicitamente bandito in produzione — `#1B2D6B`

CLAUDE.md vieta esplicitamente: *"❌ MAI gradiente viola-blu · MAI `#1B2D6B` come background"*. Trovato **come background** (non solo testo) in:

- **`src/components/features/lavori/LavoroCard.tsx:682`** — `background: 'var(--cobalt, #1B2D6B)'` sulla progress-bar di **ogni card lavoro non ancora al 100%** nella pagina più visitata dell'app (`/lavori`). `--cobalt` non è definito né in `globals.css` né in `tokens.ts`, quindi il fallback banned è sempre quello effettivamente renderizzato.
- Stessa var-fantasma anche in `src/app/(app)/qualita/page.tsx:312` (come testo, badge "Segnalato Ministero"), `ToastNotifiche.tsx:26`, `OdontogrammaFDI.tsx:52-55,701,982`.

### 4.2 `--gold #D4A843` usato come testo (vietato esplicitamente due volte)

CLAUDE.md: *"❌ MAI `--gold:#D4A843` come testo (contrasto 1.6:1 ❌)"*; `globals.css:77` stesso commento: `/* CTA cerimoniale... MAI come testo */`. Violato in:

- `src/app/(app)/qualita/page.tsx:21` (`gravitaColor.lieve`), applicato come `color` a riga 293.
- `src/app/(app)/qualita/psur/page.tsx:28` (`STATO_COLOR.bozza`), applicato come `color` a riga 194.
- `src/app/(app)/rete/page.tsx:21` (`PIANO_COLOR.lab`), applicato come `color` a riga 247.
- `src/app/(app)/analytics/page.tsx:210,230` — `accent="#D4A843"` su KPI numerici.
- `src/components/features/ordini/OrdiniList.tsx:13,240` — badge stato "inviato".

### 4.3 Skeleton non conformi a `motion.ts` — sistemico, ~14 file

`motionTokens.duration.skeleton = 1.50` (1500ms) da `motion.ts`, ma **quasi tutti** i `loading.tsx` custom usano `animation: 'ua-skeleton-pulse 1.4s ease-in-out infinite'` hardcoded — valore diverso, non importato dal token. Riscontrato in: `tecnici`, `impostazioni`, `rete`, `qualita`, `clienti`, `pazienti`, `agenda`, `dashboard`, `fatture`, `scadenzario`, `magazzino`, `listino`, `analytics`, `lavori`. Gli skeleton che usano i componenti condivisi `SkeletonList`/`SkeletonCard` sono invece conformi.

**Stessi file** usano `background: 'linear-gradient(90deg, #E4DFD9 25%, #EDEDEA 50%, #E4DFD9 75%)'` **senza `var()`** — colori light hardcoded, nessuna variante dark: in dark mode lo skeleton lampeggia chiaro su sfondo scuro, violazione diretta di "sempre entrambi i temi" (CLAUDE.md §7). Unico file quasi corretto: `qualita/loading.tsx` (usa `var(--sfc)`/`var(--elv)` ma ancora `1.4s` invece di `1.50s`).

### 4.4 Palette semantica a sistemi paralleli discordanti

`globals.css` mantiene contemporaneamente un set "legacy" (`--success:#16A34A`, `--info:#2563EB`, `--amber:#FD7E14`, `--warning:#B45309`, `--gold:#D4A843`, `--purple:#7C3AED`) e il nuovo set v2.3 "rainbow" (`--c-blue:#3B82F6`, `--c-green:#22C55E`, `--c-amber:#F59E0B`, `--c-orange`, `--c-red`, `--c-purple`, coincidenti con `tokens.ts`). La maggior parte delle pagine business (`fatture`, `qualita`, `rete`, `tecnici`, `agenda`, `analytics`, `clienti`, `lavori/consegna`, `pazienti`, `impostazioni`, `ordini`) usa ancora **quasi esclusivamente le variabili legacy**, in alcuni casi mischiando le due nello stesso file/oggetto (es. `qualita/psur/page.tsx:108` usa `--amber` a due righe da `--c-amber` a riga 117 nello stesso alert box; `rete/page.tsx` mischia `--gold` legacy e `--success` nello stesso `Record`). Indica che la migrazione DS v2.3 ha toccato molti file a livello di componenti condivisi, ma **non ha migrato la maggior parte delle pagine `(app)/` alla palette semantica ufficiale**.

`clienti/[id]/page.tsx:197` usa `var(--amber, #FD7E14)` (valore v2.2) mentre `ClientiSearchList.tsx:227` nello stesso modulo usa correttamente `var(--c-amber, #F59E0B)` — incoerenza diretta all'interno dello stesso feature.

### 4.5 Altri hardcoded non theme-aware (rompono il dark mode)

- `DashboardFrontDesk.tsx:18,456` — `'#D90012'` hardcoded diretto (mai `#E8001A` in dark).
- `ProduttivitaTecnico.tsx:169` — `fill={isCorrente ? '#D90012' : ...}`, stesso problema su grafico SVG.
- `magazzino/[id]/page.tsx:61,72`, `MagazzinoDeleteButton.tsx:47-49`, `ScadenzarioList.tsx:40,380`, `ListinoVoceRow.tsx:400` — `#D90012`/`#16A34A` hardcoded.
- `impostazioni/profilo/page.tsx:90` — messaggio esito con colori hex diretti invece di `var(--success)`/`var(--primary)`.
- Bug copy-paste: `boxShadow: 'var(--sh-b, var(--sh-b))'` — fallback auto-referenziale privo di senso, trovato sia in `analytics/page.tsx:101` sia in `listino/page.tsx:91,126`.

### 4.6 Altri difetti minori

- `qualita/incidenti/nuovo/page.tsx:192` — `colorScheme: 'dark'` hardcoded su un `<input type="date">`, indipendente dal tema attivo: in light mode il date-picker nativo appare scuro/incoerente.
- `onboarding/wizard.tsx` — nessuna transizione tra step (switch puro, niente `AnimatePresence`), nonostante `motion.ts` definisca `storytellingVariants.onboardingStep` proprio per questo caso.
- Anti-pattern UX residuo: `window.confirm()`/`alert()` nativi invece di componenti custom in `TecnicoDeactivateButton.tsx:17`, `TecnicoEditInline.tsx:30,50`, `MagazzinoDeleteButton.tsx:16,25,29`.
- Next.js 16.2.6 segnala in dev: *"The 'middleware' file convention is deprecated. Please use 'proxy' instead"* — `src/middleware.ts` da migrare (non bloccante, solo tech debt).

---

## 5. Tabella completa per pagina (31/31)

| # | Pagina | CRUD pagina | Empty | Loading | Error | Score | Δ vs baseline |
|---|---|---|---|---|---|---|---|
| 1 | `/lavori` | C/R/U(inline assegna-stato-priorità)/**D❌** | ✅ CTA | ✅ vero skeleton | ✅ | **8/10** | = |
| 2 | `/lavori/nuovo` | C puro, validato | N/A | ⚠️ delega SkeletonList | ✅ | **7.5/10** | -1.5 (skeleton generico) |
| 3 | `/lavori/[id]` | R/U, **D❌** | ⚠️ notFound() | ⚠️ delega | ✅ | **8/10** | = |
| 4 | `/lavori/[id]/consegna` | U (gate MDR) | ✅ | ⚠️ delega | ✅ | **8.5/10** | +0.5 |
| 5 | `/clienti` | C/R, U/D delegati | ✅ CTA | ⚠️ non conforme DS | ✅ | **6.5/10** | -0.5 |
| 6 | `/clienti/[id]` | R/U, **D❌ (no API)** | N/A | ✅ conforme | ✅ | **7/10** | = |
| 7 | `/pazienti` | **R rotto** (lista non naviga) | ✅ CTA | ⚠️ non conforme | ✅ | **3.5/10** | **-3.5 CRITICO** |
| 8 | `/pazienti/[id]` | R/U/D presenti ma **irraggiungibile** | N/A | ✅ conforme | ✅ | **6/10** | = |
| 9 | `/dashboard` | R only (corretto) | ⚠️ CTA incoerenti | ✅ skeleton | ✅ | **5.5/10** | **-2.5 (hydration bug)** |
| 10 | `/fatture` | R, C implicita | ⚠️ no CTA | ✅ vero skeleton | ✅ | **7.5/10** | +0.5 |
| 11 | `/fatture/[id]` | R only, **0 azioni** | ❌ non gestito | ⚠️ generico | ✅ | **6/10** | = |
| 12 | `/scadenzario` | R only | ✅ | ⚠️ quasi mai visibile (client fetch) | ⚠️ mai attivato | **6.5/10** | +0.5 |
| 13 | `/scadenzario/[cliente_id]` | R/**U reale** (segna pagata) | ✅ | ✅ vero skeleton | ✅ | **8.5/10** | +1.5 — migliore pagina |
| 14 | `/analytics` | R only | N/A | ✅ | ✅ | **7/10** | = |
| 15 | `/magazzino` | **C rotto (404)**, R, U❌ | ⚠️ CTA morta | ✅ | ✅ | **5/10** | **-2 (dead link)** |
| 16 | `/magazzino/[id]` | R, D✅, **U❌ da UI** | N/A | ✅ conforme | ✅ | **6/10** | -1 |
| 17 | `/ordini` | **C bloccato** (fornitori 404), R | ✅ CTA | ✅ | ✅ | **5/10** | -1 |
| 18 | `/listino` | **C rotto (404)**, R, U✅, D✅ | ⚠️ minimale | ✅ | ✅ | **5.5/10** | **-1.5 (dead link)** |
| 19 | `/tecnici` | R, U✅, D✅, **C rotto (Invita)** | ⚠️ CTA rotta | ⚠️ non conforme | ✅ | **5.5/10** | -1.5 |
| 20 | `/tecnici/[id]/produttivita` | R completo, RBAC solido | ✅ | ✅ conforme | ✅ | **8/10** | = |
| 21 | `/qualita` | R, no link a Create | ⚠️ no CTA | ⚠️ non conforme | ✅ | **6/10** | -1 |
| 22 | `/qualita/psur` | C/R | ✅ | ✅ conforme | ✅ | **7.5/10** | +0.5 |
| 23 | `/qualita/rischi` | **U rotto (404)** | ⚠️ no CTA | ✅ conforme | ✅ | **4.5/10** | **-2.5 (dead link)** |
| 24 | `/qualita/incidenti/nuovo` | C✅ ma **irraggiungibile** | N/A | ⚠️ mismatch | ✅ | **6/10** | -3 (orfana) |
| 25 | `/impostazioni` | R/U | N/A | ⚠️ non conforme | ✅ | **8/10** | +1 |
| 26 | `/impostazioni/profilo` | U✅ | N/A | ⚠️ delega | ✅ | **7.5/10** | -0.5 |
| 27 | `/impostazioni/pec` | C/U✅ completo | N/A | ⚠️ delega | ✅ | **8.5/10** | +2.5 |
| 28 | `/impostazioni/abbonamento` | R✅ | ✅ | ⚠️ delega | ✅ | **7.5/10** | -0.5 |
| 29 | `/onboarding` | C/U✅ wizard | N/A | ⚠️ delega | ✅ | **7/10** | +1 |
| 30 | `/rete` | R, **C rotto (404), Gestisci rotto (404)** | ⚠️ CTA morta | ✅ | ✅ | **4/10** | **-4 CRITICO** |
| 31 | `/agenda` | R only, zero navigazione | ⚠️ no CTA | ✅ | ✅ | **5.5/10** | -2.5 |

**Media: 203/31 = 6.5/10** (vs 7.3/10 baseline; target 9+/10 — gap aumentato da 1.7 a 2.5 punti)

---

## 6. Raccomandazioni prioritarie

### 🔴 P0 — Bloccanti (impattano operatività reale, click-to-404)
1. Creare `/magazzino/nuovo`, `/listino/nuovo`, `/rete/nuova`, `/rete/[id]`, `/qualita/rischi/[id]` oppure sostituire i link con modal/sheet coerenti con il pattern già usato altrove (es. `ListinoEditSheet`).
2. Fix `PazientiSearchList.tsx` — aggiungere `<Link href={\`/pazienti/${p.id}\`}>` per rendere raggiungibile `pazienti/[id]` (BUG #13, noto da tempo).
3. Creare `POST/GET /api/fornitori` per sbloccare la creazione ordini in `NuovoOrdineSheet.tsx`.
4. Implementare un vero flow "Invita tecnico" lato titolare (BUG #9, invariato dal baseline) — es. `/impostazioni/team` con generazione token + invio email/WhatsApp, riusando la pagina di accettazione `/invite/[token]` già esistente.
5. Fix hydration: spostare `getGreeting()` e le altre 8 occorrenze di `new Date()`/`localStorage` in `useEffect` + `useState`, o applicare `suppressHydrationWarning` in modo mirato e coerente.

### 🟡 P1 — Importanti
6. Rimuovere/correggere la query morta in `ordini/page.tsx:104-111` (eliminare la subquery non supportata, tenere solo il filtro JS o sostituire con una RPC dedicata).
7. Sostituire `var(--cobalt, #1B2D6B)` in `LavoroCard.tsx:682` e `qualita/page.tsx:312` con un token DS v2.3 valido (colore bandito da CLAUDE.md, in uso come background sulla pagina più visitata dell'app).
8. Sostituire tutti gli usi di `--gold` come testo (qualita, psur, rete, analytics, OrdiniList) — vietato esplicitamente due volte nel codebase stesso.
9. Migrare le pagine business rimaste (fatture, qualita, rete, tecnici, agenda, analytics, clienti) dalla palette "legacy" (`--success`, `--info`, `--amber`, `--gold`) alla palette rainbow v2.3 (`--c-*`), completando la migrazione dichiarata "fatta" in MEMORY.md.
10. Aggiungere azioni mancanti su `fatture/[id]` (download PDF/XML, segna pagata) e UPDATE su `magazzino/[id]`.

### 🟢 P2 — Enhancement
11. Uniformare tutti i `loading.tsx` custom a `motionTokens.duration.skeleton` (1.50s) e a colori theme-aware (`var(--sfc)`/`var(--elv)`), oggi hardcoded in ~14 file.
12. Rimuovere route orfane (`tecnici/[id]/{loading,error}.tsx`, `qualita/incidenti/error.tsx`) o completarle con una `page.tsx`.
13. Collegare `qualita/incidenti/nuovo` da qualche punto della UI (oggi raggiungibile solo via URL diretto).
14. Sostituire `window.confirm()`/`alert()` residui con componenti custom del design system.
15. Migrare `src/middleware.ts` alla nuova convenzione `proxy` richiesta da Next 16.2.6.

---

## 7. Conclusione

Il refactor Design System v2.3 ha **risolto in modo netto e verificabile** due dei problemi strutturali più citati nel baseline: la copertura di `loading.tsx`/`error.tsx` è passata da parziale a quasi totale (31/31 pagine), con implementazioni reali (skeleton animati, `ErrorPage` condiviso con `motion/react`), non stub. Anche il DELETE, prima assente ovunque, ora esiste su 4 entità (magazzino, listino, pazienti, tecnici).

Tuttavia, lo stesso refactor — o la finestra di tempo in cui è avvenuto — ha lasciato **5 route CRUD che portano a 404 immediati**, **un'intera sezione (pazienti) irraggiungibile dalla UI per un bug di navigazione mai corretto**, **un hydration bug sistemico** osservato dal vivo in produzione, e **una migrazione della palette colori solo parziale** con almeno due violazioni dirette di regole esplicitamente scritte in CLAUDE.md (colore bandito `#1B2D6B` usato come background, `--gold` usato come testo). Nessuno dei 3 bug puntuali segnalati nel baseline precedente è stato completamente risolto: 1 rimane identico (Invita tecnico), 1 è solo mitigato (query ordini), 1 è risolto (error boundary — ma era il più semplice dei tre).

**Il punteggio medio è sceso da 7.3/10 a 6.5/10.** Per raggiungere il target 9+/10 servono, in ordine di priorità: chiudere i 404 concreti (P0.1), sbloccare pazienti e ordini (P0.2-3), fixare l'hydration bug (P0.5), e completare la migrazione della palette colori (P1.7-9) — non nuove feature, ma completamento e correzione di lavoro già iniziato.
