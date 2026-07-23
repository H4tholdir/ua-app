# Handoff — Esecuzione ondata «Redesign parete/home» (23/07 sera)
**Per:** sessione NUOVA a contesto pulito. Base: main ≥ `5560833`.
**Prassi:** BP-0 → poi ESECUZIONE del piano via `superpowers:subagent-driven-development`
(scelta di Francesco, 23/07) — un subagent fresco per task, review a due stadi tra i task.
**⚠️ Direttiva permanente «Come parlare con Francesco»** (CLAUDE.md padre §7 / ua-app §0D):
ogni messaggio in chat in linguaggio piano, struttura a racconto, zero tecnicismi non spiegati.

## Cosa è stato chiuso nella sessione del 23/07 (non riaprire)
- **Brainstorming completo con Francesco** → decisioni D1-D8 (rete disegnata + gancetto,
  targa cassetta/dentista/paziente con alias>codice, striscia «solo quando serve + racconti»,
  due suoni, linguetta C2, 3 modi home con parete vera embedded, pile centrate, scala fluida).
- **Spec RATIFICATA (rev. 2):** `docs/superpowers/specs/2026-07-23-redesign-parete-home-design.md`
  — panel advisor 3× CONFERMATA CON RISERVE, 23 riserve INTEGRATE (§8 = verbale); divergenza
  suono-su-annullo composta e ratificata (ri-aggancio attenuato se lo stacco era stato suonato).
- **Mockup linguetta C2 ratificato:** `docs/design/mockups/2026-07-23-invito-swipe-linguetta-rifinita.html`
  (variante C2 basso-destra; C1 e le varianti A/B/D scartate — screenshot agli atti).
- **Piano di implementazione:** `docs/superpowers/plans/2026-07-23-redesign-parete-home.md`
  — 17 task TDD in 4 fasi, commit `5560833`. Il piano è LEGGE: codice completo per task,
  valori mockup-gated marcati («i valori ratificati VINCONO, copiati verbatim»).

## Come eseguire
1. **Worktree dedicato:** `.claude/worktrees/redesign-parete-home`, branch
   `worktree-redesign-parete-home`; copiare `.env.local` e `.env.test`. Baseline: suite
   intera verde + `tsc` 0 PRIMA del Task 1 (registrare i numeri).
2. **Ordine dei task: 1→17, nessun salto.** La Fase A (1-5) non ha gate visivi; i Task 6-7
   (mockup) possono partire già dopo il Task 3 se si vuole parallelizzare l'attesa delle
   ratifiche, ma MAI iniziare la Fase C/D senza le ratifiche dei rispettivi mockup.
3. **I 🛑 del piano** (fermate con parola di Francesco): gate d'ascolto suoni (Task 3 Step 9)
   · ratifica mockup rete+gancetto+targa (Task 6) · ratifica mockup striscia (Task 7) ·
   QA device di metà ondata (Task 15) · merge finale (Task 17 Step 5).
4. **Guardie test:** le abrogazioni di `parete-fluida.test.ts` sono PRESCRITTE nel piano
   (Task 8 adegua, Task 12 abroga assert 5 con decision record, Task 14 nuova guardia home).
   MAI «sistemare» una guardia fuori da questi tre punti.
5. **Nessuna migration.** Se un task sembrasse richiederne una: STOP, tornare da Francesco.

## Promemoria operativi (ereditati, validi)
- Dev server dei worktree: il preview pane parte dal repo principale — per servire il
  worktree usare l'harness Playwright con `webServer.cwd` sul worktree (pattern del 23/07).
- Utente QA: `e2e-titolare@ua-test.local` / fixture `scripts/seed-e2e.ts` riga 201 —
  ⚠️ la `E2E_EMAIL` in `.env.test` è STALE. Seed idempotente: `npx tsx scripts/seed-e2e.ts`.
- QA con tap touch REALI (`page.touchscreen.tap` / CDP) — `locator.click()` non riproduce
  i bug da gesto. Screenshot di collaudo: `git add -f` (i .png sono in .gitignore).
- Mockup dei Task 6-7: più varianti light+dark, screenshot Playwright agli atti, consegna
  via SendUserFile (render) — il pattern della linguetta del 23/07 è il riferimento.

## Dopo l'ondata (ordine ROADMAP invariato)
(3) «iOS fluidità» 🛑 resta bloccata sul device · «Miniature 38 + legenda in-app» ·
D-11 purga per-tenant · coda lunga (A8 Resend · sessione DB · perf-budget · §B).
