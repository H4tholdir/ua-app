# UÀ — Project Memory
**Ultimo aggiornamento:** 3 luglio 2026 — A4 chiuso definitivamente e mergiato su main (commit `4a36f89`) — cache versioning automatico Service Worker

---

## 0. STATO DEL PROGETTO — RE-AUDIT 02/07/2026 COMPLETATO, B1 RISOLTO, B2 RISOLTO E MERGIATO (03/07/2026)

**⚠️ Zero commit dal 05/06/2026 al 02/07/2026 — quasi un mese senza sviluppo.** Il 02/07/2026 è stato eseguito un re-audit completo (11 agenti persona, stessa metodologia del 21/05) per capire lo stato reale vs quanto documentato. Risultato: score medio **7.29/10** (era 7.1 il 21/05), nessuno degli 11 target dichiarati raggiunto, 4 dimensioni su 11 regredite.

**Documenti chiave del re-audit (fonte di verità aggiornata, leggere PRIMA delle sezioni sotto per i dettagli tecnici):**
- `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` — ogni bug/gap con file:riga, causa, fix, priorità (16 Blocker, 18 Alto, 30 Medio)
- `docs/roadmap/FEATURES-E-FLUSSI-2026-07-02.md` — inventario completo feature e flussi per ruolo, stato reale verificato
- `docs/audit-2026-07-02/SINTESI-ORCHESTRATORE.md` — sintesi dei 11 report persona con confronto punteggi vs baseline 21/05

**⚠️ CORREZIONI a claim precedenti in questa memoria, smentiti dal re-audit:**
- "Design System v2.3 al 100%" (sezione storica sotto) → **FALSO**, verificato dal Designer: pagina login viola WCAG su una regola esplicitamente vietata da v2.3 (`globals.css:245-246`), `qualita/page.tsx` ha 2 violazioni residue invisibili al gate automatico, migrazione palette solo parziale su molte pagine business (fatture, qualità, rete, tecnici, agenda, analytics, clienti usano ancora variabili "legacy"). Vedi backlog B12, A6, M6.
- "Logo + firma DdC" in ROADMAP-UFFICIALE.md segnato ⏳ non iniziato → **FALSO**, il rendering è già implementato in `DdcTemplate.tsx`; manca solo l'hash di integrità SHA-256 della firma (backlog A18).

