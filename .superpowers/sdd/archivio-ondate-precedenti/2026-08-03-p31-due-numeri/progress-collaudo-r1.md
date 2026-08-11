# Ledger SDD — Collaudo R1 (piano docs/superpowers/plans/2026-07-22-collaudo-r1.md)
Base branch: worktree-collaudo-r1 da main b6d9abe. Baseline: vitest 2725 passed / tsc 0 errori.
Task 1: complete (commits 347d81e+ed6a199, base b6d9abe, review clean dopo fix commento PareteClient)
  Minor (per review finale): AppHeader senza test dedicato Link→button · branch `typeof window` di torna-indietro.ts non testato
Task 2: complete (commits c3e8a76+507b2ab, base ed6a199, review clean dopo fix gap 12px)
  EMENDAMENTO PIANO (da riferire a Francesco al gate): lo snippet Task 2 diceva gap:8px ma l'originale era spazio.sm=12 — vince il requisito "layout ≥768 INVARIATO", applicato 12px.
  Minor (per review finale/QA): order:5 magic number · possibile line-break su "/" del titolo a 390px (verificare in QA) · verifica browser demandata a QA Task 8.
Task 3: complete (commit 7b337a9, base 507b2ab, review clean al primo giro; RED confermato esatto = ipotesi P9 validata)
  Minor (per review finale): teorico spostato stantio se uno scroll touch terminasse con pointerup senza click (irreale: termina con pointercancel).
