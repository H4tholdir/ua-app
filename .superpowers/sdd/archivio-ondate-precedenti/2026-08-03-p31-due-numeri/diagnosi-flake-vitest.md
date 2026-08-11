# Diagnosi flake d'ordine — `avviso-caricamento-vuoto.test.tsx`

Data: 22/07/2026 · Worktree: `parete-cassette` · vitest 4.1.6 · jsdom 29.1.1 · motion 12.38.0 · React (Testing Library) · macchina 16 core / 48 GB · pool default (`forks`, `isolate: true`).

> ⚠️ Investigazione read-only. Nessun file del repo modificato. Tutte le prove in
> `/private/tmp/.../scratchpad/` (harness `repro.sh`, JSON catturati, due mini-progetti di prova).

---

## 1. Riprodotto? SÌ — con certezza

| Scenario | Esito |
|---|---|
| File in isolamento (`vitest run <file>`) | **29/29 verde**, 1.84s |
| Suite intera, singola (default, 16 worker) | **verde** (2717 pass, 22.1s) — run #1 pulita |
| Suite intera × **3 in parallelo** (48 worker su 16 core = oversubscription), seed default | **RIPRODOTTO alla 1ª iterazione** della lane C: esattamente **12 rossi** nel file vittima |
| Suite intera × **3 in parallelo**, **`--sequence.seed=1` fisso** su tutte le lane | **RIPRODOTTO alla 1ª iterazione** della lane S3: **11 rossi** nel file vittima |
| Suite singola sotto **CPU burner esterni** (20 processi busy-loop, load ~68), file loopato 6× | **0 rossi** — la pressione CPU grezza NON basta |

La ricetta di contesa (3 suite simultanee) l'ha fatto scattare **al primo colpo**, due volte. Coincide con le 2
occorrenze del 22/07 (stessa firma: ~12 rossi, `<body><div/></body>`).

**«Flake d'ordine» è un nome improprio.** Con `--sequence.seed=1` **fisso** (ordine dei file deterministico) il
guasto si ripresenta comunque (11 rossi): non dipende dall'ordine. Il vero driver è il **tempo di parete della
finestra `flushFrame` sotto starvation**. Fissare il seed non lo previene → nessun seed «buono»/«cattivo» da
cercare.

**Serve la contesa multi-worker jsdom, non la CPU grezza.** I burner esterni (20 busy-loop) portano il load a 68
ma NON riproducono: un singolo worker in foreground, per quanto rallentato, riceve comunque slice CPU sufficienti a
far scattare il suo rAF (~16ms) entro i 15 s. Il guasto richiede che il file giri **dentro una suite parallela di
molti worker jsdom** (GC/allocazioni cross-processo + oversubscription del pool `forks`), condizione in cui il
servizio dei timer/rAF di quel worker viene ritardato oltre soglia.

Non è contaminazione fra file: `isolate: true` regge. È **fragilità interna al file**, innescata dal tempo di
parete sotto starvation multi-worker.

---

## 2. I 12 rossi non sono 12 guasti indipendenti — sono 3 categorie

