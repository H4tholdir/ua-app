# Handoff — Ripresa ondata «Redesign parete/home» dal Task 15 (24/07 sera)

**Per:** sessione NUOVA a contesto pulito. **Prassi:** BP-0 → `superpowers:subagent-driven-development`
(un subagent fresco per task/fix, review a due stadi — come da handoff originario del 23/07).
**⚠️ Direttiva permanente «Come parlare con Francesco»** (CLAUDE.md §7 / ua-app §0D) — sempre.
**⚠️ rm-guard ATTIVO** (v2, incidente 24/07): cancellazioni ricorsive fuori dalle aree temporanee
vengono deviate su `trash` (Cestino). Nei dispatch ai subagent: mai `rm -r` fuori scratchpad.

## Base di lavoro (NON ricreare niente)

- **Worktree ESISTENTE:** `.claude/worktrees/redesign-parete-home`, branch `worktree-redesign-parete-home`,
  ultimo commit **`47b3311`**. `.env.local`/`.env.test` già copiati. Suite baseline: **2865 verdi, tsc 0, build ok**.
- **Ledger (mappa fedele di tutto):** `<worktree>/.superpowers/sdd/progress.md` — contiene anche i
  **Minor accumulati per la review finale** (NON perderli: la review whole-branch del T17 li triaggia).
- Report per task/fix: `<worktree>/.superpowers/sdd/task-N-report.md` e `fix{A,B,C}-report.md`.
- Su **main** non pushati: `8b8dd40`+`2b069f0` (rm-guard) — spingerli col prossimo deploy.

## Stato (verificato, double-check su ledger + git log)

