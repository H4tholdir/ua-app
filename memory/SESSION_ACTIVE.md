# Handoff — B17 risolto, in attesa di merge (05/07/2026)

**B17 (Scheda di Fabbricazione) RISOLTO in questo lavoro** — worktree `.claude/worktrees/b17-scheda-fabbricazione` (branch `worktree-b17-scheda-fabbricazione`), 5 commit tecnici (`41f435e`..`92702d9`). Nuovo documento PDF interno on-demand per tracciabilità fasi di lavorazione, corretta l'attribuzione normativa errata del backlog originale (non Allegato XIII, ma QMS Art. 10(9) MDR). Dettaglio completo: `memory/MEMORY.md` (voce in testa) e `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` (sezione B17).

**Verifica eseguita:** `tsc --noEmit` pulito, `vitest run` 526 passed/4 skipped (era 504), `next build` compilazione TypeScript pulita (fallimento "Collecting page data" su `/api/admin/labs` = gap ambientale `.env.local` noto, non regressione).

**Non ancora fatto:** merge su `main`, push, deploy, QA browser post-merge (scaricare Scheda per lavoro E2E con fasi miste OK/non conforme/in attesa — vedi nota finale del piano). **In attesa di conferma esplicita di Francesco prima di procedere con `superpowers:finishing-a-development-branch`.**

**Anche aperto, non toccato:** B20 (PSUR/PMS Report non differenziato per classe di rischio) — backlog item indipendente, da pianificare a parte.

**Altri blocker aperti nel backlog** (dopo B17): B5, B6, B14 (richiede decisione di Filippo), B16, B20.

---

Backlog: 🔴 15/18 Blocker risolti (B1 ✅, B2-B4 ✅, B7-B10 ✅ [B8 4/5], B11-B13 ✅, B15 ✅, B17 ✅, B18 ✅, B19 ✅). B20: nuovo, non pianificato. 🟠 1/18 Alto (A4 ✅). 🟡 0/30. 🟢 2/4.
