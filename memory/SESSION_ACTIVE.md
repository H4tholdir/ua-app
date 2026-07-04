# Handoff — 2 fix minori risolti e deployati, ora su B4 (05/07/2026)

**2 fix segnalati da Francesco (QA sessioni precedenti) RISOLTI E DEPLOYATI** (merge fast-forward `85faad1` su `main`, pushato, CI verde, `uachelab.com` risponde 307). (1) `PazientiSearchList.tsx` migrato a `ua-list-grid` (era flex-column inline) — scoperto in verifica visiva che anche `ClientiSearchList.tsx` (il riferimento) aveva lo stesso bug (card edge-to-edge, 0px padding), corretto in entrambi con conferma di Francesco. (2) `useReducedMotion()` in `motion.ts` aveva lo stesso hydration mismatch di B18 (`useTheme.ts`) — risolto con lo stesso pattern "mounted guard", trade-off approvato da Francesco. TDD completo, 450/450 test, tsc/build/lint (scope CI) puliti, review "Ready to merge: Yes", QA browser reale 390/768/1280px light+dark. Dettaglio: `memory/MEMORY.md` §0.

**Verificato in questa sessione — bug z-index bottom-sheet vs BottomNavPill (segnalato da Francesco) è GIÀ RISOLTO nel codice attuale:** `RetiNuovaSheet.tsx`/`ListinoNuovoSheet.tsx` hanno già `zIndex: 200/201` (era stato corretto durante B8 4/5 e con l'hotfix `fix-listino-zindex` del 03/07). Nessuna azione necessaria, il messaggio ricevuto descriveva uno stato di codice precedente a quei fix.

**Corretto — infrastruttura test RPC locale NON è mancante:** era già stata costruita la sessione precedente (`worktree-rpc-integration-tests`, merge `ab2e02c`, pilot su `salva_fasi_ciclo_atomico()`). Resta aperta solo l'estensione alle altre RPC `SECURITY DEFINER` (`crea_rifacimento_atomico`, `accept_invito_rete_atomic`, `accept_invite_atomic`).

**Prossimo step:** **B4** (`as any` nei generatori PDF MDR, 9 cast in 8 file) — nessuna priorità stabilita rispetto all'estensione test RPC, da concordare con Francesco a inizio prossima sessione.

---

Backlog: 🔴 9/18 Blocker (B1-B3 ✅, B7-B10 ✅, B18 ✅, B19 ✅). 🟠 1/18 Alto (A4 ✅). 🟡 0/30. 🟢 2/4.