Task 4: complete (commit ba34001, base 7b337a9, review clean al primo giro; facciaHex verificati vs gradienti reali ds-v3.css:341-346; sheet-test aggiornati preservando l'intento)
  Minor (per review finale): .ds-swatch-input senza override cursor su :disabled · test focusability solo negativo (assenza aria-hidden).
Task 5: complete (commit 0e6ee65, base ba34001, review clean al primo giro)
  Minor (per review finale): derivaFacciaCustom senza guard di formato (targaScura ce l'ha) — innocuo sui call site attuali · test 3 (#123456) esercita il ramo schiarisce, copertura ramo-agnostica solo nominale.
  Da QA/L2 (Task 8): leggibilità targa/bordo inset su nero puro in dark mode (segnalato da implementer).
EMENDAMENTO PIANO Task 6 (da riferire a Francesco al gate): le 3 superfici v2.3 avevano GIÀ una «×» custom (badge 28px, "Cancella ricerca", senza refocus) — il brief non lo prevedeva. Decisione controller: adattare il badge esistente (etichetta «Svuota la ricerca», helper svuotaRicerca condiviso con refocus, hit area ≥44px) invece di sostituirlo — churn minimo, coerenza v2.3.
RICHIESTE NUOVE DI FRANCESCO (22/07 pomeriggio, in chat con screenshot device + 2 foto portacassette reali) — FUORI SCOPE questa ondata, da portare in ROADMAP al BP-1 (ondata «Redesign parete/home»):
  1. Griglia dietro la parete più simile a una griglia metallica VERA (rete a filo con ombre, riferimento foto portacassette reali) invece dell'attuale foglio a quadretti.
  2. Suono per lo spostamento (sollevamento) e il ri-aggancio della cassetta — sede naturale: src/design-system/v3/sound.ts, con panel advisor + approvazione.
  Nota: lo screenshot device conferma il P11c (C11/C10/C4 piatte) — fix già in questa ondata (Task 5).
Task 6: complete (commit 9a7ac93, base 0e6ee65, review clean al primo giro; opzione B applicata: badge v2.3 adattati in place, touch target 44px verificato pixel-exact)
  Minor (per review finale): var(--prs,#D4CFC9)/var(--t2,#4A3D33) rilocati (pre-esistenti, non nuovi) — nota per il merge · closure per render (stile pre-esistente).
Task 7: complete (commit 0f10275, base 9a7ac93, review clean al primo giro; flex cascade verificata anche su forma "due stanze")
  Minor: min-height 100dvh ridondante nella media query mobile (base rule già lo dichiara).
  QA Task 8 DEVE includere: forma "due stanze" a 390×700 (cascade flex da ds-v3.css).
Task 8: in corso — FASE 7 verifiche complete.
FASE 7 (output reali): tsc --noEmit → 0 · vitest run → 2741 passed / 0 failed (19 skipped) · next build → OK (80/80 pagine; nota: serviva copiare .env.local nel worktree, non è un difetto dell'ondata) · check-ds-compliance.sh → OK.
Review finale whole-branch (modello top): 1 Important trovato e FIXATO — BackHeaderModifica.tsx fuori censimento piano, loop scheda↔modifica (commit 118bba7 + test nuovo back-header-modifica.test.tsx 2/2).
  Nota per Francesco al gate: WizardNuovoLavoro.tsx:405 — al passo 1 il ‹ del wizard esce su /dashboard (push) invece della pagina precedente; il piano lo ESCLUDE esplicitamente (naviga fra step). Se va cambiato, è decisione sua per ondata futura.
  Triage Minors review finale: nessuno bloccante; 3 "ship-and-note" (AppHeader smoke test, order:5/titolo a 390px in QA, cursor disabled swatch), resto drop.
Re-review finale: CONFERMATA — Ready to merge YES (pendenti QA/L2 + ratifica Francesco). Fix 118bba7 verificato, test 2/2, nessuna nuova preoccupazione.
FASE 9 QA browser: in corso (dev server worktree porta 3000, seed E2E rieseguito idempotente).
FASE 9 QA (Playwright, lab E2E, server DAL WORKTREE porta 3013 — attenzione: preview_start serviva il checkout principale, verificato e corretto): 56/56 PASS su 390/768/1280 × light/dark.
  Copre: home 390×844 (no taglio, TastoPiu visibile) e 390×700 (scroll di degrado) · parete (× ricerca svuota+refocus, tap libera→sheet, input color controllato, NERA con derivato schiarito verificato inline) · scheda (testata nel viewport, pill a capo <768, una riga ≥768, back→dashboard) · clienti/pazienti/magazzino (× «Svuota la ricerca», svuota+refocus, regola P7 nel CSS servito).
FASE 9b Gate L2: micro-audit visivo su screenshot light+dark: nessun ❌. 20 screenshot committati (chore(qa)).
  Note L2 minori: titolo lavoro E2E non riproduce il caso "n.2026/0002" col "/" (fixture E2E-CAS-002) — da ricontrollare sul device di Francesco.
🛑 STOP: in attesa di ratifica esplicita di Francesco per merge/push. BP-1 dopo il merge.
REVISIONE P11c su richiesta Francesco (pre-merge): «nero ancora poco chiaro».
  Ricerca: su materiali neri la forma la danno riflessi/schiarimenti, non ombre; nero puro mai renderizzato tale; dark elevation = tinta più chiara.
  Diagnosi (verificata nel CSS): oltre al gradiente, su nero spariscono cavità (rgba nero), inset bottom shadow (nera) e linguetta (brightness .85).
  Panel advisor (ux-designer + frontend-ui-builder): convergono su anatomia speculare condizionale `is-nera` (bordo-luce, highlight top rinforzato, cavità con rim chiaro, linguetta brightness 1.5) + floor sul gradiente. Divergenza soglia fissa 0.08 vs rampa → adottata FISSA (classe binaria; rampa = escalation futura).
  2 varianti su parete reale (light+dark) in docs/design/mockups/screenshots/2026-07-22-nero-cassetta/: A «nero fedele» #3A3A3A→#101010 · B «nero rialzato» #4F4F4F→#1C1C1C. In attesa di scelta di Francesco.
P11c rev IMPLEMENTATA: Variante A ratificata da Francesco (la «seconda di ogni trittico») → commit b787f31 (facciaScura + is-nera + floor gradiente, TDD 100/100) + review dedicata Approved al primo giro (1 Minor cosmetico nel report). FASE 7 rifatta: tsc 0 · vitest 2753 passed · build OK. Screenshot reali confermano la resa in light e dark (commit screenshot).
🛑 STOP (secondo giro): in attesa di ratifica merge/push.
