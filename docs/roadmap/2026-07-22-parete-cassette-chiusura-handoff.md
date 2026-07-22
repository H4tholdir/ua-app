# Handoff — Parete delle Cassette: FASI DI CHIUSURA
**Data:** 22/07/2026 · **Per:** sessione NUOVA a contesto pulito
**Stato:** Task 1→19 **TUTTI COMPLETI** con review chiuse, più 4 extra ratificati. Restano SOLO le
fasi di chiusura: FASE 7 → review finale whole-branch → FASE 9 QA → FASE 9b L2 → 🛑 STOP merge → BP-1.

## Dove siamo in 30 secondi

Worktree `.claude/worktrees/parete-cassette`, branch `worktree-parete-cassette`, **55 commit** da
`main` @ `4853458`. **Niente mergiato né pushato.** HEAD al momento della scrittura: `1ff60e4`
(+1 commit del fix flake in arrivo, v. sotto). Suite: **2718 verdi netti / 19 skipped**, `tsc` 0,
DS-compliance verde. 4 migration applicate al DB live; seed E2E eseguito (lab E2E popolato 6/2/1).

## Come ripartire

1. **Leggi il ledger:** `.superpowers/sdd/progress.md` (worktree, git-ignored, ~1300 righe). È la
   mappa di recupero: fidati di quello e di `git log`, non della memoria. La sezione «Chiusura
   d'ondata — stato coda» in fondo è la to-do list esatta.
2. **Handoff precedente** (vincoli d'ondata, ancora TUTTI validi): `docs/roadmap/2026-07-21-parete-cassette-ripresa-task11.md` — i 12 vincoli pagati con difetti veri (test in `tests/unit/`,
   postgrest thenable pigro, RPC-only sulle tabelle Parete, pre-commit con tsc intero, ecc.).
3. **Skill:** `superpowers:subagent-driven-development` per i fix; la review finale usa
   `superpowers:requesting-code-review` (package: `scripts/review-package 4853458 HEAD`).

## ✅ Fix flake: COMMITTATO (`b9ba8cf`) — ma leggi la nota sulla fragilità residua

Il flake di `avviso-caricamento-vuoto.test.tsx` è chiuso: fix A+B (diagnosi validata in
`.superpowers/sdd/diagnosi-flake-vitest.md`), **9/9 run di contesa verdi** (3 round × 3 suite in
parallelo) e run finale singola tutta verde (2718/19, 0 falliti).
**⚠️ Nota per la review finale:** sotto la stessa contesa 3× sono comparsi fallimenti VARIABILI in
altri file fuori mandato (`pill.test.tsx` — già censito — più ChipScelta, FrameFatto, PassoTipo,
ProgressDots, WizardNuovoLavoro, CardLavoro, campo, catalogo, pila-striscia, racconto,
tile-avatar-cerca, tasti-secondari, parete-client; insieme variabile fra i 9 run). Probabile stessa
classe di fragilità da tempo-di-parete. **In condizioni CI normali (una suite alla volta) la suite è
verde**; la contesa 3× è uno stress artificiale. Da valutare alla review finale se applicare la
stessa cura (fake timers / skipAnimations) come intervento di classe, o censire e monitorare.

## Le ratifiche di Francesco del 22/07 (tutte già implementate)

1. **S2 — trascinamento COMPLETO touch incluso** (Task 13, commit `33a7721`+`0d8291b`). Ricerca
   dedicata agli atti: `.superpowers/sdd/ricerca-drag-touch.md` (fondata, 57/57 agenti; la versione
   `-SCARTATA-` è un artefatto corrotto da errori di rete: NON usarla).
2. **Doppio tap del colore custom** (Task 12) — ratificato.
3. **Ricerca globale della parete** (commit `19b1267`) — pagliaio esteso a tipo leggibile + colore.
4. **Deroga tastiera** — il riordino/sheet da tastiera è DEFERITO fuori ondata (il mouse replica il
   touch). Mockup affordance agli atti. Spec §12 già emendata. WCAG 2.1.1/2.5.7 scoperte sulle
   occupate: deciso dal proprietario, a verbale.
5. **4 miniature ratificate in due giri** (commit `fe9e184`): allineatore A · mascherina B ·
   riparazione C · generica D. Geometrie byte-identiche alla legenda
   `docs/design/mockups/2026-07-21-miniature-estensione-legenda.html`.
6. **Deep-link `?stanza=` vince sempre** (review Task 14): `pile`+`?stanza=parete` → pager sulla
   parete (forma nuova MAI vista in browser → QA).