- **Task 1-14: COMPLETI e approvati** (T12 embed poi SUPERATO dall'intervista, vedi sotto).
  Commit: T1 `20d1949` · T2 `6a985bb` · T3 `8763bcb`+suoni ratificati `ee4da5e` · T4 `4eca6ef` ·
  T5 `6d8f86e` · gate striscia `5fc5a84` (F2+V1) · gate rete `4ac2e77` (R3 P44+G2+targa+T2+O1) ·
  T8 `5ed15f2` · T9 `003f399` · T10 `ac81fdd` · T11 `cc473dc` · T12 `c0467c7`+cleanup `1655517` ·
  T13 `fdd2e4c` · T14 `cb993ab`+`9cc9cc7`+fix Critical `ff65f21`.
- **Task 15 (QA device): IN CORSO.** Verbale + fix-list + addendum intervista:
  `docs/design/decisions/2026-07-24-qa-device-meta-ondata.md` (nel worktree) — È LEGGE per i fix.
  - **FIX-A `64ad11d` ✅ review APPROVED** (opus): lo swipe dalla home porta alla PAGINA /cassette
    VERA (assetto completo, pushState senza loading, back→pile). Supera la D2 originale.
  - **FIX-B `e3653ed`+`607264a` ✅ codice APPROVED**: piede compattato (28.8%@660 — target 20%
    NON raggiunto, opzioni P1/P2/P3 sotto), scrollbar invisibile, muro=fondo pagina, tile
    «+Nuova cassetta» leggibile, clip gancio risolto (traccia 5·passo=220, snap salvo).
  - **FIX-C `a0be3f9`+`a8dc937` ⚠️ REVIEW NON ANCORA FATTA → PRIMA AZIONE della nuova sessione.**
    Contenuto: suoni (causa vera: `initSuoni()` mai chiamato in superfici reali — sbloccato ora nel
    percorso home), guardia niente-focus-ricerca su touch (PREVENTIVA: nessun bug osservato in
    codice), back dalla scheda→cassette (verificato solo con harness senza login).

## Sequenza per la nuova sessione

1. **Review FIX-C** (pattern due-stadi: `scripts/review-package a0be3f9^ a8dc937` → reviewer con
   template task-reviewer; adjudicare: causa suoni vera? guardia focus corretta? back robusto?).
   Eventuali fix → fix subagent → re-review.
2. **Build + server per il ri-collaudo:** nel worktree `npx next build` poi
   `npx next start -p 3020 -H 0.0.0.0` (bg) · IP: `ipconfig getifaddr en0` · seed già fatto
   (`npx tsx scripts/seed-e2e.ts`, idempotente) · utente `e2e-titolare@ua-test.local`.
3. **🛑 RI-COLLAUDO DEVICE di Francesco** — checklist da fargli verificare/decidere:
   - suoni stacco/riaggancio a orecchio nel drag (fix C)
   - tastiera/focus ricerca su mobile (guardia preventiva — se sale ancora, causa altrove)
   - **back dopo navigazioni interne dal pannello** (tap cassetta→scheda→back; ☰→back) CON login —
     unico Important aperto della review FIX-A
   - piede home: **P1** tenere 28.8%@660 · **P2** ridurre/togliere etichetta «Nuovo lavoro» in home
     (leva NON ratificata, quindi libera) · **P3** derogare sulla ghiera del TastoPiù (serve ratifica)
   - traccia 220 (5 maglie): meno cassette per schermata — trade-off a vista
   - overflow residuo invisibile 50px@660 — accettare o comprimere ancora
   - sfondo muro=pagina, tile Nuova cassetta, intestazione parete, zona bassa: conferma a vista
   - cosmetici da menzionare: deep-link `?stanza=parete` mostra chrome /cassette con URL dashboard;
     forma «solo parete» ora senza piede (da ratificare); azioni esplicite dal pannello (crea/rinomina/
     riordina cassetta) atterrano sulla pagina /cassette vera (coerente, dichiarato)
   - Esito → APPEND al verbale QA + chiudere il 🛑 T15.
4. **Task 16 — striscia** (valori RATIFICATI, copiare verbatim): forma F2 dal mockup
   `docs/design/mockups/2026-07-24-striscia-home.html`, coreografia V1 dalla demo
   `2026-07-24-striscia-animazioni.html`, verbale `decisions/2026-07-24-striscia-home.md`.
   Brief dal piano (task 16) con override: molle V1 per livello (urgenza bouncy, racconto smooth
   fade+rise, trial senza rimbalzo), racconto tappabile su tutta la card, dedup eventoId, silenzio.
5. **Task 17 — chiusura**: FASE 7 (tsc+vitest+build output reali) · FASE 8 review WHOLE-BRANCH
   (merge-base main: includere la LISTA MINOR dal ledger) · FASE 9 QA Playwright 390/768/1280×2 temi
   · FASE 9b GATE ESTETICO L2 (checklist docs/design/audit-ui-ux/) · 🛑 merge SOLO su parola di
   Francesco · FASE 11 BP-1 (MEMORY 40 + ROADMAP).

## Da non dimenticare (coda varia, double-check fatto)

- Spec DS v3 §9.1: tabella dice ancora «5 suoni» (ora 7) — allineare con ratifica in T17/BP-1.
- `ds-v3-catalogo`: 7 literal demo senza `paziente` mostrano «—» (follow-up rapido).
- Dead code/commenti stale (nel ledger): `footer` prop StanzePager · commento peek StanzePager:13 ·
  commento ds-v3.css ~626 · `.foot gap` dead · prosa `align-self` nel verbale rete.
- Taratura fine demandata: SOGLIA_NOME_LUNGO=20 · coefficienti clamp home · clamp passo-maglia
  (SVG light fisso a 44 — limite noto documentato).
- Candidati WAV in `public/sounds/candidati/` restano agli atti (i ratificati sono i file di Francesco).
- Dopo l'ondata (ROADMAP invariata): iOS fluidità 🛑 device · Miniature 38+legenda · D-11 purga ·
  coda lunga (A8 Resend · sessione DB · perf-budget · §B).
