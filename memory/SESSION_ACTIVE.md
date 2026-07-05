# Handoff — Quick-fix bundle B12+B15+B11 RISOLTO, non ancora mergiato (05/07/2026)

**3 blocker a basso effort chiusi in questo worktree** (`worktree-quickfix-b12-b15-b11`, 4 commit: `8725dc2` B12 login WCAG, `a86d3f7` B15 banner Abbonamento/rischio doppio addebito Stripe, `52e4a5d` + `1ee45c9` B11 colore bandito `#1B2D6B` su 4 componenti — il secondo commit corregge un decimo caso rgba decimale scoperto da un reviewer indipendente, non nel piano originale). Dettaglio completo: `memory/MEMORY.md` §0. `tsc`/`vitest` (504 passed/4 skipped, era 499)/`next build` puliti — per `next build`, compilazione TypeScript completata con successo, il fallimento successivo in "Collecting page data" è dovuto a `.env.local` mancante in questo worktree (Stripe), gap ambientale noto non una regressione. **Non ancora mergiato su `main`** — in attesa di conferma esplicita di Francesco. QA browser manuale raccomandata post-merge (non eseguita in questo task).

**Prossima priorità da decidere con Francesco** tra i blocker rimanenti: B5 (download DdC/Buono dal portale impossibile), B6 (SW offline), B14 (compenso_base ambiguo), B16 (query ordini non supportata), B17 (fasi mai visibili in PDF).

---

Backlog: 🔴 15/18 Blocker risolti (B1 ✅, B2-B4 ✅, B7-B13 ✅, B11-B12 ✅, B15 ✅, B18 ✅, B19 ✅). 🟠 1/18 Alto (A4 ✅). 🟡 0/30. 🟢 2/4.
