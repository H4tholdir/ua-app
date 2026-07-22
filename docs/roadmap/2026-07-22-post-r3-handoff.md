# Handoff — Dopo Collaudo R3/R3b (22/07 notte)
**Per:** sessione NUOVA a contesto pulito. Base: main ≥ `b2081f1`. R3+R3b deployati e verificati in prod.
**Prassi:** BP-0 → per ogni intervento il percorso §0C che gli spetta (worktree, TDD, review, QA, 🛑 ratifiche).

## Stato chiuso stanotte (non riaprire)
- **P9 CHIUSO** e confermato da Francesco su device: era il ghost click di Chrome Android sullo scrim
  appena montato (root cause provata con touch CDP) → `useTapScrim` su Sheet+DialogConferma.
- **D-2 chiuso** (respiro 36px, misurato sull'estensione reale dell'ombra: 28px).
- **P-STATUSBAR risolto**: la status bar era innocente — era la **zona morta della scala
  device-corti** (Chrome 699≤700 compatta, PWA 755>700 scala piena ~900px). Fix R3b: soglia
  700→780 + compatta 744px misurati. Prod verificata no-scroll a 375×755.

## Da fare, IN ORDINE

### 0. ~~Verifica device + rimozione overlay diagnostico~~ — ✅ CHIUSO il 22/07 notte
Francesco ha confermato: home senza scroll nella PWA. Overlay RIMOSSO e deployato in questa
stessa sessione (componente+helper+test+mount). Non c'è più nulla da fare qui.

### 1. Mini-giro «gap cassette tablet» (design-first, regola 0B)
Segnalazione device: spaziatura della griglia cassette su tablet da rivedere. Percorso: mockup HTML
multipli (varianti tra cui scegliere, light+dark, MAI una sola) in `docs/design/mockups/` →
screenshot → scelta di Francesco → poi codice.

### 2. Flake vitest — intervento di classe (test-only, nessun rischio prod)
`MotionGlobalConfig.skipAnimations` su tutta la suite col protocollo A/B già scritto in
`.superpowers/sdd/diagnosi-flake-vitest.md` (git-ignored, nell'albero main); include il timeout di
`pill.test.tsx` sotto carico. In coda da 3 ondate: farlo PRIMA che la suite cresca ancora.

### 3. Ondata «iOS fluidità» (triage 22/07 punti 1, 2, 8)
Animazioni scattose · sheet senza enter-animation E senza swipe-down su iOS · drag non fluido.
Serve indagine WebKit dedicata con profiling SUL device (systematic-debugging: riprodurre e
misurare prima di toccare). Il drag-to-dismiss dello Sheet ora esiste (§5.16) — verificare su iOS.

### 4. Ondata «Redesign parete/home» (design-first, percorso Grande)
Contenuti già ratificati/registrati: stanza-anteprima home SPARISCE, swipe → `/cassette` · ricerca
«filtra e risali» · «Metti un lavoro» nello sheet della cassetta libera · griglia parete come RETE
METALLICA vera (foto portacassette di riferimento) · suono sposta/ri-aggancia (`v3/sound.ts`) ·
peek 28px nascosto + bounce laterale dopo idle · punti 4/6/12 del triage (striscia saluto, ricerca,
targhe che clippano). **Input nuovo da R3b (misure):** la scala PIENA della home è ~900px
intrinseci a 375w (870 a 390w) — non entra quasi su nessun device: il dimensionamento verticale va
ripensato FLUIDO (non a gradini di media query) dentro questa ondata.

### Dopo (ordine invariato in ROADMAP)
«Miniature 38 + legenda in-app» → D-11 purga per-tenant (panel con lente normativa) → coda lunga:
A8 email Resend · sessione DB (A20 + O4b + RPC orfana `outbox_prepara_draft`) · ricalibrare e
togliere `PERF_BUDGET_LOGIN_MODE=warn` (finestra ~7-14gg dal 20/07) · backlog §B (es. B20 PSUR per
classe di rischio, design session).

## Promemoria operativi
- Worktree: `.claude/worktrees/<nome>`, branch `worktree-<nome>`; copiare `.env.local` e `.env.test`.
- QA con tap touch REALI: `page.touchscreen.tap` / CDP `Input.dispatchTouchEvent` — il
  `locator.click()` di Playwright NON riproduce i bug da gesto (lezione P9).
- Utente QA: `e2e-titolare@ua-test.local` (password in `.env.test`; seed idempotente
  `npx tsx scripts/seed-e2e.ts`).
- Screenshot di collaudo: `git add -f` (i .png sono in .gitignore).
