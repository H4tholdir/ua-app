# Sessione attiva — 15/07/2026

**Branch:** `feature/nota-credito-td04` (worktree, base 3f0ff99) — Nota di Credito TD04 implementata (Task 1-6, 5b, 8 + fix review finale).
12 commit: migration schema+RPC+trigger (già su prod, additive), XML TD04, credito 'storno' (cap totale), audit letture, write-guards, route due-fasi con resume.
FASE 7 verde: tsc 0, 1727 test pass, build ok. Review finale (fable): core production-grade.

**IN ATTESA DI FRANCESCO:** scelta variante mockup A/B (docs/design/mockups/2026-07-15-nota-credito-td04.html) per il React di Task 7; ratifica amendment Sede [R1-M3]; ratifica trigger fiscale su prod; merge gate.
Follow-up ticketati nel ledger .superpowers/sdd/progress.md (top: percorso invio SdI del TD04 da bundlare con Task 7).
