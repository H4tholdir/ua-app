# Handoff — Dopo punti 1 e 2 del post-R3 (23/07 notte)
**Per:** sessione NUOVA a contesto pulito. Base: main ≥ `e99d60e`. Tutto deployato e verificato in prod.
**Prassi:** BP-0 → per ogni intervento il percorso §0C che gli spetta (worktree, TDD, review, QA, 🛑 ratifiche).
**⚠️ NUOVA DIRETTIVA PERMANENTE (23/07):** ogni messaggio in chat a Francesco in linguaggio piano,
zero tecnicismi non spiegati — vedi CLAUDE.md padre §7 «Come parlare con Francesco» (+ eco in
ua-app/CLAUDE.md §0D). Vale da subito, per ogni tipo di messaggio, non solo i riepiloghi.

## Stato chiuso in questa sessione (non riaprire)
- **Punto 1 «gap cassette tablet» CHIUSO** — variante C «fluida» ratificata da Francesco e
  deployata (merge `799ed75`). Gap e cornice della parete di /cassette scalano con la larghezza
  (container query sulla shell; cqw sul CONTENT-BOX: coefficienti 3.6/3.8/3.2/3.4, tarati in QA).
  Home fuori perimetro (valori R3b intatti) con guardia `tests/unit/ds-v3/parete-fluida.test.ts`.
  Decisione: `docs/design/decisions/2026-07-22-gap-cassette-tablet.md` (con nota di onestà:
  finché le max-width della shell sono fisse, i valori reali sono 3 gradini 16/24.48/26).
- **Punto 2 «flake vitest» CHIUSO** — merge `ce877f3`: animazioni motion spente per tutta la
  suite in `tests/setup.ts` + budget 15s per i 13 file che renderizzano la pagina catalogo
  (helper `tests/unit/ds-v3/budget-catalogo.ts`). A/B 12/12 lane verdi vs CTRL 3/3 rosse.
  Diagnosi aggiornata: `.superpowers/sdd/diagnosi-flake-vitest.md` §8 (git-ignored, albero main).
  Debito registrato (non in scope): 13 file di unit pagano il render completo del catalogo.

## Da fare, IN ORDINE

### 3. Ondata «iOS fluidità» — 🛑 BLOCCATA sul device
Triage 22/07 punti 1, 2, 8: animazioni scattose · sheet senza enter-animation E senza swipe-down
su iOS · drag non fluido. **Dato nuovo (Francesco, 23/07): su iPhone 15 il ghost click NON c'è**
(P9/useTapScrim regge anche su WebKit) **ma le animazioni sono meno fluide che sul suo Xiaomi 17.**
Il device non è al momento disponibile: NON partire senza — systematic-debugging impone
riprodurre e misurare (profiling WebKit SUL device) prima di toccare qualsiasi cosa.
Il drag-to-dismiss dello Sheet esiste già (§5.16) — da verificare su iOS quando c'è il device.

### 4. Ondata «Redesign parete/home» (design-first, percorso Grande) — ESEGUIBILE ORA
Parte col brainstorming con Francesco (FASE 1-2). Contenuti già ratificati/registrati:
stanza-anteprima home SPARISCE, swipe → `/cassette` · ricerca «filtra e risali» · «Metti un
lavoro» nello sheet della cassetta libera · griglia parete come RETE METALLICA vera (foto
portacassette di riferimento) · suono sposta/ri-aggancia (`v3/sound.ts`) · peek 28px nascosto +
bounce laterale dopo idle · punti 4/6/12 del triage (striscia saluto, ricerca, targhe che
clippano). **Input R3b:** scala PIENA home ~900px intrinseci a 375w — dimensionamento verticale
da ripensare FLUIDO dentro questa ondata. **Input punto 1:** quando la shell diventerà fluida,
la formula clamp/cqw della parete /cassette diventerà continua da sola, senza ritocchi.

### Dopo (ordine invariato in ROADMAP)
«Miniature 38 + legenda in-app» → D-11 purga per-tenant (panel con lente normativa) → coda lunga:
A8 email Resend · sessione DB (A20 + O4b + RPC orfana `outbox_prepara_draft`) · ricalibrare e
togliere `PERF_BUDGET_LOGIN_MODE=warn` (finestra ~7-14gg dal 20/07) · backlog §B (es. B20 PSUR
per classe di rischio, design session).

## Promemoria operativi
- Worktree: `.claude/worktrees/<nome>`, branch `worktree-<nome>`; copiare `.env.local` e `.env.test`.
- Utente QA: `e2e-titolare@ua-test.local` / fixture di `scripts/seed-e2e.ts` riga 201 —
  ⚠️ la `E2E_EMAIL` in `.env.test` è STALE (`test@ua-lab.dev`), non usarla. Seed idempotente:
  `npx tsx scripts/seed-e2e.ts`.
- QA con tap touch REALI: `page.touchscreen.tap` / CDP — il `locator.click()` non riproduce i
  bug da gesto (lezione P9).
- Screenshot di collaudo: `git add -f` (i .png sono in .gitignore).
- Il dev server dei worktree: il preview pane parte dal repo principale — per servire il
  worktree usare l'harness Playwright con `webServer.cwd` sul worktree (pattern del 23/07).
