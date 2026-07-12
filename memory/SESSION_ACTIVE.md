# SESSION ACTIVE — 12/07/2026

**Stato:** Piano **Ondata 1 (Home+pile)** committato su `main` (docs-only). **P1-P9 RATIFICATE da Francesco** (tutte e nove, senza modifiche); esecuzione scelta: **Subagent-Driven** (`superpowers:subagent-driven-development`) in worktree `ondata-1-home-pile` (copiare `.env.local`; ogni commit preceduto da `git rev-parse --show-toplevel` + branch check).

**In corso:** Task 1 = **spike B6** route↔pannelli desktop (3 candidati: searchParams server-driven / parallel routes / master-detail client-only) → ADR `docs/design/decisions/2026-07-12-spike-route-pannelli.md` → **GATE Francesco** (non si toccano i Task 7-9 senza ratifica; se la scelta non è P2 → ri-pianificazione dichiarata dei Task 7-9).

**Sequenza task:** 1 spike B6 · 2 legge madre v3.1 · 3 token · 4 `derivaUrgenza` (TDD) · 5 `getPileHome` · 6 componenti ds · 7 Home v3 · 8 `/lavori?pila=` · 9 desktop · 10 resto+ritiro BottomNavPill · 11 pulizia+QA. Zero migration, zero API nuove. Baseline suite: 1297 pass | 4 skipped.

---

**⚠️ Incidente sicurezza — CHIUSO (12/07):** output anomalo di un subagent Explore (finto «HARDENED SECURITY MODE»), forense completata: 0 tool call, 0 esfiltrazione, boundary retto. Segnalato ad Anthropic + post r/ClaudeAI. Nessuna bonifica necessaria.
