# Handoff — infrastruttura test RPC verificata, ora su B4/useReducedMotion (04/07/2026)

**Infrastruttura test di integrazione RPC** aggiunta e verificata (branch `worktree-rpc-integration-tests`, merge fast-forward `ab2e02c` su `main`, pushato su `origin/main`) — colma il gap che aveva nascosto il bug critico in `salva_fasi_ciclo_atomico()` durante B18. Decisione in `docs/design/decisions/2026-07-04-rpc-integration-tests.md`: client `pg` diretto + transazione sempre annullata (`ROLLBACK` in `finally`), scelta rispetto a Supabase locale via Docker (migration incomplete, richiederebbe prima un lavoro di baseline) e a endpoint live gated (cleanup meno sicuro). Pilota su `salva_fasi_ciclo_atomico()`, 4 scenari, **verificati con successo contro il DB live reale** — Francesco ha fornito la connection string diretta (password mai esposta via browser, bloccata dal classificatore di sicurezza; salvata solo in `.env.local`). Zero residuo confermato dopo i test. Non incluso: job CI dedicato (serve configurare il secret con Francesco), estensione ad altre RPC.

**B18 — hardening trasversale post-B3** risolto su branch `worktree-b18-hardening` (5 commit), mergiato (`06a497d`). Tutti e 8 i finding chiusi. Durante il lavoro scoperto e risolto come hotfix separato (`23e0d15`) il bug critico sopra citato — nessun dato reale perso.

Dettaglio completo: `memory/MEMORY.md` §0, `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` (B18).

**Task di follow-up aperto (non bloccante, segnalato non risolto):** `useReducedMotion()` in `src/design-system/motion.ts` ha la stessa classe di hydration mismatch di `useTheme.ts` risolta in B18 — richiede una decisione esplicita sul trade-off prima del fix (usato in quasi ogni pagina, il "mounted guard" causerebbe un flash di animazione per utenti con la preferenza realmente attiva).

**Prossimo step:** **B4** (`as any` nei generatori PDF MDR, 9 cast in 8 file) oppure il task `useReducedMotion()` sopra — entrambi pronti, nessuna priorità esplicita tra i due al momento.

---

Backlog: 🔴 8/17 Blocker (B1 ✅, B2 ✅, B3 ✅, B7 ✅, B8 ✅ COMPLETO 5/5, B9 ✅, B10 ✅, B18 ✅). 🟠 1/18 Alto (A4 ✅). 🟡 0/30. 🟢 2/4.