Dal JSON catturato (`CAUGHT-lane-C-iter-1.json`), con **durate per-test** (il dato che rompe l'ambiguità):

**(a) 1 timeout a 15 s — `testTimeout` — è l'INNESCO del disastro**
- `il toast passa dal ramo ridotto ... raggiunge opacity 1` → **15001 ms**, errore `STACK_TRACE_ERROR` (timeout vitest) alla riga 320.
- Resta appeso dentro `await flushFrame()` (righe 38-43): `await act(async () => await new Promise(r => requestAnimationFrame(() => r())))`. Sotto starvation il callback rAF (jsdom lo schedula su un macrotask ~16ms) è ritardato **oltre 15 s** → il test va in timeout **mentre è ancora sospeso dentro uno scope `act()` mai risolto**.

**(b) 8 rossi «cascata» — DOM vuoto — vittime dell'`act()` avvelenato**
- Tutti DOPO il test (a). Durate 0.4–45 ms. Firma identica: `<body><div/></body>`, `Unable to find element` / `expected +0 to be 3`.
- Un `act()` che non si risolve mai lascia la coda-act globale di React non-nulla: **ogni `render()` successivo nel file accoda il lavoro ma non lo flusha mai → container vuoto** per tutto il resto del file.
- Prova del meccanismo, isolata e deterministica (`scratchpad/proof/cascade.test.tsx`): test A va in timeout dentro `act()` con rAF stubato che non scatta mai → test B e C fanno `render(<Hello/>)` e ottengono **esattamente `<body><div /></body>`**. Riproduzione pulita del sintomo.
- Firma inconfondibile della cascata: **dopo il test (a), OGNI asserzione di PRESENZA fallisce, OGNI asserzione di ASSENZA passa** (verificato test per test). Non è casuale: il DOM è semplicemente vuoto, quindi `queryBy…===null` passa banalmente e `getBy…` esplode.

**(c) 3 timeout a ~5 s — `asyncUtilTimeout` — contesa «onesta», indipendenti dalla cascata**
- `hover sospende…` (5014 ms), `focus sospende…` (5008 ms), `errore ha bottone chiusura…` (5008 ms). Vengono PRIMA di (a), quindi non sono cascata.
- Sono `await waitFor(() => expect(queryByText).toBeNull())` che attendono la **exit animation reale di AnimatePresence** (`exit.duration 0.14s`, guidata da rAF in tempo reale). Sotto starvation l'uscita non completa entro i 5000 ms di `asyncUtilTimeout`. Errore: `expected <p> to be null` (il toast è ancora lì).

3 + 1 + 8 = **12**. Coincide col conteggio reale osservato dall'utente.

I margini già presenti nel file (`asyncUtilTimeout: 5000`, `testTimeout: 15_000`, righe 11-12) **non bastano** —
sono anch'essi budget di parete che una starvation abbastanza lunga sfora. Il commento del file (righe 5-12) che
attribuisce tutto al `waitFor` dell'exit è una **diagnosi parziale**: coglie la categoria (c) ma ignora
l'innesco (a) e l'intera cascata (b), che sono ciò che trasforma 3 rossi in 12.

---

## 3. Cause escluse (con motivo)

- **Contaminazione fra file / registry moduli**: esclusa. `isolate: true` di default resetta lo stato per-file. Il difetto è dentro l'esecuzione del singolo file. Coerente col fatto che il file passa 29/29 in isolamento e in rerun.
- **OOM del worker**: escluso. Argomento decisivo: il DOM vuoto è **riprodotto in isolamento in 1.2 s senza alcuna pressione di memoria** (`proof/cascade.test.tsx`) — quindi l'OOM non è **necessario** per il sintomo. La firma è timeout+cascata, non crash/OOM del processo; il vuoto viene dalla coda-act non flushata, non dalla memoria. (Il run reale girava anche con `--logHeapUsage`, ma la prova isolata è di per sé sufficiente a escludere l'OOM.)
- **`tests/setup.ts` stateful**: escluso. Il mock globale `matchMedia` è innocuo e viene sovrascritto/ripristinato correttamente dal file; nessuno stato sopravvive che spieghi il DOM vuoto.
- **Bug del componente `Avviso`/`Skeleton`/`Vuoto` in produzione**: escluso. I componenti sono corretti; il guasto è artefatto dell'ambiente di test sotto starvation, non un difetto runtime dell'app.
- **`matchMedia`/`useReducedMotion`/portale non montato**: escluso come radice. Il portale monta (i test che lo verificano passano quando arrivano prima della cascata); il vuoto è a valle, dovuto all'act avvelenato.

---

## 4. Causa più probabile (certezza ALTA, con prove)

Sotto **CPU starvation** di un worker jsdom (accentuata dalla contesa del pool), il test `il toast passa dal ramo
ridotto` va in **timeout a 15 s dentro `await flushFrame()`**, che aspetta un `requestAnimationFrame` **reale**
sospeso dentro uno scope `act()`. L'`act()` mai risolto **avvelena lo stato-act globale di React**: da lì in poi
ogni `render()` del file produce un container **vuoto** → 8 test di presenza cadono a cascata (`<body><div/></body>`).
In parallelo, 3 `waitFor` che attendono la exit-animation reale di AnimatePresence sforano l'`asyncUtilTimeout` di
5 s per la stessa starvation. Totale 12. Meccanismo (b) riprodotto in isolamento e deterministico.

---

## 5. Fix proposto (preciso, NON applicato — validato end-to-end sui componenti reali)

File: `tests/unit/ds-v3/componenti/avviso-caricamento-vuoto.test.tsx`. Due modifiche mirate, in ordine di priorità.

### Fix A — de-fanga l'innesco e ANNULLA la cascata (risolve i 9 rossi (a)+(b))
Rendere deterministico il flush del rAF di `AvvisoRidotto` con **fake timers**, così non dipende più dalla CPU e
non può andare in timeout dentro `act()`. Il rAF va schedulato sotto fake timers, quindi i fake timers vanno
attivati **prima** del `render()` del test alle righe 320-336 (stesso pattern già usato dagli altri test fake-timer
del file). Concretamente:

