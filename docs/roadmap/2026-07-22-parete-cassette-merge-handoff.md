# Handoff — Parete delle Cassette: MERGE RATIFICATO (FASE 10 + FASE 11)
**Data:** 22/07/2026 sera · **Per:** sessione NUOVA a contesto pulito
**Stato:** TUTTE le fasi di chiusura COMPLETE. Francesco ha **RATIFICATO il merge** (22/07, a
verbale in `docs/design/decisions/2026-07-21-parete-cassette-ratifiche.md`, sezione finale).
Questa sessione esegue SOLO: FASE 10 (merge→push→CI→verifica) e FASE 11 (BP-1).

## Stato del branch in 30 secondi

Worktree `.claude/worktrees/parete-cassette`, branch `worktree-parete-cassette`, **58 commit** da
`main` @ `4853458`, HEAD `6a11038`. Suite **2725 passed / 19 skipped / 0 failed** · `tsc` 0 ·
`next build` OK · DS-compliance OK. Review finale whole-branch: «Merge-ready: Sì» (re-review
inclusa). QA FASE 9 PASS. Gate L2 PASS. Ledger completo: `.superpowers/sdd/progress.md` (worktree,
git-ignored) — sezione «SESSIONE DI CHIUSURA» in fondo.

Ultimi 4 commit: `6a11038` (fix L2: chips dark + clamp miniatura) · `aeb4316` (testo catalogo) ·
`5ec14f4` (5 fix review finale) · `c37698e` (handoff precedente).

## FASE 10 — sequenza esatta

1. **Pre-merge, nel MAIN TREE** (`ua-app/`): rimuovere le copie NON tracciate dei doc Parete che
   esistono anche nel branch (altrimenti il merge/checkout rifiuta). Individuarle con
   `git -C ua-app status --porcelain` incrociato con i file del branch (`git -C <worktree> ls-files
   docs/`); v. anche handoff 21/07 «Due cose da ricordare al merge».
2. **Nel worktree**: committare la riga `.gstack/` in `.gitignore` (RATIFICATO da Francesco:
   commit consapevole, messaggio `chore(repo): ignore .gstack tool dir`).
3. Merge su main (fast-forward o merge commit secondo prassi repo), push `origin main`.
4. Attendere CI verde (⚠️ MAI deployare con CI rosso). Se il flake ricompare in CI DOPO il fix
   `b9ba8cf`, non è più «noto»: indagare prima di riprovare.
5. Verifica su https://uachelab.com (smoke: /cassette carica, login ok).
6. Rimozione worktree solo a merge verificato.

## FASE 11 — BP-1 (main tree)

- **MEMORY.md**: ondata Parete delle Cassette COMPLETATA e in produzione (pagina `/cassette`,
  API/RPC cassette, drag touch completo, 10 miniature, seed E2E, preferenza home 3 modi).
- **ROADMAP-UFFICIALE.md**: spostare l'ondata in «implementato»; aggiungere/verificare le voci:
  1. Ondata nuova «**Miniature 38 + legenda in-app**» (direttiva Francesco 22/07 — impianto
     proposto nel ledger: sistema per famiglie, ratifiche a blocchi, TastoTondo «?» → Sheet legenda).
  2. **Intervento di classe sul flake vitest** = PRIMO task post-merge (commit test-only,
     `MotionGlobalConfig.skipAnimations` su tutta la suite col protocollo A/B di
     `.superpowers/sdd/diagnosi-flake-vitest.md`; include `pill.test.tsx`).
  3. **D-11** purga per-tenant (già nel backlog tecnico — verificare).
  4. Aggiornare la checklist L2 §4 (dice «DM Sans», la spec v3 prescrive Plus Jakarta Sans).
- **SESSION_ACTIVE.md**: aggiornare a fine sessione.

## Ratifiche del 22/07 sera (già implementate, solo da NON riaprire)

- Riga conteggio ricerca «{n} cassette accese»: **VISIBILE** (com'è).
- Testo striscia n=1: «UÀ ha creato 1 cassetta dai tuoi lavori» — ratificato.
- **Censimento UI/UX istituito**: `docs/design/audit-ui-ux/CENSIMENTO-UI-UX.md` (11 voci seminate
  da review+L2). Regola: difetti estetici si CENSISCONO lì, si risolvono quando si tocca la
  superficie — non si fixano al volo.

## Dopo il deploy (a carico di Francesco, in produzione)

Prova su device del drag con auto-scroll ai bordi (entrambe le direzioni), PWA iOS edge-swipe,
consegna→liberazione+racconto e annullo in uso reale. Sono gli unici scenari QA non riproducibili
in browser (motivazioni nel ledger, sezione FASE 9).

## Lezioni operative (dalla sessione di chiusura — si sommano a quelle del 22/07 mattina)

- Il long-press in QA headless si simula con PointerEvent sintetici in DUE chiamate separate
  (down → sleep 0.7 → up); il tap sulla cassetta occupata NAVIGA al lavoro, lo sheet è dal long-press.
- Il tema si forza con `localStorage['ua-theme']` + classi su documentElement + reload
  (ThemeInitializer). L'emulazione CDP prefers-color-scheme non è nell'allowlist del tool browse.
- I componenti ds NON si modificano per un contesto: si scopa via CSS
  (`[data-theme="dark"] [data-ds="v3"] .ds-sheet …` rimappando le variabili) — pattern del fix L2.
