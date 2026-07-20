# Sessione attiva — 20/07/2026 (Bundle T + date fiscali + anti-flake)

**Tre consegne deployate oggi:** (1) Bundle T (`bacfde9`) — O1b/O1a/O4a/A18 + anti-SSRF; (2) fix test flaky (`9350969`) — 5 run consecutive + stress 2 suite verdi; (3) **date fiscali Europe/Rome** (`3d5fd31`) — percorso Grande FatturaPA, panel 3×, review Yes, migration `20260720150000` applicata al DB live e registrata. Tutto: CI+CD verdi, smoke prod OK.

**⚠ ANOMALIA:** 7 migration 16-17/07 non registrate nel ledger remoto — MAI `supabase db push` finché non riconciliate (`migration repair`). Sessione dedicata.

**Fuori scope tracciati:** draft dic→gen congelato · serie lavoro/ordine UTC (non fiscali) · guard formato data.

**Prossimo:** Bundle E (A16 export CSV) → mini-triage design (mockup). Worktree date-fiscali-roma rimovibile; bundle-q con report gitignored (chiedere).