- `flushFrame` (righe 38-43) diventa un avanzamento di fake timers dentro `act`:
  ```ts
  async function flushFrame(): Promise<void> {
    await act(async () => { await vi.advanceTimersByTimeAsync(20) })
  }
  ```
- Il test `il toast passa dal ramo ridotto…` (riga 320) attiva `vi.useFakeTimers()` **prima** di `render(...)` e
  `vi.useRealTimers()` in coda (l'`afterEach` del blocco già chiama `vi.useRealTimers()`).

Validazione (`proof2` P1a/P1b): il flush via fake timers raggiunge `opacity: 1` **senza attesa di parete** e il
`render` successivo monta regolarmente (nessun avvelenamento). Con l'`act()` che non può più restare appeso, la
cascata (b) **non può accadere per costruzione**.

### Fix B — elimina la dipendenza dal tempo di parete della exit-animation (risolve i 3 rossi (c))
Disattivare le animazioni motion nel file, così enter/exit di AnimatePresence sono **istantanei** e i `waitFor`
risolvono subito qualunque sia il carico CPU:
```ts
import { MotionGlobalConfig } from 'motion/react'
// in testa al file:
beforeAll(() => { MotionGlobalConfig.skipAnimations = true })
afterAll(() => { MotionGlobalConfig.skipAnimations = false })
```
Validazione (`proof2` P2): con `skipAnimations = true` la exit di AnimatePresence rimuove il nodo **istantaneamente**
sotto `waitFor`. Sicuro per questo file: nessun test asserisce valori di animazione motion **in volo** (il ramo
ridotto usa opacity CSS propria, non motion; i test del ramo animato controllano solo presenza/aria/timer/suono).

**Perché non «ammorbidisce»:** entrambe le modifiche **rimuovono** la dipendenza dal tempo di parete invece di
allargarne il budget. Fix A elimina un vero **bug latente** (timeout dentro `act()` → cascata) che colpirebbe
qualunque test con lo stesso pattern; Fix B rende le animazioni deterministiche invece di sperare che finiscano in
tempo. Nessuna asserzione viene indebolita.

### Alternative di configurazione — SCARTATE come masking
- `test.retry: 1/2` → il file passa in rerun, quindi renderebbe CI verde, ma **maschera** il bug latente della
  cascata e non spiega nulla. È il «retry alla cieca» da evitare.
- Abbassare `poolOptions.forks.maxForks` → riduce la starvation ma **rallenta** tutta la suite e lascia intatto il
  bug dell'`act()` avvelenato: rende l'innesco più raro, non lo elimina.
- Alzare ancora `testTimeout`/`asyncUtilTimeout` → allarga il budget di parete: pura mitigazione, non correzione.

### Nota sistemica (opzionale, più forte)
Portare `MotionGlobalConfig.skipAnimations = true` in `tests/setup.ts` proteggerebbe **ogni** file basato su motion
dalla stessa fragilità di exit-animation, al prezzo di non poter testare animazioni motion in volo altrove. Da
valutare come decisione suite-wide (panel advisor) — per il fix mirato basta lo scope-file di Fix B.

---

## 5-bis. Validazione end-to-end del fix sui COMPONENTI REALI (non proxy)

Copia del file vittima in `scratchpad/realfix/fixed.test.tsx` con **entrambi** i fix applicati, iniettata al posto
dell'originale nella **suite intera reale** via un plugin Vite `load()` (nessuna modifica ai file del repo —
`scratchpad/swap.config.mts` importa il `vitest.config.ts` del repo e sostituisce solo il sorgente di quel file; un
marker conferma che lo swap ha agito). A/B **fianco a fianco, stessa contesa (2 suite concorrenti), stesso carico**:

| Lane | iter1 | iter2 | iter3 | iter4 | iter5 | Esito |
|---|---|---|---|---|---|---|
| **CTRL** (file originale, invariato) | 12 fail | 11 | 12 | 0 | 12 | **flaka 4/5** |
| **FIX** (swap con i 2 fix, componenti reali) | 0 | 0 | 0 | 0 | 0 | **verde 5/5** |

Sotto la condizione identica che rompe l'originale 4 volte su 5, la versione con il fix è **verde 5/5**. Isolato, il
file con fix passa **29/29** anche dentro la suite reale. Il fix è validato end-to-end, non solo a livello di
meccanismo.

