# Handoff — B17 completo: mergiato, deployato, QA verificata (05/07/2026)

**B17 (Scheda di Fabbricazione) COMPLETO in ogni sua parte.** Merge `main` ← `worktree-b17-scheda-fabbricazione` (commit `ef75eb1`), pushato su `origin/main`, CI verde, deploy Vercel confermato, `uachelab.com` risponde. Worktree e branch rimossi.

Nuovo documento PDF interno on-demand per tracciabilità fasi di lavorazione, corretta l'attribuzione normativa errata del backlog originale (non Allegato XIII, ma QMS Art. 10(9) MDR). Dettaglio completo: `memory/MEMORY.md` (voce in testa) e `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` (sezione B17).

**Verifica pre-merge:** `tsc`/`vitest` (526 passed/4 skipped)/`next build` puliti. Rischio critico segnalato da un secondo reviewer (query nested `tecnico:tecnici` dentro `lavori_fasi`, mai usata altrove) chiuso con FK reale su DB live + generatore reale contro dati E2E. **Verifica post-merge:** stessa suite rieseguita su `main` con successo.

**QA browser ESEGUITA** (dev server locale + `preview_*`, lab E2E isolato, mai il lab Filippo): link "Scarica Scheda di Fabbricazione" visibile su lavoro con fasi, click reale → `GET .../scheda-fabbricazione 200` confermato nei log server; link correttamente assente (verificato via DOM, non solo visivo) su lavoro senza fasi. Dati di test rimossi, 0 residui.

**Anche aperto, non toccato:** B20 (PSUR/PMS Report non differenziato per classe di rischio) — backlog item indipendente, da pianificare a parte.

**Prossima priorità da decidere con Francesco** tra i blocker rimanenti: B5 (download DdC/Buono dal portale impossibile), B6 (SW offline), B14 (compenso_base ambiguo — richiede decisione di Filippo), B16 (query ordini non supportata), B20.

---

Backlog: 🔴 15/18 Blocker risolti (B1 ✅, B2-B4 ✅, B7-B10 ✅ [B8 4/5], B11-B13 ✅, B15 ✅, B17 ✅, B18 ✅, B19 ✅). B20: nuovo, non pianificato. 🟠 1/18 Alto (A4 ✅). 🟡 0/30. 🟢 2/4.