7. **📌 Direttiva post-ondata:** un simbolo per ciascuno dei **38 tipi** + **legenda in-app**
   (pulsante «?» → Sheet). Ondata nuova a sé — impianto proposto nel ledger (sistema per famiglie,
   ratifiche a blocchi). NON di questa ondata.

## Prova su device (22/07): PROMOSSA

Francesco ha provato il prototipo su **iPhone e Android**: «funziona perfettamente». Il rischio
residuo n.1 della ricerca (long-press vs scroll) è chiuso con evidenza di campo. L'auto-scroll ai
bordi NON era nel prototipo ma È nell'app (Task 13): **da verificare in FASE 9 su device**.
Prototipo pubblicato: https://claude.ai/code/artifact/5bfe1117-58ec-47a7-aac9-0cb0042a39b6

## Le fasi di chiusura, in ordine

### 1. FASE 7 (= Task 19 Step 3) — output reali
`npx tsc --noEmit` → 0 · `npx vitest run` → tutte verdi · `npx next build` → OK ·
`bash scripts/check-ds-compliance.sh` → OK. Se il flake ricompare DOPO il fix, non è più «noto»:
è una regressione, indagare.

### 2. Review finale whole-branch (opus, il modello più capace)
Package: `scripts/review-package 4853458 HEAD`. **Puntala alla coda dei Minor deferiti nel ledger**
(sezione per sezione, cercare «Minor rinviati» / «rinviati alla review finale») — NON ricominciare
da capo. Voci extra accumulate: `pill.test.tsx` timeout sotto carico (rende l'intero catalogo,
valutare testTimeout dedicato) · verifica end-to-end aggancio auto-riparazione (nota review Task 9) ·
«1 cassette» n=1 (decisione dizionario) · fallback `nomeOccupata` «La null…» (Task 16) ·
`aria-pressed` sul pending del colore custom (Task 12) · annuncio SR pre-POST del drag (Task 13).

### 3. FASE 9 — QA browser, lab E2E `00000000-0000-0000-0000-000000000001` (MAI lab Filippo)
Scenari spec §15 (crea/rinomina/butta via 409, assegna chip+nome, consegna→liberazione, annullo→
riassegnata, rifacimento→trasferimento, segna-libera, sposta-in, ricerca accende, riordino,
preferenza 3 modi + `?stanza=`, auto-riparazione, PWA iOS edge-swipe, zoom testo 200%). **Aggiunte
di questa sessione:** auto-scroll del drag su device (entrambe le direzioni) · `pile`+`?stanza=parete`
(pager mai visto) · «Salva il colore» dentro lo Sheet vero · le 10 miniature nelle cavità reali ·
riga conteggio «{n} cassette accese» (decidere vedendola: visibile o sr-only) · tile «+» che sparisce
durante la ricerca (difesa debole, rivalutare) · targa `max-width:6ch` e shadow dark (mai viste).
Il seed è già girato; per rieseguirlo: `npx tsx scripts/seed-e2e.ts` (idempotente, serve
`SUPABASE_DB_URL` in `.env.local` per la purga owner).

### 4. FASE 9b — GATE ESTETICO L2
Checklist `docs/design/audit-ui-ux/CHECKLIST-DS-V3-UI-UX.md`, 390/768/1280 × light/dark, confronto
col mockup v2 (fedeltà TOTALE). Screenshot in `docs/design/screenshots/2026-07-21-parete-cassette/`.

### 5. 🛑 STOP — presentare a Francesco review+QA+L2. **Merge/push SOLO su sua richiesta esplicita.**
Al merge: i documenti della Parete esistono anche come file non tracciati nel main tree — rimuoverli
da lì prima del merge o git rifiuta (v. handoff 21/07, sezione «Due cose da ricordare al merge»).

### 6. FASE 11 — BP-1 nel main tree: MEMORY.md + ROADMAP-UFFICIALE.md (+ voce ondata «Miniature 38
+ legenda» e D-11 già nel backlog tecnico).

## Lezioni operative di questa sessione (da non ripagare)

- **Un artefatto esiste ≠ è fondato:** incrociare SEMPRE il journal di un workflow
  (`agents_done`/`failures`) col documento prodotto (il caso `ricerca-drag-touch-SCARTATA`).
- **Un esito di tool che contraddice l'utente si verifica alla fonte** (il falso «chip già avviato»
  che ha fatto fermare l'unico investigatore del flake).
- **Mai due implementer/commit concorrenti sul branch**: lint-staged fa stash/unstash del
  non-staged e può corrompere il lavoro in volo di un altro agente.
- **Nei dispatch, mai citare istruzioni a voce come «documenti che vincono»**: un implementer le ha
  prese per autorità sopra il piano (review Task 14 §0).