> Nota di contorno: negli stessi run un ALTRO file, `MiniaturaLavoro.test.tsx`, falliva in modo **deterministico**
> (asserzioni sui simboli A/B/C/D — lavoro «miniature/cassette» in corso di un altro agente nel worktree). Non è
> il flake in oggetto (guasto stabile, non `<body><div/></body>`), non c'entra con lo swap ed è fuori scope. Il
> conteggio A/B qui sopra guarda **solo** i fallimenti del file vittima.

---

## 6. Artefatti di prova (scratchpad, fuori dal repo)
- `repro.sh` / `abrun.sh` — harness multi-lane, JSON reporter + `--logHeapUsage`; `abrun.sh` conta i fail del solo file vittima per iter.
- `CAUGHT-lane-C-iter-1.json` (seed default) e `CAUGHT-lane-S3-iter-1.json` (`--sequence.seed=1`) — i run rossi con durate per-test.
- `proof/cascade.test.tsx` — prova isolata e deterministica della cascata act→DOM vuoto (`<body><div/></body>`), 1.2 s, zero pressione memoria.
- `proof2/fix.test.tsx` — validazione dei due fix a livello di meccanismo (3/3 verde).
- `realfix/fixed.test.tsx` + `swap.config.mts` — fix applicato ai componenti reali dentro la suite intera; A/B FIX 5/5 verde vs CTRL 4/5 rosso.
- `ABRED-CTRL-*.json` — i JSON rossi dell'A/B (controllo).

---

## 7. Fix applicato al repo (22/07, sessione successiva)

Fix A e Fix B della sezione 5 applicati **esattamente come diagnosticati**, nessuna asserzione ammorbidita, nessun altro file toccato. File: `tests/unit/ds-v3/componenti/avviso-caricamento-vuoto.test.tsx`.

```diff
 import { render, screen, fireEvent, waitFor, act, configure } from '@testing-library/react'
-import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
+import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
+import { MotionGlobalConfig } from 'motion/react'
 import { trovaParoleVietate } from '@/design-system/v3/dizionario'

 configure({ asyncUtilTimeout: 5000 })
 vi.setConfig({ testTimeout: 15_000 })

+// Fix B: disattiva le animazioni motion per l'intero file, così enter/exit
+// di AnimatePresence sono istantanei e i waitFor di uscita del toast non
+// dipendono più dal tempo di parete della exit animation reale.
+beforeAll(() => { MotionGlobalConfig.skipAnimations = true })
+afterAll(() => { MotionGlobalConfig.skipAnimations = false })
+
 // ... (mock router/matchMedia invariati)

 async function flushFrame(): Promise<void> {
   await act(async () => {
-    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
+    await vi.advanceTimersByTimeAsync(20)   // Fix A
   })
 }

 // nel test 'il toast passa dal ramo ridotto...' (riga ~320):
 it('...', async () => {
+  vi.useFakeTimers()          // Fix A — attivato PRIMA del render
+  try {
     render(...)
     ...
     await flushFrame()
     expect(toast.style.opacity).toBe('1')
     expect(toast).toHaveAttribute('aria-live', 'polite')
+  } finally {
+    vi.useRealTimers()
+  }
 })
```

`motion/react` (il modulo già importato dal componente sorgente `src/components/ds/Avviso.tsx`) esporta `MotionGlobalConfig` in questa versione installata (motion 12.38.0) — verificato con `node -e "console.log('MotionGlobalConfig' in require('motion/react'))"` → `true`. Nessuna deviazione dal fix proposto.

### 7.1 Prova 1 — file in isolamento
`npx vitest run tests/unit/ds-v3/componenti/avviso-caricamento-vuoto.test.tsx` → **29/29 verde**, 1.55s.

### 7.2 Prova 2 — contesa multi-worker (la prova che conta)
Harness proprio (`scratchpad/fixrun.sh`, stesso principio di `abrun.sh`/`repro.sh` del rapporto): **3 esecuzioni della suite intera in parallelo** (`npx vitest run --reporter=json`, lanciate con `&` e attese con `wait`), ripetuto per **3 round consecutivi** = 9 run totali sotto la stessa oversubscription (3× la suite reale, 16 core) che nel rapporto riproduceva il guasto al primo colpo.

| Round | Lane 1 | Lane 2 | Lane 3 |
|---|---|---|---|
| 1 (12:58) | victimFail=0 / 29 pass | victimFail=0 / 29 pass | victimFail=0 / 29 pass |
| 2 (13:02) | victimFail=0 / 29 pass | victimFail=0 / 29 pass | victimFail=0 / 29 pass |
| 3 (13:05) | victimFail=0 / 29 pass | victimFail=0 / 29 pass | victimFail=0 / 29 pass |