**✅ B1 RISOLTO (02/07/2026, commit `31cc47c`) — Tracciabilità MDR materiali/lotti.** Causa radice: `lavori_materiali` (unica tabella letta da DdC/IFU/etichetta/fattura) non aveva mai un writer; `scarichi_magazzino` (l'unico meccanismo attivo) operava cieco al lotto e — aggravante scoperta solo in fase di piano — girava DOPO la generazione della DdC, quindi anche scrivendo lì non avrebbe mai risolto nulla. Fix: nuovo step sincrono in `orchestraConsegna`, PRIMA della generazione DdC, che risolve la BOM (`listino_materiali_auto`) per lotto FEFO e scrive in `lavori_materiali`; biforcazione su `magazzino.traccia_lotto` (materiali non-MDR continuano sul percorso `scarichi_magazzino`/`decrementa_scorta` invariato); flag soft `lavori.tracciabilita_materiali_ok` + banner UI quando manca un lotto o una BOM. Migration idempotente applicata al progetto live `iagibumwjstnveqpjbwq`. 169/169 test, tsc/build puliti, 1 fix post-review-finale (path fail-unsafe su insert parziale in split multi-lotto). Spec: `docs/superpowers/specs/2026-07-02-b1-tracciabilita-materiali-design.md`. Piano: `docs/superpowers/plans/2026-07-02-b1-tracciabilita-materiali.md`.
**Follow-up non bloccanti aperti (non B1, tracciati separatamente):** nessun test automatico end-to-end su `orchestraConsegna` (converge con B13 già in backlog); verifica manuale su un lavoro reale in produzione ancora da fare da Francesco (la migration è live ma nessuna consegna reale è stata ancora generata con questo codice).

**✅ B2 RISOLTO (03/07/2026, commit `cbc034b`) — Dashboard/Scadenzario dati contrastanti sui crediti clienti.** Causa radice originale (non "due fonti mai riconciliate" come nel backlog originale): `lavori_partitario` non ha mai avuto un writer applicativo (0 righe anche in produzione, verificato su DB live), quindi 3 punti (Dashboard KPI, widget "clienti morosi" incl. `admin/labs/[id]/live`, widget Front Desk) mostravano sempre il prezzo pieno come insoluto. Piano di 16 task scritto ed eseguito su worktree `b2-contabilita-clienti` (branch `worktree-b2-contabilita-clienti`) a partire dallo spec approvato `docs/superpowers/specs/2026-07-02-contabilita-clienti-design.md` (commit `05f4f1b`): ledger pagamenti polimorfico (fattura o lavoro diretto) in tabella `pagamenti`, flag `lavori.decisione_fatturazione` (`in_attesa`/`fatturare`/`non_fatturare`) con pipeline di fatturazione batch che lo rispetta, credito cliente con eccedenze/applicazioni/rimborsi in `credito_clienti_movimenti` (con fix anti-credito-fantasma quando un pagamento sorgente viene annullato), Scadenzario ampliato ai lavori diretti, `lavori_partitario` droppata (0 letture morte residue), 218/218 test unitari verdi, tsc/build puliti. Piano: `docs/superpowers/plans/2026-07-02-contabilita-clienti.md`. Report dettagliati per ogni task: `.claude/worktrees/b2-contabilita-clienti/.superpowers/sdd/task-{1..16}-report.md`.
**Task 16 (verifica finale di chiusura) aveva trovato un bug reale, correttamente riportato BLOCKED invece di chiuso a forza:** `src/app/api/scadenzario/route.ts` (endpoint della lista `/scadenzario`, DIVERSO dal dettaglio `/scadenzario/[cliente_id]` che era già corretto) sommava `f.totale` invece del residuo (`totale - importo_pagato`) per la gamba "fatture" — introdotto nello scope di B2 stesso (prima non esistevano pagamenti parziali su fatture). Risultato: su un cliente con un pagamento parziale o un credito applicato a una fattura, la lista Scadenzario mostrava un insoluto più alto del reale, mentre Dashboard e Contabilità cliente (che nettano correttamente) mostravano il numero giusto — violazione diretta del criterio di chiusura di B2 ("le 4 superfici devono concordare"). Verificato con dati reali sul lab Filippo (fetch JSON diretti + query SQL, non solo screenshot): dopo un'applicazione di credito di 30€ su una fattura di 202€, Dashboard e Contabilità cliente mostravano 172€ (corretto), la lista Scadenzario mostrava 202€ (sbagliato). Dettagli completi, evidenza (fetch JSON, SQL, `git log` sulla causa) e self-review dell'esito BLOCKED: `.claude/worktrees/b2-contabilita-clienti/.superpowers/sdd/task-16-report.md`.
**✅ Fix applicato (03/07/2026, commit `cbc034b`):** in `src/app/api/scadenzario/route.ts` aggiunta `importo_pagato` alla select delle fatture e nettato il residuo (`Math.round((totale - importo_pagato) * 100) / 100`, skip se ≤ 0) per la gamba "fatture", stesso pattern già usato da `getContabilitaCliente` in `src/lib/contabilita/queries.ts:185` e da `getCreditoScadutoPerCliente`. Verifica: `npx tsc --noEmit` 0 errori, `npx vitest run` 218/218 verdi, `npx next build` pulita. Ri-verifica manuale mirata (script service-role, non browser): fattura di test 202€ con pagamento parziale reale di 80€ registrato tramite `eseguiRegistrazionePagamento` (la stessa funzione di `POST /api/pagamenti`) → l'endpoint (simulato con la stessa select+calcolo del route.ts corretto) restituisce residuo 122€, identico al ground truth `fatture.totale - fatture.importo_pagato` = 122€ (il comportamento pre-fix avrebbe mostrato 202€, sbagliato) — dati di test rimossi a fine verifica. Report completo: `.superpowers/sdd/task-16-fix-report.md`.

**✅ Review finale whole-branch (03/07/2026, commit `ac48530`) — secondo bug dello stesso tipo, trovato solo confrontando i 4 path contemporaneamente.** Dopo la chiusura di Task 16, una review sull'intero branch (26 commit) ha trovato che le 4 superfici divergevano ancora su due casi specifici: (1) `scadenzario/route.ts` includeva nei dovuti solo i lavori `non_fatturare`, escludendo i lavori `fatturare` con `incluso_in_fattura=false` che invece Dashboard e Contabilità cliente contano già come "confermato" — un cliente con l'unico scaduto in quello stato spariva dallo Scadenzario ma compariva ovunque altrove; (2) `getContabilitaCliente` non escludeva le fatture in stato `draft`, mentre gli altri due path lo fanno sempre. Chiesto a Francesco quale comportamento adottare per (1) (nessuna risposta entro il timeout, proceduto con l'opzione raccomandata, coerente con la definizione di "credito confermato" nello spec §5): Scadenzario ora include anche i lavori `fatturare`-non-inclusi (`.in('decisione_fatturazione', ['non_fatturare','fatturare'])`), `getContabilitaCliente` ora esclude i draft (`.neq('stato_sdi','draft')`), più una correzione di etichettatura bucket (cosmetica, nessun impatto sul totale) e un commento con nome migration obsoleto. Test di regressione aggiunto per (2). Re-review finale: **Ready to merge: Yes**.

**Merge/deploy (03/07/2026):** branch `worktree-b2-contabilita-clienti` (28 commit) mergiato fast-forward su `main` (commit `05612ec`) e pushato — deploy Vercel automatico. `tsc`/`vitest` (219/219) verificati sia sul branch sia su `main` post-merge. **B2 è chiuso: tutte e 4 le superfici concordano sullo stesso dovuto in ogni stato testato, nessun'altra area risulta rotta.**

**✅ Follow-up 1/2 risolto (03/07/2026, commit `7fc181b`) — bug Service Worker scoperto durante Task 15, fuori scope B2, sistemato in sessione separata.** `public/sw.js` intercettava con la strategia stale-while-revalidate anche le fetch RSC differenziali che `router.refresh()` genera (identificabili dall'header `RSC`/`Next-Router-State-Tree`), nonostante Next.js le marchi esso stesso `Cache-Control: no-cache, must-revalidate` — causando UI stale dopo ogni mutazione (pagamento, credito, decisione fatturazione) finché non si ricaricava manualmente la pagina, su TUTTA l'app, non solo Contabilità Clienti. Fix: escluse queste fetch dalla cache del SW. Verificato dal vivo con Playwright (non solo lettura di codice): creato un lavoro di test `in_attesa`, cliccato "Non fatturare", la UI si è aggiornata senza reload (KPI e lista cambiati), la richiesta RSC catturata risulta andata in rete con `date` header fresco (stesso secondo del click) e `cache-control: no-cache, must-revalidate` — dati di test rimossi a fine verifica (incluso il ripristino di un lavoro `TEST-DdC-001` preesistente toccato per errore dal click). Nota: questo era già segnalato come raccomandazione nel backlog A4 ("escludere `_rsc=` dalla strategia di caching"), mai applicato fino ad ora.

**✅ Follow-up 2/2 risolto (03/07/2026, stesso commit) — allineamento documentale.** `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` (snapshot di audit congelato, non più la fonte di verità corrente da tempo) aggiornato: B2 segnato ✅ risolto con dettaglio, A4 segnato 🔄 parzialmente risolto (resta aperto solo il build-ID versioning + TTL cache, non l'esclusione RSC).

**✅ A4 RISOLTO DEFINITIVAMENTE (03/07/2026, merge `4a36f89`) — Cache versioning automatico Service Worker.** Residuo aperto dopo il fix RSC di B2: il nome della cache (`CACHE_NAME`) in `public/sw.js` era bumpato a mano (`ua-v1→ua-v2`) ad ogni deploy che richiedeva invalidazione. Decisione presa in brainstorming: **niente TTL/pulizia entry** — con le fetch RSC già escluse, ciò che resta cacheable è un set piccolo e fisso di asset statici di `public/` le cui chiavi vengono sovrascritte a ogni deploy, non accumulate (nessun problema reale da risolvere, YAGNI). Fix implementato: `public/sw.js` è ora un **file generato** (gitignored) invece che tracciato — la fonte vera è `scripts/sw-template.js` con placeholder `__BUILD_ID__`; `scripts/generate-sw.mjs` risolve il build-id (`VERCEL_GIT_COMMIT_SHA` troncato a 8 caratteri → `git rev-parse --short=8 HEAD` locale → `Date.now()` di fallback mai-crash; `'dev'` fisso in sviluppo) e scrive `public/sw.js` sostituendo il placeholder; hook npm `prebuild`/`predev` lo eseguono automaticamente. Implementato con superpowers:subagent-driven-development su worktree dedicato (branch `worktree-a4-cache-versioning`), 6 task con TDD (5 nuovi test su `resolveBuildId`/`generateServiceWorker`, dependency-injection reale non mock del binario git), ogni task review approvata singolarmente, review finale whole-branch "Ready to merge: Yes" (nessun Critical/Important — solo note Minor informative: nessun hook `prestart`, non necessario su Vercel senza `vercel.json`; `replace()` sostituisce solo la prima occorrenza del placeholder, innocuo con placeholder singolo). 224/224 test, tsc/build puliti. Spec: `docs/superpowers/specs/2026-07-03-a4-cache-versioning-design.md`. Piano: `docs/superpowers/plans/2026-07-03-a4-cache-versioning.md`. **A4 è ora completamente chiuso** (sia la parte RSC di B2 sia il versioning automatico).

**Cosa invece funziona davvero (verificato, non solo dichiarato) nel periodo 21/05→02/07:**
- Soft/hard-block consegna con dati MDR incompleti (più rigoroso del richiesto)
- Fix disinfettante "Non dichiarato"
- Form Nuovo Lavoro semplificato (9 tab → 2)
- Fatturazione batch + export CSV commercialista, funzionanti end-to-end
- Push notification per rientro prova
- CSRF completo su tutte le 35 route dinamiche `[id]`
- GSAP rimosso dal bundle

---

## 0-bis. STATO STORICO — DS v2.3 LIVE IN MAIN (28/05/2026, leggere con le correzioni sopra)

**DS v2.3 mergiato su main — 28/05/2026 — commit `63f93e5` + compliance commit — deploy Vercel ✅**

| Versione | Data | Tag | Contenuto |
|----------|------|-----|-----------|
| V1.5.1 | 21/05/2026 | `v1.5.1` | Piano A — Security fixes |
| V1.6.0 | 21/05/2026 | `v1.6.0` | Piano B — UX Excellence |
| V1.7.0 | 21/05/2026 | `v1.7.0` | Piano C — Delight + Business Intelligence |
| V1.7.8 | 22/05/2026 | `v1.7.8` | Fix bug magazzino/[id], push triggers, CRUD completo |
| V1.7.9 | 22/05/2026 | `v1.7.9` | Pazienti PATCH, Listino edit, Dark mode 27 file |
| V1.8.0 | 22/05/2026 | `v1.8.0` | Error boundaries, loading completo, splash screens iOS |
| V1.8.1 | 22/05/2026 | `v1.8.1` | Disattiva tecnico, CI/CD fix, BP-1/BP-2, orchestratori, roadmap |
| V1.8.2 | 22/05/2026 | `v1.8.2` | Visual audit P0: body bg warm panna, grid overflow, dark mode toggle, STOR/ filter |
| V1.9.0 | 23/05/2026 | `v1.9.0` (9bda106) | Dashboard V2: Spotlight, KPI filtri, ruolo ibrido, SyncBadge, nav personalizzabile |
| V1.9.1 | 25/05/2026 | `main` (96ed542) | Fix residui S1: LIVE badge rimosso, preferenza_dashboard toggle, Da fatturare lista inline |
| V1.9.2 | 26/05/2026 | `main` (78b6a29) | S2: RifacimentoButton — bottom sheet 7 motivi, textarea note, motion policy, mockup approvato |
| **V1.9.3** | **28/05/2026** | **`main` (63f93e5+)** | **Design System v2.3 — implementazione completa su tutta la PWA** |

**Stato CI:** TypeScript: 0 errori · ESLint: 0 warning · Vitest: 157/157 · Build: ✅

---

### ✅ Design System v2.3 — Implementazione Completa (28/05/2026)

**Branch:** `feature/ds-v2-3` + `feature/ds-v2-3-compliance` — mergiati su main

**Cosa è stato implementato:**
- `globals.css` — t2 `#4A3D33` (WCAG AAA), t3 `#6B5C51` (AA), alias `--sfc`, rainbow vars `--c-*`
- `KpiCard.tsx` — COLOR_MAP rainbow (red→c-red, amber→c-amber, gold→c-green, +tipo blue)
- `StatoBadge.tsx` — mapping rainbow per tutti gli stati lavoro
- `BottomNavPill.tsx` — CTA → classe CSS `.ua-tasto-plus` (fisico, `::before` corona, dark mode)
- ~70 file — fallback t2/t3 aggiornati (`#96918D`→`#4A3D33`, `#B8B3AE`→`#6B5C51`)
- ~20 file pagine `src/app/(app)/` — gold-as-text → `var(--c-amber)`
- 34 file pagine + componenti — shadow inline rgba → `var(--sh-b/c/i/red)`
- 14 file — CSS transition timing → `var(--tr)`
- `scripts/check-ds-compliance.sh` + `.husky/pre-commit` — enforcement automatico

**Spec:** `docs/superpowers/specs/2026-05-27-design-system-v2-3.md` (UNICA FONTE DI VERITÀ)
**Token TS:** `src/design-system/tokens.ts`
**Motion:** `src/design-system/motion.ts` v2.1 — 4 categorie

**Eccezioni documentate:**
- `analytics/page.tsx` — `accent="#D4A843"` chart SVG prop (CSS vars non applicabili)
- `qualita/incidenti/nuovo` — `rgba(212,168,67,.50)` stato submitting button (intentional)
- Shadow parziali custom (NuovoOrdineSheet mini-float, fatture chip, DashboardFrontDesk press 80ms) — intentional, non equivalenti a CSS vars

---

### ✅ S1 Fix Residui V1.9 — Completato (25/05/2026)

**Merge commit:** `96ed542` — 7 file modificati, +210 righe

**Modifiche:**
- `RealtimeProvider.tsx` — rimosso badge LIVE fisso top-left (duplicava SyncBadge)
- `PreferenzaDashboardToggle.tsx` — nuovo client component, optimistic UI + rollback su errore
- `/api/impostazioni/preferenze/route.ts` — nuovo PATCH endpoint, allowlist, null-bypass fix
- `impostazioni/page.tsx` — SectionCard Preferenze condizionale su titolare
- `queries.ts` — `getLavoriDaFatturare()` + tipo `LavoroDaFatturareItem`
- `dashboard/page.tsx` — `getLavoriDaFatturare` nel Promise.all, prop a DashboardTitolare+Hybrid
- `DashboardTitolare.tsx` — `FatturaList` component sostituisce placeholder link /fatture

**Nuove API:** `PATCH /api/impostazioni/preferenze`
**Nuove query:** `getLavoriDaFatturare(svc, labId, limit=20)`

---

### ✅ Dashboard V2 — Completato (23/05/2026)

**Merge commit:** `9bda106` — 25 file modificati, +1452 righe

**Nuovi componenti:**
- `SpotlightCard` — card hero urgenza con motion token, useReducedMotion, ua-pulse keyframe
- `KpiCard` — KPI 2×2 cliccabile come filtro navigazione, Playfair Display 38px
- `TaskItem` — progress bar reale da `lavori_fasi.eseguita_at`, role=progressbar sul track
- `DashboardShell` — role-tabs Gestione/Produzione, persistenza localStorage SSR-safe
- `DashboardHybrid` — vista ibrida per Titolare che lavora anche come Tecnico
- `SyncBadge` — "Aggiornato ora / X min fa" + dot online/stale/offline

**Modifiche chiave:**
- `DashboardTitolare`: SpotlightCard per prima segnalazione + KpiGrid 2×2 + Urgenze lab
- `DashboardTecnico`: usa `TaskItem` + `getLavoriTecnicoOggi` (progress reale, no 84% hardcoded)
- `BottomNavPill`: tooltip "Nuovo lavoro", editMode long-press 500ms, pin shortcuts localStorage
- `AppHeader`: prop `lastUpdatedAt?: Date | null` → renderizza SyncBadge
- `page.tsx` dashboard: `isTitolare`, `isHybrid`, `tecnicoIdPerTitolare` — routing per ruolo

**Nuova query:** `getLavoriTecnicoOggi` — completamento_perc reale da fasi, fallback `statoToPerc`

**DB migration:** `20260522120000_dashboard_v2.sql` — 2 indici performance + `utenti.nav_preferences JSONB`

**Lezioni apprese (per prossimi sviluppi):**
- `useReducedMotion` obbligatorio su OGNI componente con animazione non-istantanea
- `window.matchMedia` mock in `tests/setup.ts` necessario per componenti con `useReducedMotion` in jsdom
- `@testing-library/react` aggiunto come devDependency (mancava)
- `role="progressbar"` deve stare sul track container, non sul fill element
- `localStorage` init SSR-safe: lazy initializer + `typeof window === 'undefined'` guard

### 🆕 Fix V1.8.2 — Visual Audit P0 (22/05/2026, commit 1afb06d)
- **Body background**: `var(--bg, #DDD8D3)` warm panna su tutti i dispositivi (era bianco su desktop)
- **Grid lavori desktop**: `minmax(0,1fr)` fix overflow colonna destra a 1280px
- **Dark mode toggle**: `showThemeToggle=true` di default in AppHeader — toggle visibile su ogni pagina
- **ThemeInitializer**: aggiunto `data-theme` attribute + `suppressHydrationWarning` su `<html>`
- **Filtro STOR/**: lavori storici esclusi dalla sezione IN RITARDO della dashboard
- **Truncate descrizione**: ellipsis su LavoroUrgente + min-width:0 su grid li
- **PINNED.md**: multi-viewport, multi-utente real-time, checklist review completa

### 📊 Visual Audit (22/05/2026) — 246 screenshot su 13 pagine × 3 viewport × 2 temi
**Metodologia**: Playwright headless + login reale (h4t@live.it) + analisi sistematica
**Score codice** (11 agenti): media 6.8/10 (era 7.1/10 — audit precedente era solo code review)
**Insight chiave**: dashboard inguardabile principalmente per dataset di test con 50+ STOR/ in ritardo
**Residui da fare** (P1 per V1.9):
- Dark mode: contrasto "Aggiornato X min fa" a 1280px (bassa priorità)
- Tecnici/Agenda/Qualità non accessibili dalla bottom nav
- Dashboard desktop single-column (potrebbe essere 2-col)
- Nota multi-utente real-time aggiunta al PINNED

**Stato CI:** TypeScript: 0 errori · ESLint: 0 warning · Vitest: 141/141 · Build: ✅
**Copertura stimata vs DentalMaster Advanced:** ~97%

### 🆕 Infrastruttura aggiornata (22/05/2026)
- **CI/CD fix:** VAPID lazy-init → CI torna verde dopo 4 build fallite
- **BP-1 obbligatorio:** Stop hook in settings.json + regola in CLAUDE.md
- **BP-2 obbligatorio:** 11 fasi workflow implementation in CLAUDE.md
- **inject-ua-context.js:** Hook inietta 6.710 char PINNED.md + MEMORY.md ad ogni prompt
- **gstack installato:** `~/.agents/skills/gstack` (Garry Tan, YC)
- **Documenti creati:** ROADMAP-UFFICIALE.md · MAGAZZINO-VISIVO-BRAINSTORM.md · WORKFLOW-STANDARD.md · SISTEMA-MEMORIA.md

### ⚠️ Azioni manuali urgenti (ancora aperte)
1. **PEC reale** → Filippo deve configurare `/impostazioni/pec` con le sue credenziali SMTP
2. **Prima sessione di collaudo** → vedere `docs/test-filippo/COLLAUDO-HANDOFF-FILIPPO.md`
3. **Reset completo DB** (decisione Francesco, 02/07/2026) → subito prima del go-live reale con Filippo (dopo il collaudo/UAT), azzerare tutto il database (clienti, listino, magazzino, tecnici, lavori, fatture storiche) sul progetto Supabase live `iagibumwjstnveqpjbwq` — non prima, per mantenere dati utili ai test manuali delle nuove feature nel frattempo.

### ✅ Re-Audit UX Expert — Completato (02/07/2026)

**Report:** `docs/audit-2026-07-02/06-persona-ux-expert.md` — confronto diretto con baseline `docs/audit-2026-05-21/06-persona-ux-expert.md`

**Score: 8.3/10** (baseline 6.8/10 — target 8.5+/10, non ancora raggiunto)

**Metodo:** Playwright live su uachelab.com (390px, account h4t@live.it) per i flussi riproducibili + lettura codice per empty state/onboarding/skeleton (non riproducibili live con dataset lab Filippo già popolato/account già onboardato).

**Risolti (verificato live):**
- Wizard Nuovo Lavoro: 9 tab → 2 tab in creazione (`LavoroFormShell.tsx:48-50`) + step indicator numerato
- Validazione: messaggi specifici per campo + auto-focus + scrollIntoView + bordo rosso (`lavori/nuovo/page.tsx:37-44,111-118`)
- Skeleton loader: 100% coverage, 30/30 route con `loading.tsx`
- Empty state: componente universale `EmptyState.tsx` in 7 pagine + CTA su `/lavori`

**NON risolti / residui da roadmap:**
- CTA "+" sparisce con scroll down — intera pill condizionata da `visible` in `BottomNavPill.tsx:429-450` (nessun fix separato per la CTA)
- "MDR Allegato XIII" ancora terminologia visibile in UI operatore (`TabAccettazione.tsx:285,565`) — solo tooltip aggiunto, non rinominato
- Nuova lacuna a11y: `ClienteComboBox.tsx:180-200` priva di `aria-invalid`/`aria-describedby` (unico campo del form senza, regressione rispetto agli altri campi)
- Odontogramma FDI ancora hidden feature, nessun badge discoverability

### 🗺️ Prossima milestone: V1.9
Feature da implementare prima del collaudo:
1. P0 rapidi da re-audit UX: CTA sempre visibile + aria-invalid su ClienteComboBox (vedi sopra)
2. Dettatura vocale (Web Speech API) — P0
3. Email template branding — P0
4. Rifacimenti UI — P0
5. Logo + firma DdC — P0
*(Magazzino visivo → spostato in V2.0)*

### 📊 Score audit precedente (21/05/2026) — da migliorare
| Agente | Score prima | Fix applicati | Score atteso |
|--------|-------------|--------------|-------------|
| Odontotecnico | 7.5 | Prove UI, BOM materiali | 8.5+ |
| Titolare | 6.5 | Batch fatture, margini, export CSV | 8.5+ |
| Dentista | 5.0 | Portale share, push trigger | 6.5+ |
| PWA Engineer | 7.8 | Splash screens, push, viewport-fit | 9+ |
| Designer UI | 9.2 | Dark mode 27 file | 9.5+ |
| UX Expert | 6.8 | Wizard, validation, empty states | 8.5+ |
| Software Eng. | 7.2 | GSAP rimosso, security fixes | 9+ |
| Flow Titolare | 6.5 | Batch, margini, refresh | 8+ |
| Flow Tecnico | 7.5 | Push trigger rientro | 8.5+ |
| Flow Front Desk | 7.8 | Disinfettante fix, CRUD | 9+ |
| Sistematico | 7.3 | Skeletons, error bounds, DELETE | 9+ |

Vedi: `docs/roadmap/ROADMAP-UFFICIALE.md`

---

## 1. Deploy & Identità

| Voce | Valore |
|------|--------|
| URL produzione | https://uachelab.com |
| Supabase project | `iagibumwjstnveqpjbwq` |
| GitHub | https://github.com/H4tholdir/ua-app |
| Ultimo commit | `80370d0` (v1.8.0 merge) |
| CI/CD | GitHub Actions + Vercel auto-deploy su push main |
| Sviluppatore | Francesco Formicola · `francesco.formicola@live.it` |
| Admin route | `/admin/labs` · ruolo `admin_sistema` |
| Lab Filippo | `971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c` · ITCA01051686 · Serre SA |
| Lab Arturo Pepe | `314cd040-0893-4e9d-9ad8-786e4eefd75f` · lab di test |
| NEXT_PUBLIC_SUPPORT_PHONE | `+393381235473` (normalizzato nel codice per wa.me) |
| NEXT_PUBLIC_APP_URL | `https://uachelab.com` |

### Credenziali test (produzione)
- **Titolare lab Filippo:** `h4t@live.it` / `[vedi .env.local → TEST_PASSWORD]`
- **E2E tecnico:** `e2e-tecnico@ua-test.local` / `TestE2E!2026`
- **Admin sistema:** `francesco.formicola@live.it` (usa forgot-password)

---

## 2. CRUD Completeness (v1.8.0)

| Entità | Create | Read | Update | Delete/Archivia |
|--------|--------|------|--------|-----------------|
| Lavori | ✅ | ✅ | ✅ | ✅ (stati) |
| Clienti | ✅ | ✅ | ✅ ClienteEditSheet | ✅ soft |
| Pazienti | ✅ | ✅ | ✅ PazienteEditSheet | ✅ archivia |
| Listino | ✅ | ✅ | ✅ ListinoEditSheet + inline | ✅ soft |
| Tecnici | ✅ invite | ✅ | ✅ TecnicoEditInline | ✅ disattiva (attivo=false) |
| Magazzino | ✅ | ✅ | ✅ PATCH API | ✅ soft |
| Fatture | auto | ✅ | — | — |
| Ordini | ✅ | ✅ | ✅ | ✅ |

---

## 3. Sessione 22/05/2026 — Completamento V1.8.0

### Fix critici
- Bug magazzino/[id]/page.tsx — colonne corrette (`codice_articolo`, `nome`, `scorta_attuale`, `um_scarico`)
- NEXT_PUBLIC_SUPPORT_PHONE — normalizzazione `+` per URL `wa.me`

### Security
- Push notification triggers: `orchestrate.ts` → front_desk, `segnala` → titolare, `prove` → tecnico
- `trigger.ts` helper con `triggerPushByRole` e `triggerPushToUser`

### CRUD completo
- Pazienti PATCH + edit bottom sheet (codice_paziente, note, anamnesi, asl, sesso, data_nascita)
- Listino edit bottom sheet (nome, codice, prezzi 1-4, categoria, UM)
- Magazzino PATCH + DELETE API
- Tecnici PATCH + deactivate (lab_memberships.attivo=false)

### Dark mode (27 file fixati)
LavoroCard, StatoBadge, TabProve, TabProduzione, Dashboard*, BottomNavPill, UserProfileSheet, OrdiniList, PasskeyModal e altri

### UX completamento
- Error boundaries: `ErrorPage.tsx` + `error.tsx` su 33 pagine (ogni crash mostra "Riprova")
- Loading skeletons: 100% copertura (11 pagine mancanti aggiunte)
- Splash screens iOS: 7 PNG per tutti i modelli iPhone (SE → 14 Pro Max)

### Documento collaudo
`docs/test-filippo/COLLAUDO-HANDOFF-FILIPPO.md` — lista sistematica di tutti i test da fare con Filippo, inclusa procedura FatturaPA sicura (validazione senza invio SDI reale)

---

## 4. Cosa NON è stato fatto (V2)

| Feature | Motivo |
|---------|--------|
| Sezione `/rete` multi-lab | Architettura multi-tenant da progettare |
| PMCF follow-up automatico | Email automation avanzata |
| STS XML export | Solo se fattura diretta al paziente |
| Firma digitale P7M | Richiede integrazione AgID |
| CAPA ISO 13485 | Solo se Filippo richiede certificazione |
| Colorazione 4D | Feature di nicchia |
| Terzismo inter-lab | Richiede rearchitettura tenant |
| SDI diretto | Richiede accordi con HUB SDI |
| Fascicolo Tecnico MDR | Poco uso quotidiano |
| Terzismo DdC (altri esecutori) | Rischio MDR basso |
| WhatsApp Cloud API ufficiale | Deep links `wa.me` già sufficienti |
| Nota di credito XML (TD04) | Raro, gestibile manualmente |

---

## 5. Architettura — Decisioni Critiche

- **RLS:** `public.current_lab_id()` (NON `auth.current_lab_id()`)
- **Invite flow:** token custom `/invite/[token]` (NON `inviteUserByEmail`)
- **PEC Vault:** `upsert_pec_vault_secret` + `get_pec_vault_secret` solo service_role
- **Rifacimento:** RPC `crea_rifacimento_atomico()` — consente stato 'consegnato'
- **PATCH API:** sempre allowlist esplicita, mai blocklist
- **Onboarding:** NO `redirect('/onboarding')` nel layout — solo banner dashboard
- **Template PDF:** `no-unescaped-entities` OFF per `pdf/**`
- **ESLint CI:** `--max-warnings 0`
- **WhatsApp:** deep links `wa.me` (ToS-compliant). NO open-wa.
- **Fatture:** generate durante `orchestraConsegna`. `incluso_in_fattura` = discriminatore "già fatturato".
- **Push Notifications:** VAPID keys in `.env.local`, tabella `push_subscriptions`.
- **Service Worker:** `public/sw.js` è **generato automaticamente** (gitignored) da `scripts/generate-sw.mjs` a partire da `scripts/sw-template.js` (fonte vera, tracciata) — hook npm `prebuild`/`predev`. MAI modificare `public/sw.js` a mano, si perde ad ogni build. `CACHE_NAME` = `ua-<build-id>` (git sha su build reali, `ua-dev` in sviluppo) — versioning automatico, sostituisce il vecchio bump manuale `ua-v1→ua-v2` (03/07/2026, A4).
- **Tecnici:** NON si cancellano — `lab_memberships.attivo = false` per disattivare.

---

## 6. Design System v2.2 Warm Panna

```
Light: --bg:#DDD8D3  --sfc:#E4DFD9  --elv:#EDEDEA  --prs:#D4CFC9
       --primary:#D90012  --gold:#D4A843  --cobalt:#1B2D6B (solo nav pill)
Dark:  --bg:#1A1916  --sfc:#222019  --elv:#2C2A27   --primary:#E8001A
Font:  DM Sans (MAI Inter) · Shadow: dual-layer warm-tinted
Motion: src/design-system/motion.ts — UNICA FONTE (tokens: instant/fast/normal/slow/expressive/celebration/skeleton)
```

---

## 7. API Routes Chiave (v1.8.0)

| Route | Descrizione |
|-------|-------------|
| `/api/impostazioni` PATCH | Dati lab (allowlist esplicita) |
| `/api/impostazioni/pec/start-verify` POST | Salva PEC + invia email verifica |
| `/api/impostazioni/pec/verify-status` GET | Polling verifica PEC |
| `/api/clienti/[id]/dpa` GET | PDF DPA GDPR Art.28 |
| `/api/clienti/[id]/portale-token` GET | Token portale dentista |
| `/api/admin/invite` POST | Crea invito + email Resend |
| `/api/lavori/[id]/rifacimento` POST | Rifacimento atomico |
| `/api/qualita/psur` GET/POST | PSUR |
| `/api/fatture/export` GET | CSV fatture (?year=YYYY) |
| `/api/fatture/batch` POST | Fatturazione batch N lavori |
| `/api/lavori/pronti-da-fatturare` GET | Lavori consegnati non fatturati |
| `/api/notifications/subscribe` POST | Push subscription VAPID |
| `/api/tecnici/[id]/deactivate` POST | Disattiva tecnico (attivo=false) |
| `/api/pazienti/[id]` PATCH/DELETE | Edit e archivia paziente |
| `/api/magazzino/[id]` PATCH/DELETE | Edit e archivia articolo magazzino |
| `/api/listino/[id]` PATCH/DELETE | Edit e soft-delete voce listino |

---

## 8. Infrastruttura

| Servizio | Stato |
|----------|-------|
| Resend · `uachelab.com` | ✅ Verificato Cloudflare eu-west-1 |
| Cloudflare Email Routing catch-all | ✅ → Worker `ua-pec-verify` |
| Supabase MCP | ✅ Autenticato (OAuth ChatGPT `francesco.formicola@live.it`) |
| VAPID keys | ✅ In `.env.local` (gitignored). DB migration applicata. |
| Splash screens iOS | ✅ In `public/splash/` (7 PNG) |
| Trial Filippo | ✅ Prorogato (22/05/2026) |

---

## 9. Stripe

- Lab monthly: `price_1TWCfaRsMhN7mg7YVt0UfeNB`
- Lab yearly: `price_1TWCfbRsMhN7mg7Y7Ejl1k5w`
- Rete monthly: `price_1TWCfbRsMhN7mg7YDXKFJkdN`
- Rete yearly: `price_1TWCfcRsMhN7mg7YBZSz1gId`

---

## 10. Regole CI

```bash
npx eslint src/ --ext .ts,.tsx --max-warnings 0  # husky pre-commit
npx tsc --noEmit                                  # dopo ogni modifica
# Dopo migration Supabase (via MCP o CLI):
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
npx tsc --noEmit
# Seed nuovo lab:
npx tsx scripts/seed-new-lab.ts <laboratorio_id>
# Rigenera splash screens:
node scripts/generate-splash.mjs
```

---

## 11. Dati Importati (lab Filippo — 971061a1)

- 20 clienti · 74 lavorazioni × 4 fasce prezzo
- 187 materiali magazzino · 40 attrezzature
- 277 lavori storici 2018-2026
- 134 cicli produzione · 371 fasi produzione
- €56.351 fatturato YTD 2026 (Gen-Apr) → stima ~€170k anno
- Top: implantoprotesi (38.4%) + scheletrato (27.8%)
