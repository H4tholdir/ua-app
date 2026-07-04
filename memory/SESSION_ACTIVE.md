# Handoff — CI/deploy verdi dopo incidente, ora su B4/useReducedMotion (04/07/2026)

**⚠️ Incidente CI risolto (commit `653c48d`):** dal merge di B18 (`06a497d`, ~17:41) fino alle ~19:20, ogni push ha avuto CI rossa (regola ESLint `react-hooks/set-state-in-effect` sul pattern "mounted guard" del fix hydration) — il deploy Vercel si è correttamente auto-abortito ad ogni tentativo (nessun codice non verificato in produzione), ma questo significa che **B18 e l'infrastruttura test RPC sono rimasti mergiati senza essere realmente deployati per ~1h40**, nonostante le note precedenti dicessero "deployato". Causa radice: verificato solo tsc/vitest/build dopo i push, mai `npm run lint` (gate CI obbligatorio). Fix: `eslint-disable-next-line` con giustificazione su `useTheme.ts`/`BottomNavPill.tsx` (stesso pattern già in uso in `InvitaCollaboratoreSheet.tsx`). **Verificato ora:** CI verde, deploy Vercel completato, `uachelab.com` risponde. Dettaglio completo in `memory/MEMORY.md` §0.

**Infrastruttura test di integrazione RPC** (branch `worktree-rpc-integration-tests`, merge `ab2e02c`) — colma il gap che aveva nascosto il bug critico in `salva_fasi_ciclo_atomico()` durante B18. Client `pg` diretto + transazione sempre annullata, pilota su `salva_fasi_ciclo_atomico()` (4 scenari) verificato con successo contro il DB live reale. Decisione in `docs/design/decisions/2026-07-04-rpc-integration-tests.md`. Non incluso: job CI dedicato, estensione ad altre RPC.

**B18 — hardening trasversale post-B3** (branch `worktree-b18-hardening`, merge `06a497d`) — tutti e 8 i finding chiusi. Durante il lavoro scoperto e risolto come hotfix separato (`23e0d15`) il bug critico sopra citato — nessun dato reale perso.

**Task di follow-up aperto (non bloccante):** `useReducedMotion()` in `src/design-system/motion.ts` ha la stessa classe di hydration mismatch di `useTheme.ts` — richiede una decisione esplicita sul trade-off prima del fix (usato in quasi ogni pagina, il "mounted guard" causerebbe un flash di animazione per utenti con la preferenza realmente attiva).

**Prossimo step:** **B4** (`as any` nei generatori PDF MDR, 9 cast in 8 file) oppure il task `useReducedMotion()` sopra — nessuna priorità esplicita tra i due al momento.

---

Backlog: 🔴 8/17 Blocker (B1 ✅, B2 ✅, B3 ✅, B7 ✅, B8 ✅ COMPLETO 5/5, B9 ✅, B10 ✅, B18 ✅). 🟠 1/18 Alto (A4 ✅). 🟡 0/30. 🟢 2/4.