**9/9 run verdi nel file vittima**, sotto la stessa contesa che nel rapporto produceva 12 rossi al primo tentativo. Nessun `<body><div/></body>`, nessun timeout.

Nota di contorno (fuori scope, non toccato): sotto questa stessa contesa 3×, **altri file** hanno mostrato fallimenti — `pill.test.tsx` (il flake censito a parte, §vincoli del compito), e inoltre `ChipScelta.test.tsx`, `FrameFatto.test.tsx`, `PassoTipo.test.tsx`, `ProgressDots.test.tsx`, `WizardNuovoLavoro.test.tsx`, `CardLavoro.test.tsx`, `campo.test.tsx`, `catalogo.test.tsx`, `pila-striscia.test.tsx`, `racconto.test.tsx`, `tile-avatar-cerca.test.tsx`, `tasti-secondari.test.tsx`, `parete-client.test.tsx` (variabili tra i 9 run, mai lo stesso set). Sono probabilmente la stessa classe di fragilità da tempo di parete sotto starvation multi-worker, ma su file diversi da quello in carico a questo task — non rientrano nel mandato («non toccare altri file di test») e non sono stati modificati.

### 7.3 Prova 3 — `tsc --noEmit`
`npx tsc --noEmit` → **0 errori**.

### 7.4 Prova 4 — run singola finale, pulita
`npx vitest run` (default, nessuna contesa esterna) → **309 file di test passati, 3 skipped (312); 2718 test passati, 19 skipped (2737); 0 falliti.** Durata 66.74s.

### 7.5 Scostamenti dalla diagnosi
Nessuno. Entrambi i fix sono stati applicati esattamente come descritto in §5, nessuna asserzione modificata o allargata, nessun altro file toccato (né `vitest.config.ts`, né componenti sorgente, né `pill.test.tsx`).

---

## 8. Intervento di CLASSE applicato (22/07 notte — handoff post-R3 punto 2)

La «nota sistemica» di §5 è stata eseguita su tutta la suite (branch `worktree-flake-vitest`, commit `c4ced40` + review round `1d82f11`).

**Cosa è cambiato:**
1. `tests/setup.ts`: `MotionGlobalConfig.skipAnimations = true` suite-wide — elimina la classe «tempo di parete delle animazioni motion» (waitFor di exit + lavoro spring su rAF) per ogni file. Censimento 22/07: nessun test della suite asserisce animazioni motion in volo (confermato da sweep indipendente del reviewer: niente `onAnimationComplete`/`useMotionValue`/`useSpring`/mock di `motion/react` nei test).
2. `avviso-caricamento-vuoto.test.tsx`: toggle per-file (Fix B §5) assorbito dal setup.
3. **Seconda classe scoperta dall'A/B**: i timeout ~5s ricorrenti (pill, ProgressDots, CardLavoro, tile-avatar-cerca) NON erano animazioni — è il PRIMO `render(<CatalogoPage />)` del file (~0.5s di CPU sincrona in isolamento) che sotto oversubscription 3× sfora il `testTimeout` di default 5s. Non esiste alternativa deterministica per lavoro CPU sincrono → calibrazione di budget: `tests/unit/ds-v3/budget-catalogo.ts` (helper import side-effect, `testTimeout: 15_000`) importato dai 12 file che renderizzano la pagina catalogo (il 13°, avviso, ha già il proprio 15s in loco).
4. `sheet-dialog.test.tsx` (review, Important 2): i 4 test scroll-lock ora documentano che le asserzioni sincrone `overflow==='hidden'` durante l'uscita reggono sulla notifica ASINCRONA di fine exit anche con skipAnimations (failure mode rumoroso se un upgrade di motion la rendesse sincrona).

**Protocollo A/B (stesso harness §7.2: 3 suite intere in parallelo, 16 core):**
| | Round × lane | Esito |
|---|---|---|
| CTRL (main `9416d25`) | 1 × 3 | **3/3 rosse** — 4-5 test rossi/lane (pill, ProgressDots, CardLavoro, tile-avatar-cerca sempre; FrameFatto 1/3) |
| FIX solo-skipAnimations | 1 × 3 | 3/3 rosse — restano ESATTAMENTE i 4 timeout catalogo (prova che sono una classe diversa; FrameFatto sparito) |
| FIX completo (skip + budget) | 4 × 3 | **12/12 verdi** |

Verifiche finali: `tsc --noEmit` 0 errori · `vitest run` 313 file / 2769 test verdi · `next build` ok.

**Debito residuo segnalato dal reviewer (non in scope):** 13 file di unit test pagano ciascuno il render completo della pagina catalogo — debito architetturale della suite, merita un'ondata propria se il costo cresce.
