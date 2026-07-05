# Handoff — B17 mergiato e deployato (05/07/2026)

**B17 (Scheda di Fabbricazione) RISOLTO, MERGIATO E DEPLOYATO.** Merge `main` ← `worktree-b17-scheda-fabbricazione` (commit `ef75eb1`, conflitto minore su `memory/SESSION_ACTIVE.md` risolto prendendo la versione del branch), pushato su `origin/main`, CI verde (TypeScript+ESLint+Unit Tests + Next.js Build, run `28752905325`), deploy Vercel confermato (CD run `28752994273`, "Deploy to Production" ✓), `uachelab.com` risponde (307 → `/login`, atteso). Worktree e branch rimossi.

Nuovo documento PDF interno on-demand per tracciabilità fasi di lavorazione, corretta l'attribuzione normativa errata del backlog originale (non Allegato XIII, ma QMS Art. 10(9) MDR). Dettaglio completo: `memory/MEMORY.md` (voce in testa) e `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` (sezione B17).

**Verifica pre-merge:** `tsc --noEmit` pulito, `vitest run` 526 passed/4 skipped (era 504), `next build` pulita. Rischio critico segnalato da un secondo reviewer (query nested `tecnico:tecnici(nome, cognome)` dentro `lavori_fasi`, mai usata altrove) verificato con FK reale su DB live + generatore eseguito contro dati E2E reali (non mockati) — risolve correttamente. Dati di test rimossi, 0 residui. **Verifica post-merge (su `main`):** `tsc`/`vitest` (526 passed/4 skipped)/`next build` rieseguiti con successo, route `/api/lavori/[id]/scheda-fabbricazione` presente nel manifest.

**QA browser del link di download in UI (click reale sulla pagina lavoro) ancora da fare** — raccomandata come prossimo step, non bloccante (il generatore è già verificato contro dati live end-to-end).

**Anche aperto, non toccato:** B20 (PSUR/PMS Report non differenziato per classe di rischio) — backlog item indipendente, da pianificare a parte.

**Altri blocker aperti nel backlog** (dopo B17): B5, B6, B14 (richiede decisione di Filippo), B16, B20.

---

Backlog: 🔴 15/18 Blocker risolti (B1 ✅, B2-B4 ✅, B7-B10 ✅ [B8 4/5], B11-B13 ✅, B15 ✅, B17 ✅, B18 ✅, B19 ✅). B20: nuovo, non pianificato. 🟠 1/18 Alto (A4 ✅). 🟡 0/30. 🟢 2/4.
