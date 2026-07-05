# Handoff — B13 mergiato/deployato; priorità decisa: quick-fix B12+B15+B11 (05/07/2026)

**B13 (1/2 + 2/2) è COMPLETO, mergiato su `main` (commit `8f49445`) e deployato** — CI verde, Vercel confermato, `uachelab.com` risponde. Silent-fail webhook Stripe eliminato su tutti e 4 i punti di fallimento (incluso uno emerso dalla review finale, non nell'enumerazione originale del piano). Worktree rimosso. Dettaglio: `memory/MEMORY.md` §0.

**Prossima priorità decisa con Francesco: bundle quick-fix B12 + B15 + B11.** Piano già scritto e committato in worktree isolato dedicato `quickfix-b12-b15-b11` (branch `worktree-quickfix-b12-b15-b11`, path `.claude/worktrees/quickfix-b12-b15-b11/`, commit `9c54809` — solo il piano, nessun codice ancora toccato): `docs/superpowers/plans/2026-07-05-quickfix-b12-b15-b11.md` (4 task: B12 login WCAG — 2 valori esadecimali in `globals.css`; B15 contraddizione Abbonamento/rischio doppio addebito Stripe — estratta in funzione pura testata `src/lib/utils/lab-stato.ts`; B11 colore bandito `#1B2D6B` su 4 componenti; verifica finale + memoria). Nessuna migration, nessun cambio API contract. Baseline test verificato nel worktree: `499 passed | 4 skipped`.

**Prossima azione:** entrare nel worktree esistente (non ricrearlo) ed eseguire il piano con `superpowers:subagent-driven-development`, poi `superpowers:finishing-a-development-branch` per merge/push/deploy, seguendo lo stesso schema usato per B13. Il piano include una nota su QA browser consigliata post-merge (login WCAG, banner Abbonamento, colore su 4 componenti).

Altri blocker aperti nel backlog (dopo questo bundle): B5 (download DdC/Buono dal portale impossibile), B6 (SW offline), B14 (compenso_base ambiguo — richiede decisione di Filippo prima di procedere), B16 (query ordini non supportata), B17 (fasi mai visibili in PDF — ora sbloccato, B3 completato).

---

Backlog: 🔴 12/18 Blocker risolti (B1 ✅, B2-B4 ✅, B7-B10 ✅, B13 ✅, B18 ✅, B19 ✅). B11/B12/B15: piano pronto, esecuzione da fare. 🟠 1/18 Alto (A4 ✅). 🟡 0/30. 🟢 2/4.
