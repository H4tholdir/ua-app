# Handoff — B18 RISOLTO e deployato, ora su B4 (04/07/2026)

**B18 — hardening trasversale post-B3** risolto su branch `worktree-b18-hardening` (5 commit), **mergiato fast-forward su `main` (`06a497d`) e pushato su `origin/main`**. Tutti e 8 i finding chiusi: escape PostgREST `.or()` su 4 route, indice UNIQUE parziale su `fasi_produzione` (migration live), dedup key React libreria fasi, 2 `var()` senza fallback, mock test rafforzati (+ copertura nuova su `GET /api/clienti`/`listino`), race condition per-fase in `handleUpdateFase`, 2 hydration mismatch reali (`ThemeToggleButton`/`BottomNavPill`, pattern "mounted guard"). 445/445 test, tsc/build puliti. Review finale whole-branch: "Ready to merge: Yes". QA browser reale (lab E2E) confermata via snapshot di accessibilità.

**Durante il lavoro, scoperto e già risolto come hotfix separato PRIMA di B18** (branch `hotfix-salva-fasi-ciclo-atomico`, merge `23e0d15` su `main`): bug critico in `salva_fasi_ciclo_atomico()` che soft-deletava ogni fase appena inserita nella stessa chiamata — nessun dato reale perso (mai esercitata su dati reali dal deploy di B3), verificato con transazioni `BEGIN/ROLLBACK` sul DB live prima e dopo il fix.

Dettaglio completo: `memory/MEMORY.md` §0, `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` (B18).

**Task di follow-up aperti (non bloccanti, segnalati non risolti):** `useReducedMotion()` in `src/design-system/motion.ts` ha la stessa classe di hydration mismatch — richiede una decisione esplicita sul trade-off prima del fix (usato in quasi ogni pagina). Assenza di infrastruttura Supabase locale per test di integrazione reali sulle RPC (ha permesso al bug critico di restare nascosto).

**Prossimo step:** **B4** (`as any` nei generatori PDF MDR, 9 cast in 8 file).

---

Backlog: 🔴 8/17 Blocker (B1 ✅, B2 ✅, B3 ✅, B7 ✅, B8 ✅ COMPLETO 5/5, B9 ✅, B10 ✅, B18 ✅). 🟠 1/18 Alto (A4 ✅). 🟡 0/30. 🟢 2/4.
