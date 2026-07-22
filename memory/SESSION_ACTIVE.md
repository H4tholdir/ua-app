# Sessione attiva — 22/07/2026 sera · COLLAUDO DEVICE: triage 13 punti + 4 ratifiche

**Prima parte sessione:** Parete mergiata e deployata (merge `a6d9f50`, CI+CD verdi, prod
verificata, worktree rimosso, BP-1 `d4d8ecf`).

**Seconda parte:** Francesco ha collaudato su Android+iPhone → 13 punti. Triage completo con
verifiche nel codice: `docs/roadmap/2026-07-22-collaudo-device-parete-triage.md` (5 bug · 3
piattaforma iOS · 3 redesign · 2 decisioni). **Ratificato:** swipe home → `/cassette` diretto
(anteprima sparisce) · ricerca «filtra e risali» · «Metti un lavoro» su cassetta libera ·
**direttiva permanente back = pagina precedente** (CLAUDE.md §9). Ordine: flake vitest → ondata
«Collaudo R1 — bug fix» (3,7,9,10,11) → «iOS fluidità» (1,2,8) → «Redesign parete/home»
(4,6,12+5+13). Miniature 38 e D-11 scalano dopo.

**PROSSIMO:** brainstorm + piano ondata «Collaudo R1» (FASE 2-4 BP-2), poi esecuzione in worktree.
