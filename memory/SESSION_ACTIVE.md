# Handoff — B19 Security Advisor hardening completato, ora su B4 (04/07/2026)

**B19 — Supabase Security Advisor hardening RISOLTO e DEPLOYATO** (branch `worktree-security-advisor-hardening`, 8 commit, fast-forward su `main` `2d22b01`, pushato su `origin/main`). Segnalato da Francesco navigando la dashboard Supabase, non era nel backlog. 10 ERROR critici chiusi: RLS deny-all su `audit_log`/`webauthn_challenges`/`sub_processors` (erano esposte via REST con la sola chiave `anon`), `security_invoker` su 7 view. WARN chiusi: REVOKE `anon`/`authenticated` su 8 funzioni `SECURITY DEFINER` (incl. `get_pec_password`), 3 funzioni dead-code eliminate (`set_lab_claim`, `soft_delete_lavoro`, `stats_dashboard`), `search_path` fissato su 33 funzioni. 5 helper RLS (`current_lab_id` ecc.) lasciate intatte apposta. 4 migration live, ognuna confermata da Francesco. Verifica: `get_advisors` 0 ERROR, 445/445 test, QA manuale su E2E (WebAuthn/PEC/audit_log) senza regressioni, review finale "Ready to merge: Yes". Dettaglio: `memory/MEMORY.md` §0, backlog `B19` in `BACKLOG-TECNICO-2026-07-02.md`.

**Aperto — richiede decisione di Francesco:** "Leaked Password Protection" bloccato dal piano Supabase **FREE** (serve upgrade a **Pro**), tentativo fatto via `claude-in-chrome`, salvataggio rifiutato dal dashboard. Nessuna azione tecnica possibile finché non si decide sull'upgrade.

**Task di follow-up ancora aperto (non bloccante):** `useReducedMotion()` in `src/design-system/motion.ts` — stessa classe di hydration mismatch già risolta altrove, serve decisione sul trade-off (flash animazione) prima del fix.

**Prossimo step:** **B4** (`as any` nei generatori PDF MDR, 9 cast in 8 file).

---

Backlog: 🔴 9/18 Blocker (B1-B3 ✅, B7-B10 ✅, B18 ✅, B19 ✅). 🟠 1/18 Alto (A4 ✅). 🟡 0/30. 🟢 2/4.
